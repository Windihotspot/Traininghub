
const KEY = 'th:pending-payment'

export interface PendingPayment {
  registration_reference: string
  contact_email: string
  quidly_ref?: string
}

export function savePendingPayment(p: PendingPayment) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // Storage may be unavailable.
  }
}

export function loadPendingPayment(): PendingPayment | null {
  try {
    const value = sessionStorage.getItem(KEY)
    return value ? (JSON.parse(value) as PendingPayment) : null
  } catch {
    return null
  }
}

export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Storage may be unavailable.
  }
}
