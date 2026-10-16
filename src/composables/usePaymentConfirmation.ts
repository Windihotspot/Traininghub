import { ref, computed, onBeforeUnmount } from 'vue'
import { RegistrationsService } from '@/services/traininghub'
import { normalizeError } from '@/utils/apiError'
import { loadPendingPayment, savePendingPayment, clearPendingPayment } from '@/utils/pendingPayment'

const POLL_MS = 3000
const MAX_POLLS = 10 // webhook may land slightly after the redirect

type State = 'idle' | 'checking' | 'paid' | 'failed' | 'pending' | 'error'

export function usePaymentConfirmation(reference: () => string) {
  const state = ref<State>('idle')
  const registrationReference = ref('')
  const contactEmail = ref('')          // prefilled from sessionStorage, else user types it
  const resuming = ref(false)
  const errorMessage = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined
  let polls = 0

  const canResume = computed(() => !!registrationReference.value && /^\S+@\S+\.\S+$/.test(contactEmail.value.trim()))

  async function check() {
    clearTimeout(timer)
    state.value = 'checking'
    try {
      const res = await RegistrationsService.verifyPayment(reference())
      registrationReference.value = res.registration?.reference ?? registrationReference.value
      const stored = loadPendingPayment()
      if (stored && stored.registration_reference === registrationReference.value && !contactEmail.value) {
        contactEmail.value = stored.contact_email
      }
      const s = res.payment.status
      if (s === 'paid') { clearPendingPayment(); state.value = 'paid'; return }
      if (s === 'failed' || s === 'cancelled') { state.value = 'failed'; return }
      if (++polls < MAX_POLLS) timer = setTimeout(check, POLL_MS)
      else { state.value = 'pending'; polls = 0 }
    } catch (e) { errorMessage.value = normalizeError(e).message; state.value = 'error' }
  }

  async function resume() {
    if (!canResume.value) return
    resuming.value = true
    errorMessage.value = ''
    try {
      const res = await RegistrationsService.resumePayment(registrationReference.value, contactEmail.value.trim())
      savePendingPayment({ registration_reference: registrationReference.value, contact_email: contactEmail.value.trim() })
      if (res.payment.checkout_url) window.location.href = res.payment.checkout_url
      else errorMessage.value = 'Could not restart payment. Please contact support.'
    } catch (e) { errorMessage.value = normalizeError(e).message }
    finally { resuming.value = false }
  }

  onBeforeUnmount(() => clearTimeout(timer))
  return { state, registrationReference, contactEmail, canResume, resuming, errorMessage, check, resume }
}
