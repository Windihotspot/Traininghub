<script setup lang="ts">
import { ref, watch } from 'vue'
import { OrganisationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { AuditRow } from '@/types/traininghub'

const props = defineProps<{ organisationId: string }>()
const rows = ref<AuditRow[]>([])
const { loading, error, run } = useAsyncAction()
watch(() => props.organisationId, (id) => run(async () => { rows.value = await OrganisationsService.listAudit(id) }), { immediate: true })
const when = (iso: string) => new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error.message }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <div class="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
      <v-table density="compact">
        <thead><tr><th>When</th><th>Action</th><th>By</th><th>Resource</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="whitespace-nowrap">{{ when(r.created_at) }}</td>
            <td class="font-medium">{{ r.action.replace(/_/g, ' ').toLowerCase() }}</td>
            <td>{{ r.actor_email ?? 'system' }}</td>
            <td>{{ r.resource_type }}</td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="4" class="text-center text-gray-500 py-6">No activity yet.</td></tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>
