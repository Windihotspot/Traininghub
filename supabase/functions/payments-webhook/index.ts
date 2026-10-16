// POST /functions/v1/payments-webhook   (called by the payment provider; no user JWT)
// 1) verify signature  2) re-verify with provider API  3) check amount  4) idempotent update
import { HttpError } from '../_shared/handler.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { getProvider } from '../_shared/payments/index.ts'
import { notifyPaymentSuccess, notifyPaymentFailed } from '../_shared/notifications.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const raw = await req.text()
    const provider = getProvider() // for multiple providers use /payments-webhook?provider=xxx
    const provName = new URL(req.url).searchParams.get('provider')
    const p = provName ? getProvider(provName) : provider

    if (!(await p.verifyWebhookSignature(raw, req.headers.get(p.signatureHeader)))) {
      return json({ error: 'Invalid signature' }, 401)
    }

    const { reference, event } = p.parseWebhook(raw)
    const admin = getAdminClient()
    const { data: pay } = await admin.from('payments')
      .select('id, amount, status, registration_id').eq('reference', reference).maybeSingle()
    if (!pay) return json({ received: true, note: 'unknown reference' }) // 200 so provider stops retrying

    await admin.from('payment_transactions').insert({
      payment_id: pay.id, event_type: `webhook:${event ?? 'unknown'}`, payload: JSON.parse(raw) })

    if (pay.status === 'paid') return json({ received: true, note: 'already processed' })

    // never trust the webhook body alone: ask the provider
    const result = await p.verifyPayment(reference)

    if (result.status === 'paid') {
      if (result.amount !== undefined && Math.abs(result.amount - Number(pay.amount)) > 0.01) {
        console.error('Webhook amount mismatch', { reference, expected: pay.amount, got: result.amount })
        return json({ received: true, note: 'amount mismatch' })
      }
      const { data } = await admin.rpc('mark_payment_paid', {
        p_reference: reference, p_txn_id: result.providerTransactionId ?? null, p_raw: result.raw ?? null })
      if (data?.changed) await notifyPaymentSuccess(pay.registration_id)
    } else if (result.status === 'failed' || result.status === 'cancelled') {
      const { data: changed } = await admin.rpc('mark_payment_failed', {
        p_reference: reference, p_status: result.status, p_raw: result.raw ?? null })
      if (changed) await notifyPaymentFailed(pay.registration_id)
    }
    return json({ received: true })
  } catch (e) {
    console.error('webhook error', e)
    return json({ error: e instanceof HttpError ? e.message : 'Webhook processing failed' }, 500) // provider will retry
  }
})
