// Loads the Quidly Pay widget, opens it, and turns its result into a server-verified payment status.
// The widget callback is only a hint: payments-verify confirms it with Quidly before anything is marked paid.
const SCRIPT_URL = 'https://securepay.quidly.ng/embedouter.js'
const CLOSE_GRACE_MS = 1500
const POLL_EVERY_MS = 4000
const POLL_FOR_MS = 120_000

export interface QuidlyWidgetParams {
  key: string
  email: string
  amount: number // kobo
  currency_code: string
  paymentmethods: string[]
  reference: string
  tx_ref?: string
}
export type CheckoutStatus = 'completed' | 'pending' | 'failed' | 'cancelled'
export interface CheckoutResult { status: CheckoutStatus; message?: string }
/** Calls payments-verify. First call passes the widget's quidly_ref; later polls pass only our reference. */
export type VerifyFn = (reference: string, quidlyRef?: string) => Promise<{ status: string }>

declare global {
  interface Window { embedQuidlyPay?: { initialize(opts: Record<string, unknown>): void } }
}

let loading: Promise<void> | null = null

export function loadQuidlyPay(): Promise<void> {
  if (window.embedQuidlyPay) return Promise.resolve()
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SCRIPT_URL
      s.async = true
      s.onload = () => {
        if (window.embedQuidlyPay) return resolve()
        loading = null; s.remove()
        reject(new Error('Quidly Pay loaded, but window.embedQuidlyPay is unavailable.'))
      }
      s.onerror = () => {
        loading = null; s.remove()
        reject(new Error('Could not load the payment window. Check your connection and try again.'))
      }
      document.head.appendChild(s)
    })
  }
  return loading
}

type WidgetOutcome = { type: 'result'; res: any } | { type: 'closed' }

// Resolves once. onclose can fire before callback, so closing waits a short grace period for a result.
function openWidget(w: QuidlyWidgetParams): Promise<WidgetOutcome> {
  return new Promise((resolve, reject) => {
    let done = false
    let closeTimer: ReturnType<typeof setTimeout> | null = null
    const finish = (v: WidgetOutcome) => {
      if (done) return
      done = true
      if (closeTimer) clearTimeout(closeTimer)
      resolve(v)
    }
    loadQuidlyPay().then(() => {
      try {
        window.embedQuidlyPay!.initialize({
          key: w.key, email: w.email, amount: w.amount, currency_code: w.currency_code,
          paymentmethods: w.paymentmethods, reference: w.reference, tx_ref: w.reference,
          callback: (res: any) => {
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
            finish({ type: 'result', res })
          },
          onclose: () => { closeTimer = setTimeout(() => finish({ type: 'closed' }), CLOSE_GRACE_MS) },
        })
      } catch (e) { reject(e) }
    }).catch(reject)
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const norm = (s: string): CheckoutStatus =>
  s === 'paid' ? 'completed' : s === 'failed' ? 'failed' : s === 'cancelled' ? 'cancelled' : 'pending'

export async function runCheckout(widget: QuidlyWidgetParams, verify: VerifyFn): Promise<CheckoutResult> {
  if (!widget?.reference) return { status: 'failed', message: 'Could not initialise your payment. Please try again.' }

  const out = await openWidget(widget)
  if (out.type === 'closed' || out.res?.status === 'cancelled') return { status: 'cancelled' }

  const quidlyRef: string | undefined = out.res?.quidly_ref
  if (!quidlyRef) return { status: 'failed', message: out.res?.message || 'Your payment was not completed.' }

  let r = await verify(widget.reference, quidlyRef)
  const deadline = Date.now() + POLL_FOR_MS
  while (norm(r.status) === 'pending' && Date.now() < deadline) {
    await sleep(POLL_EVERY_MS)
    if (Date.now() >= deadline) break
    r = await verify(widget.reference) // payments-verify saved the quidly_ref on the first call
  }

  const status = norm(r.status)
  return status === 'pending'
    ? { status, message: 'Your payment is still being confirmed. We will email you as soon as it lands.' }
    : { status }
}