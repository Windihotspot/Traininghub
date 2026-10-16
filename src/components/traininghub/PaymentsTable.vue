<script setup lang="ts">
import { ref, watch } from 'vue'
import { RegistrationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatMoney, formatDate } from '@/utils/format'
import type { PaymentRow } from '@/types/traininghub'

const props = defineProps<{ organisationId: string }>()
const rows = ref<PaymentRow[]>([])
const { loading, error, run } = useAsyncAction()
watch(() => props.organisationId, (id) => run(async () => { rows.value = await RegistrationsService.listPayments(id) }), { immediate: true })
const color = (s: string) => ({ paid: 'green', pending: 'orange', processing: 'orange', failed: 'red', refunded: 'blue' } as Record<string, string>)[s] ?? 'grey'
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error.message }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <div class="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
      <v-table>
        <thead><tr><th>Payment</th><th>Registration</th><th>Payer</th><th>Amount</th><th>Provider</th><th>Status</th><th>Paid</th></tr></thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td class="font-medium">{{ p.reference }}</td>
            <td>{{ p.registrations?.reference }}</td>
            <td>{{ p.registrations?.company_name ?? p.registrations?.contact_name }}</td>
            <td>{{ formatMoney(p.amount, p.currency) }}</td>
            <td class="capitalize">{{ p.provider }}</td>
            <td><v-chip size="x-small" :color="color(p.status)" variant="tonal">{{ p.status }}</v-chip></td>
            <td>{{ formatDate(p.paid_at) }}</td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="7" class="text-center text-gray-500 py-6">No payments yet.</td></tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>
