import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue'
import { TrainingsService, RegistrationsService } from '@/services/traininghub'
import { useAsyncAction } from './useAsyncAction'
import type { ParticipantInput, PricingPreview, RegistrationType } from '@/types/traininghub'

const blank = (): ParticipantInput => ({ first_name: '', last_name: '', email: '', phone: '', job_title: '' })
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MAX_PARTICIPANTS = 50

export function useRegistration(trainingId: () => string) {
  const type = ref<RegistrationType>('individual')
  const companyName = ref('')
  const contact = reactive({ name: '', email: '', phone: '' })
  const participants = ref<ParticipantInput[]>([blank()])
  const pricing = ref<PricingPreview | null>(null)
  const { loading, error, run } = useAsyncAction()

  const addParticipant = () => { if (participants.value.length < MAX_PARTICIPANTS) participants.value.push(blank()) }
  const removeParticipant = (i: number) => { if (participants.value.length > 1) participants.value.splice(i, 1) }

  watch(type, (t) => { if (t === 'individual') participants.value = participants.value.slice(0, 1) })

  // debounced price preview
  let timer: ReturnType<typeof setTimeout>
  watch(() => [trainingId(), participants.value.length] as const, ([id, n]) => {
    clearTimeout(timer)
    if (!id) return
    timer = setTimeout(async () => {
      try { pricing.value = await TrainingsService.calculatePricing(id, n) } catch { pricing.value = null }
    }, 250)
  }, { immediate: true })
  onBeforeUnmount(() => clearTimeout(timer))

  const duplicateEmails = computed(() => {
    const seen = new Set<string>(); const dup = new Set<string>()
    participants.value.forEach(p => { const e = p.email.trim().toLowerCase(); if (!e) return; seen.has(e) ? dup.add(e) : seen.add(e) })
    return dup
  })

  const isValid = computed(() =>
    !!contact.name.trim() && EMAIL_RE.test(contact.email.trim()) &&
    (type.value === 'individual' || !!companyName.value.trim()) &&
    participants.value.every(p => p.first_name.trim() && p.last_name.trim() && EMAIL_RE.test(p.email.trim())) &&
    duplicateEmails.value.size === 0)

  async function submit() {
    if (!isValid.value) return undefined
    return run(() => RegistrationsService.create({
      training_id: trainingId(),
      registration_type: type.value,
      company_name: type.value === 'corporate' ? companyName.value.trim() : undefined,
      contact: { name: contact.name.trim(), email: contact.email.trim(), phone: contact.phone.trim() || undefined },
      participants: participants.value.map(p => ({
        ...p, first_name: p.first_name.trim(), last_name: p.last_name.trim(), email: p.email.trim(),
        phone: p.phone?.trim() || undefined, job_title: p.job_title?.trim() || undefined })),
    }))
  }

  return { type, companyName, contact, participants, pricing, duplicateEmails, isValid, loading, error,
    addParticipant, removeParticipant, submit }
}
