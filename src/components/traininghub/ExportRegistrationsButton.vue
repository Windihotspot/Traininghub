<script setup lang="ts">
import { RegistrationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { downloadBlob } from '@/utils/format'
import type { ExportFilters } from '@/types/traininghub'

const props = defineProps<{ organisationId: string; filters?: ExportFilters }>()
const { loading, error, run } = useAsyncAction()

async function exportCsv() {
  const blob = await run(() => RegistrationsService.exportCsv(props.organisationId, props.filters))
  if (blob) downloadBlob(blob, `registrations-${new Date().toISOString().slice(0, 10)}.csv`)
}
</script>

<template>
  <div class="inline-block">
    <v-btn variant="tonal" color="primary" :loading="loading" @click="exportCsv">
      <i class="fa-solid fa-file-csv mr-2"></i>Export CSV
    </v-btn>
    <div v-if="error" class="text-red-600 text-sm mt-1">{{ error.message }}</div>
  </div>
</template>
