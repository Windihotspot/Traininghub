import { ref, computed, onBeforeUnmount } from 'vue'
import { RegistrationsService } from '@/services/traininghub'
import { normalizeError } from '@/utils/apiError'
import { loadPendingPayment, savePendingPayment, clearPendingPayment } from '@/utils/pendingPayment'
import { useRoute, useRouter } from 'vue-router'
import { useCheckout } from './useCheckout'

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
const route = useRoute()
const router = useRouter()
const { pay } = useCheckout()
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
    const email = contactEmail.value.trim()
    const res = await RegistrationsService.resumePayment(registrationReference.value, email)
    savePendingPayment({ registration_reference: registrationReference.value, contact_email: email })

    if (!res.payment.widget) {
      errorMessage.value = 'Could not restart payment. Please contact support.'
      return
    }

    // The server issued a NEW payment reference. Point the URL at it first, so check()
    // and a page refresh both verify the new payment, not the superseded one.
    await router.replace({ query: { ...route.query, reference: res.payment.reference } })

    const out = await pay(res.payment.widget)
    polls = 0
    if (out.status === 'completed') return await check()

    state.value = out.status === 'pending' ? 'pending' : 'failed'
    if (out.message) errorMessage.value = out.message
  } catch (e) {
    errorMessage.value = normalizeError(e).message
  } finally {
    resuming.value = false
  }
}

  onBeforeUnmount(() => clearTimeout(timer))
  return { state, registrationReference, contactEmail, canResume, resuming, errorMessage, check, resume }
}
