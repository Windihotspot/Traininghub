// GET|POST /functions/v1/payments-verify?reference=PAY-XXXX
// Called by the callback page after the provider redirect. Status only ever changes
// after the provider's own API confirms it - the redirect itself is never trusted.
import { serveFn, HttpError } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { getProvider } from '../_shared/payments/index.ts'
import { notifyPaymentSuccess } from '../_shared/notifications.ts'

serveFn(async (req) => {
  const url = new URL(req.url)
  let reference = url.searchParams.get('reference')
  if (!reference && req.method === 'POST') reference = (await req.json().catch(() => ({}))).reference
  if (!reference) throw new HttpError(400, 'reference is required')

  const admin = getAdminClient()
  const { data: pay } = await admin.from('payments')
    .select('id, reference, provider, amount, currency, status, registration_id, registrations(reference, status)')
    .eq('reference', reference).maybeSingle()
  if (!pay) throw new HttpError(404, 'Payment not found')

  let status = pay.status as string
  if (status !== 'paid') {
    const result = await getProvider(pay.provider).verifyPayment(reference)
    await admin.from('payment_transactions').insert({ payment_id: pay.id, event_type: 'verify', status: result.status, payload: result.raw ?? null })

    if (result.status === 'paid') {
      if (result.amount !== undefined && Math.abs(result.amount - Number(pay.amount)) > 0.01) {
        throw new HttpError(409, 'Amount mismatch - payment flagged for review')
      }
      const { data } = await admin.rpc('mark_payment_paid', {
        p_reference: reference, p_txn_id: result.providerTransactionId ?? null, p_raw: result.raw ?? null })
      if (data?.changed) await notifyPaymentSuccess(pay.registration_id)
      status = 'paid'
    } else if (result.status === 'failed' || result.status === 'cancelled') {
      await admin.rpc('mark_payment_failed', {
        p_reference: reference, p_status: result.status, p_raw: result.raw ?? null })
      status = result.status
    }
  }

  // Grant course access. Idempotent, so it also repairs the case where the webhook marked
  // the payment paid first but enrolment failed. A failure here must not break the callback page.
  if (status === 'paid') {
    const { error } = await admin.rpc('grant_enrollments', { p_registration: pay.registration_id })
    if (error) console.error('[payments-verify] grant_enrollments failed', { reference, message: error.message })
  }

  return jsonResponse({
    payment: { reference, status },
    registration: { reference: (pay as any).registrations?.reference },
  }, 200, req)
})