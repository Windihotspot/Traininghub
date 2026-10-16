// POST /functions/v1/registrations-create   (public; JWT optional)
// body: { training_id, registration_type: 'individual'|'corporate', company_name?,
//         contact: {name,email,phone?}, participants: [{first_name,last_name,email,phone?,job_title?}] }
import { serveFn, readJson, HttpError, mapDbError, isEmail, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { getAdminClient, getAuthenticatedUser } from '../_shared/supabaseAdmin.ts'
import { getProvider } from '../_shared/payments/index.ts'
import { sendEmail, templates, money } from '../_shared/email.ts'
import { notifyPaymentSuccess } from '../_shared/notifications.ts'
import { logAudit } from '../_shared/audit.ts'

const MAX_PARTICIPANTS = 50
const clean = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max)

serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const body = await readJson<any>(req)

  if (!isUuid(body.training_id)) throw new HttpError(400, 'training_id is required')
  const type = body.registration_type === 'corporate' ? 'corporate' : 'individual'
  const contact = body.contact ?? {}
  if (!clean(contact.name) || !isEmail(contact.email)) throw new HttpError(400, 'Valid contact name and email are required')

  const list = Array.isArray(body.participants) ? body.participants : []
  if (list.length < 1 || list.length > MAX_PARTICIPANTS) {
    throw new HttpError(400, `Between 1 and ${MAX_PARTICIPANTS} participants are required`)
  }
  const participants = list.map((p: any, i: number) => {
    if (!clean(p.first_name) || !clean(p.last_name) || !isEmail(p.email)) {
      throw new HttpError(400, `Participant ${i + 1}: first name, last name and valid email are required`)
    }
    return {
      first_name: clean(p.first_name), last_name: clean(p.last_name), email: clean(p.email).toLowerCase(),
      phone: clean(p.phone, 30) || null, job_title: clean(p.job_title) || null,
    }
  })
  const emails = participants.map((p: any) => p.email)
  if (new Set(emails).size !== emails.length) throw new HttpError(400, 'Duplicate participant emails')

  const user = await getAuthenticatedUser(req) // optional
  const admin = getAdminClient()

  const { data: reg, error } = await admin.rpc('create_registration', {
    p_training_id: body.training_id,
    p_type: type,
    p_company_name: clean(body.company_name) || null,
    p_contact_name: clean(contact.name),
    p_contact_email: clean(contact.email).toLowerCase(),
    p_contact_phone: clean(contact.phone, 30) || null,
    p_participants: participants,
    p_user_id: user?.id ?? null,
    p_provider: getProvider().name,
  })
  if (error) throw mapDbError(error)

  const { data: training } = await admin.from('trainings').select('title').eq('id', reg.training_id).single()
  const title = training?.title ?? 'your training'
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
  let checkoutUrl: string | null = null
  let paid = false

  if (Number(reg.total_amount) === 0) {
    // free training: confirm immediately
    const { data } = await admin.rpc('mark_payment_paid', { p_reference: reg.payment_reference, p_txn_id: null, p_raw: { free: true } })
    paid = true
    if (data?.changed) await notifyPaymentSuccess(reg.registration_id)
  } else {
    try {
      const provider = getProvider()
      const init = await provider.initializePayment({
        reference: reg.payment_reference, amount: Number(reg.total_amount), currency: reg.currency,
        email: clean(contact.email).toLowerCase(), name: clean(contact.name),
        callbackUrl: `${appUrl}/registration/confirmation?reference=${encodeURIComponent(reg.payment_reference)}`,
        metadata: { registration_reference: reg.registration_reference, training_id: reg.training_id },
      })
      checkoutUrl = init.checkoutUrl
      await admin.from('payments').update({
        checkout_url: init.checkoutUrl, provider_transaction_id: init.providerTransactionId ?? null,
        raw_response: init.raw ?? null, status: 'processing',
      }).eq('reference', reg.payment_reference)
      await admin.from('payment_transactions').insert({
        payment_id: reg.payment_id, event_type: 'initialize', status: 'processing', payload: init.raw ?? null })
    } catch (e) {
      // registration exists; user can retry via payments-initialize
      console.error('payment init failed', e)
    }
    const mail = templates.registrationCreated({
      name: clean(contact.name), training: title, reference: reg.registration_reference,
      total: money(reg.total_amount, reg.currency), payUrl: checkoutUrl })
    await sendEmail({ to: clean(contact.email).toLowerCase(), ...mail })
  }

  await logAudit({ organisation_id: reg.organisation_id, actor_id: user?.id ?? null, actor_email: user?.email ?? clean(contact.email),
    action: 'REGISTRATION_CREATED', resource_type: 'registration', resource_id: reg.registration_id,
    metadata: { reference: reg.registration_reference, participants: reg.participant_count } }, req)

  return jsonResponse({
    registration: {
      id: reg.registration_id, reference: reg.registration_reference, participant_count: reg.participant_count,
      subtotal: reg.subtotal, discount_amount: reg.discount_amount, total_amount: reg.total_amount, currency: reg.currency,
    },
    payment: { reference: reg.payment_reference, checkout_url: checkoutUrl, paid },
  }, 201, req)
})
