// POST /functions/v1/payments-webhook   (called by Quidly Pay; no user JWT)
// 1) verify signature  2) re-verify with the provider API BY ITS REFERENCE (quidly_ref)
// 3) resolve our payment from the reference the provider echoes  4) check amount  5) idempotent update
import { HttpError } from '../_shared/handler.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { getProvider } from '../_shared/payments/index.ts'
import { notifyPaymentSuccess, notifyPaymentFailed } from '../_shared/notifications.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const COLS = 'id, reference, amount, currency, status, registration_id'

// payments-initialize rotates payments.reference on retry; every issued reference is logged
// in payment_transactions so a late webhook for an older attempt still finds its payment.
async function findPayment(admin: ReturnType<typeof getAdminClient>, ref: string) {
  const { data } = await admin.from('payments').select(COLS).eq('reference', ref).maybeSingle()
  if (data) return data
  const { data: log } = await admin.from('payment_transactions').select('payment_id')
    .in('event_type', ['initialize', 'initialize_retry']).eq('payload->>reference', ref).limit(1).maybeSingle()
  if (!log?.payment_id) return null
  const { data: pay } = await admin.from('payments').select(COLS).eq('id', log.payment_id).maybeSingle()
  return pay
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const raw = await req.text()
    const p = getProvider(new URL(req.url).searchParams.get('provider') ?? undefined)

    if (!(await p.verifyWebhookSignature(raw, req.headers.get(p.signatureHeader)))) {
      return json({ error: 'Invalid signature' }, 401)
    }

    const { reference: hinted, providerRef, event } = p.parseWebhook(raw)
    if (!providerRef) return json({ received: true, note: 'no provider reference' }) // 200 so provider stops retrying

    // never trust the webhook body alone: ask the provider
    const result = await p.verifyPayment(providerRef)
    const reference = result.reference ?? hinted
    if (!reference) return json({ received: true, note: 'no merchant reference' })
    if (hinted && result.reference && hinted !== result.reference) {
      console.error('Webhook reference mismatch', { hinted, verified: result.reference, providerRef })
    }

    const admin = getAdminClient()
    const pay = await findPayment(admin, reference)
    if (!pay) return json({ received: true, note: 'unknown reference' })

    await admin.from('payment_transactions').insert({
      payment_id: pay.id, event_type: `webhook:${event ?? 'unknown'}`, status: result.status, payload: JSON.parse(raw) })

    if (pay.status === 'paid') return json({ received: true, note: 'already processed' })

    if (result.status === 'paid') {
      const badAmount = result.amount !== undefined && Math.abs(result.amount - Number(pay.amount)) > 0.01
      const badCurrency = !!result.currency && result.currency.toUpperCase() !== String(pay.currency).toUpperCase()
      if (badAmount || badCurrency) {
        console.error('Webhook amount mismatch', { reference, expected: pay.amount, got: result.amount, currency: result.currency })
        return json({ received: true, note: 'amount mismatch' })
      }
      const { data } = await admin.rpc('mark_payment_paid', {
        p_reference: pay.reference, p_txn_id: result.providerTransactionId ?? providerRef, p_raw: result.raw ?? null })
      if (data?.changed) await notifyPaymentSuccess(pay.registration_id)
    } else if ((result.status === 'failed' || result.status === 'cancelled') && reference === pay.reference) {
      // only the CURRENT attempt may fail the payment; an older attempt expiring must not undo a retry in progress
      const { data: changed } = await admin.rpc('mark_payment_failed', {
        p_reference: pay.reference, p_status: result.status, p_raw: result.raw ?? null })
      if (changed) await notifyPaymentFailed(pay.registration_id)
    }
    return json({ received: true })
  } catch (e) {
    console.error('webhook error', e)
    return json({ error: e instanceof HttpError ? e.message : 'Webhook processing failed' }, 500) // provider will retry
  }
})