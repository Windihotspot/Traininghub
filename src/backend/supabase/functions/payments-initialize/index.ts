// POST /functions/v1/payments-initialize
// Retry / resume payment for an unpaid registration.
// body: { registration_reference, contact_email }
import { serveFn, readJson, HttpError, isEmail } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { getProvider } from '../_shared/payments/index.ts'

serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const { registration_reference, contact_email } = await readJson<any>(req)
  if (!registration_reference || !isEmail(contact_email)) throw new HttpError(400, 'registration_reference and contact_email are required')

  const admin = getAdminClient()
  const { data: reg } = await admin.from('registrations')
    .select('id, reference, status, contact_name, contact_email, total_amount, currency, training_id')
    .eq('reference', registration_reference).maybeSingle()
  // same error for "not found" and "wrong email" -> no enumeration
  if (!reg || String(reg.contact_email).toLowerCase() !== contact_email.trim().toLowerCase()) {
    throw new HttpError(404, 'Registration not found')
  }
  if (reg.status === 'confirmed') throw new HttpError(409, 'Registration is already paid')

  const { data: pay } = await admin.from('payments').select('*')
    .eq('registration_id', reg.id).neq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!pay) throw new HttpError(404, 'No payable payment found')

  if (reg.status === 'cancelled') {
    const { data: t } = await admin.from('trainings').select('status').eq('id', reg.training_id).single()
    if (t?.status !== 'registration_open') throw new HttpError(409, 'Registration is closed')
    await admin.from('registrations').update({ status: 'pending' }).eq('id', reg.id)
  }

  // provider references must be unique per attempt
  const newRef = 'PAY-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
  const provider = getProvider(pay.provider)
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
  const init = await provider.initializePayment({
    reference: newRef, amount: Number(pay.amount), currency: pay.currency, email: reg.contact_email as string, name: reg.contact_name,
    callbackUrl: `${appUrl}/registration/confirmation?reference=${encodeURIComponent(newRef)}`,
    metadata: { registration_reference: reg.reference },
  })
  await admin.from('payments').update({
    reference: newRef, status: 'processing', checkout_url: init.checkoutUrl,
    provider_transaction_id: init.providerTransactionId ?? null, raw_response: init.raw ?? null,
  }).eq('id', pay.id)
  await admin.from('payment_transactions').insert({ payment_id: pay.id, event_type: 'initialize_retry', status: 'processing', payload: init.raw ?? null })

  return jsonResponse({ payment: { reference: newRef, checkout_url: init.checkoutUrl } }, 200, req)
})
