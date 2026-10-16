<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RegistrationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatMoney, formatDate } from '@/utils/format'
import type { RegistrationRow } from '@/types/traininghub'

const props = defineProps<{ organisationId: string; canUpdate?: boolean }>()
const rows = ref<RegistrationRow[]>([])
const search = ref('')
const regStatus = ref<string | null>(null)
const payStatus = ref<string | null>(null)
const open = ref<Set<string>>(new Set())
const notes = ref<Record<string, string>>({})
const { loading, error, run } = useAsyncAction()

watch(() => props.organisationId, (id) => run(async () => {
  rows.value = await RegistrationsService.listForOrg(id)
  notes.value = Object.fromEntries(rows.value.map(r => [r.id, r.notes ?? '']))
}), { immediate: true })

const payOf = (r: RegistrationRow) => r.payments?.find(p => p.status === 'paid') ?? r.payments?.[0]
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter(r =>
    (!regStatus.value || r.status === regStatus.value) &&
    (!payStatus.value || payOf(r)?.status === payStatus.value) &&
    (!q || [r.reference, r.contact_name, r.contact_email, r.company_name, r.trainings?.title].some(v => v?.toLowerCase().includes(q))))
})
const toggle = (id: string) => (open.value.has(id) ? open.value.delete(id) : open.value.add(id))
const color = (s?: string) => ({ confirmed: 'green', paid: 'green', pending: 'orange', processing: 'orange', cancelled: 'grey', failed: 'red', waitlisted: 'blue' } as Record<string, string>)[s ?? ''] ?? 'grey'

const saveNotes = (r: RegistrationRow) => run(async () => { await RegistrationsService.updateNotes(r.id, notes.value[r.id]); r.notes = notes.value[r.id] || null; return true })
const cancel = (r: RegistrationRow) => {
  if (!window.confirm(`Cancel ${r.reference}? This does not refund any payment.`)) return
  run(async () => { await RegistrationsService.updateStatus(r.id, 'cancelled'); r.status = 'cancelled'; return true })
}
const attend = (rp: RegistrationRow['registration_participants'][number], v: boolean) =>
  run(async () => { await RegistrationsService.setAttended(rp.id, v); rp.attended = v; return true })
</script>

<template>
  <div>
    <div class="grid md:grid-cols-3 gap-3 mb-4">
      <v-text-field v-model="search" label="Search reference, name, email, company…" variant="outlined" density="compact" hide-details clearable>
        <template #prepend-inner><i class="fa-solid fa-magnifying-glass"></i></template>
      </v-text-field>
      <v-select v-model="regStatus" :items="['pending', 'confirmed', 'cancelled', 'waitlisted']" label="Registration status" clearable variant="outlined" density="compact" hide-details />
      <v-select v-model="payStatus" :items="['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded']" label="Payment status" clearable variant="outlined" density="compact" hide-details />
    </div>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3" closable>{{ error.message }}</v-alert>
    <v-progress-linear v-if="loading && !rows.length" indeterminate color="primary" />

    <div class="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
      <v-table>
        <thead><tr><th></th><th>Reference</th><th>Training</th><th>Contact</th><th>People</th><th>Total</th><th>Registration</th><th>Payment</th><th>Date</th></tr></thead>
        <tbody>
          <template v-for="r in filtered" :key="r.id">
            <tr class="cursor-pointer" @click="toggle(r.id)">
              <td><i :class="['fa-solid', open.has(r.id) ? 'fa-chevron-down' : 'fa-chevron-right', 'text-xs']"></i></td>
              <td class="font-medium">{{ r.reference }}</td>
              <td>{{ r.trainings?.title }}</td>
              <td>{{ r.company_name ?? r.contact_name }}<div class="text-xs text-gray-500">{{ r.contact_email }}</div></td>
              <td>{{ r.participant_count }}</td>
              <td>{{ formatMoney(r.total_amount, r.currency) }}</td>
              <td><v-chip size="x-small" :color="color(r.status)" variant="tonal">{{ r.status }}</v-chip></td>
              <td><v-chip size="x-small" :color="color(payOf(r)?.status)" variant="tonal">{{ payOf(r)?.status ?? '—' }}</v-chip></td>
              <td>{{ formatDate(r.created_at) }}</td>
            </tr>
            <tr v-if="open.has(r.id)">
              <td colspan="9" class="bg-gray-50">
                <div class="py-3 grid md:grid-cols-2 gap-6">
                  <div>
                    <div class="text-sm font-semibold mb-2">Participants</div>
                    <div v-for="rp in r.registration_participants" :key="rp.id" class="flex items-center justify-between text-sm py-1">
                      <span>{{ rp.participants?.first_name }} {{ rp.participants?.last_name }}
                        <span class="text-gray-500">· {{ rp.participants?.email }}<template v-if="rp.participants?.job_title"> · {{ rp.participants.job_title }}</template></span></span>
                      <v-checkbox :model-value="rp.attended" label="Attended" density="compact" hide-details :disabled="!canUpdate || loading"
                        @update:model-value="(v: boolean | null) => attend(rp, !!v)" />
                    </div>
                  </div>
                  <div>
                    <v-textarea v-model="notes[r.id]" label="Internal notes" rows="2" auto-grow variant="outlined" density="compact" hide-details :disabled="!canUpdate" />
                    <div v-if="canUpdate" class="flex gap-2 mt-2">
                      <v-btn size="small" color="primary" variant="tonal" :disabled="loading" @click="saveNotes(r)">Save notes</v-btn>
                      <v-btn v-if="r.status !== 'cancelled'" size="small" color="error" variant="tonal" :disabled="loading" @click="cancel(r)">Cancel registration</v-btn>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!filtered.length && !loading"><td colspan="9" class="text-center text-gray-500 py-6">No registrations found.</td></tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>
