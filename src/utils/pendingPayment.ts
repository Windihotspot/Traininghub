// Per-tab convenience so the confirmation page can resume a payment without re-asking the email.
// Storage may be unavailable/empty (private mode, new tab) - callers must handle null.
const KEY = 'th:pending-payment'
export interface PendingPayment { registration_reference: string; contact_email: string }

export function savePendingPayment(p: PendingPayment) {
  try { sessionStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ }
}
export function loadPendingPayment(): PendingPayment | null {
  try { const v = sessionStorage.getItem(KEY); return v ? (JSON.parse(v) as PendingPayment) : null } catch { return null }
}
export function clearPendingPayment() {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}
