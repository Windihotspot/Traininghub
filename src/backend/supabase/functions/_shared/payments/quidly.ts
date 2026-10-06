// _shared/payments/quidly.ts
// !! The endpoint paths, payload/response field names, status values and signature scheme
// !! below are ASSUMPTIONS. Adjust them to Quidly's real API - nothing else in the system changes.
// Env: QUIDLY_BASE_URL, QUIDLY_SECRET_KEY, QUIDLY_WEBHOOK_SECRET
import type { PaymentProvider, VerifyResult, ProviderStatus } from './types.ts'

const base = () => (Deno.env.get('QUIDLY_BASE_URL') ?? '').replace(/\/$/, '')
const headers = () => ({
  Authorization: `Bearer ${Deno.env.get('QUIDLY_SECRET_KEY')}`,
  'Content-Type': 'application/json',
})

const mapStatus = (s: string | undefined): ProviderStatus => {
  switch ((s ?? '').toLowerCase()) {
    case 'success': case 'successful': case 'paid': case 'completed': return 'paid'
    case 'failed': case 'declined': case 'error': return 'failed'
    case 'cancelled': case 'canceled': case 'abandoned': return 'cancelled'
    default: return 'pending'
  }
}

async function hmacHex(secret: string, data: string, algo = 'SHA-512') {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: algo }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const quidlyProvider: PaymentProvider = {
  name: 'quidly',
  signatureHeader: 'x-quidly-signature',

  async initializePayment(i) {
    const res = await fetch(`${base()}/payments/initialize`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        reference: i.reference, amount: i.amount, currency: i.currency,
        customer: { email: i.email, name: i.name }, callback_url: i.callbackUrl, metadata: i.metadata,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Quidly initialize failed (${res.status}): ${JSON.stringify(json)}`)
    const d = json.data ?? json
    const checkoutUrl = d.checkout_url ?? d.authorization_url ?? d.payment_url
    if (!checkoutUrl) throw new Error('Quidly did not return a checkout URL')
    return { checkoutUrl, providerTransactionId: d.transaction_id ?? d.id, raw: json }
  },

  async verifyPayment(reference): Promise<VerifyResult> {
    const res = await fetch(`${base()}/payments/verify/${encodeURIComponent(reference)}`, { headers: headers() })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Quidly verify failed (${res.status})`)
    const d = json.data ?? json
    return {
      status: mapStatus(d.status), reference, amount: d.amount != null ? Number(d.amount) : undefined,
      currency: d.currency, providerTransactionId: d.transaction_id ?? d.id, raw: json,
    }
  },

  async verifyWebhookSignature(rawBody, signature) {
    const secret = Deno.env.get('QUIDLY_WEBHOOK_SECRET')
    if (!secret || !signature) return false
    return safeEqual(await hmacHex(secret, rawBody), signature.toLowerCase())
  },

  parseWebhook(rawBody) {
    const j = JSON.parse(rawBody)
    const d = j.data ?? j
    const reference = d.reference ?? d.merchant_reference
    if (!reference) throw new Error('No reference in webhook')
    return { reference, event: j.event ?? j.type }
  },
}
