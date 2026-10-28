// GET|POST /functions/v1/payments-verify?reference=PAY-XXXX[&quidly_ref=...]
// Called by the confirmation page after the widget closes/succeeds. `quidly_ref` comes from the widget callback.
// Status only changes after Quidly's own API confirms it; the client-side callback is never trusted.
import { serveFn, HttpError } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { getProvider } from '../_shared/payments/index.ts'
import { notifyPaymentSuccess } from '../_shared/notifications.ts'

const clean = (v: unknown, max = 100) =>
  String(v ?? '')
    .trim()
    .slice(0, max)

serveFn(async (req) => {
  const url = new URL(req.url)
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const reference = clean(url.searchParams.get('reference') ?? body.reference)
  const clientRef = clean(url.searchParams.get('quidly_ref') ?? body.quidly_ref)
  if (!reference) throw new HttpError(400, 'reference is required')

  const admin = getAdminClient()
  const { data: pay } = await admin
    .from('payments')
    .select(
      'id, reference, provider, amount, currency, status, provider_transaction_id, registration_id, registrations(reference, status)'
    )
    .eq('reference', reference)
    .maybeSingle()
  if (!pay) throw new HttpError(404, 'Payment not found')

  let status = pay.status as string
  if (status !== 'paid') {
    // the widget's ref if we got one, else one saved earlier; without either, the webhook will settle it
    const providerRef = clientRef || pay.provider_transaction_id
    if (providerRef) {
      const result = await getProvider(pay.provider).verifyPayment(providerRef)
      console.log('[payments-verify] Provider verification result', {
        paymentReference: pay.reference,
        provider: pay.provider,
        providerReference: providerRef,
        providerStatus: result.status,
        returnedReference: result.reference,
        amount: result.amount,
        currency: result.currency,
        referenceMatches: result.reference === pay.reference
      })

      // bind: the provider payment must belong to THIS payment, or anyone could submit another payment's quidly_ref
      if (result.reference !== pay.reference) {
        console.error('[payments-verify] reference mismatch', {
          reference,
          verified: result.reference,
          providerRef
        })
        throw new HttpError(409, 'This payment does not match the registration')
      }
      await admin
        .from('payment_transactions')
        .insert({
          payment_id: pay.id,
          event_type: 'verify',
          status: result.status,
          payload: result.raw ?? null
        })

      if (result.status === 'paid') {
        const badAmount =
          result.amount !== undefined && Math.abs(result.amount - Number(pay.amount)) > 0.01
        const badCurrency =
          !!result.currency && result.currency.toUpperCase() !== String(pay.currency).toUpperCase()
        if (badAmount || badCurrency)
          throw new HttpError(409, 'Amount mismatch - payment flagged for review')
        const { data } = await admin.rpc('mark_payment_paid', {
          p_reference: reference,
          p_txn_id: providerRef,
          p_raw: result.raw ?? null
        })
        if (data?.changed) await notifyPaymentSuccess(pay.registration_id)
        status = 'paid'
      } else if (result.status === 'failed' || result.status === 'cancelled') {
        await admin.rpc('mark_payment_failed', {
          p_reference: reference,
          p_status: result.status,
          p_raw: result.raw ?? null
        })
        status = result.status
      } else {
        // still pending (e.g. bank transfer): remember the provider ref so a later verify/webhook can settle it
        await admin
          .from('payments')
          .update({ provider_transaction_id: providerRef, status: 'processing' })
          .eq('id', pay.id)
          .in('status', ['pending', 'processing'])
        status = 'processing'
      }
    }
  }

  // Grant course access. Idempotent, so it also repairs the case where the webhook marked
  // the payment paid first but enrolment failed. A failure here must not break the callback page.
  if (status === 'paid') {
    const { error } = await admin.rpc('grant_enrollments', { p_registration: pay.registration_id })
    if (error)
      console.error('[payments-verify] grant_enrollments failed', {
        reference,
        message: error.message
      })
  }

  return jsonResponse(
    {
      payment: { reference, status },
      registration: { reference: (pay as any).registrations?.reference }
    },
    200,
    req
  )
})
