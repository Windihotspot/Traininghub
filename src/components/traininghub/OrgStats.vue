<script setup lang="ts">
import { ref, watch } from 'vue'
import { OrganisationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatMoney } from '@/utils/format'

// Pass organisationId for org stats; omit it for platform-wide stats.
const props = defineProps<{ organisationId?: string }>()
const stats = ref<Record<string, number>>({})
const { loading, error, run } = useAsyncAction()

const META: Record<string, { label: string; icon: string; money?: boolean }> = {
  trainings: { label: 'Trainings', icon: 'fa-chalkboard-user' },
  published: { label: 'Live trainings', icon: 'fa-bullhorn' },
  registrations: { label: 'Registrations', icon: 'fa-clipboard-list' },
  participants: { label: 'Confirmed participants', icon: 'fa-users' },
  paid: { label: 'Paid payments', icon: 'fa-circle-check' },
  pending: { label: 'Pending payments', icon: 'fa-hourglass-half' },
  revenue: { label: 'Revenue', icon: 'fa-naira-sign', money: true },
  organisations: { label: 'Organisations', icon: 'fa-building' },
  published_trainings: { label: 'Live trainings', icon: 'fa-bullhorn' },
  successful_payments: { label: 'Successful payments', icon: 'fa-circle-check' },
  pending_payments: { label: 'Pending payments', icon: 'fa-hourglass-half' },
}

watch(() => props.organisationId, () => run(async () => {
  stats.value = (props.organisationId
    ? await OrganisationsService.orgStats(props.organisationId)
    : await OrganisationsService.platformStats()) ?? {}
}), { immediate: true })

const entries = () => Object.entries(stats.value).filter(([k]) => k in META)
const show = (k: string, v: number) => (META[k].money ? formatMoney(Number(v)) : Number(v).toLocaleString())
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact">{{ error.message }}</v-alert>
    <v-progress-linear v-else-if="loading" indeterminate color="primary" />
    <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="[k, v] in entries()" :key="k" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-aos="fade-up">
        <div class="text-sm text-gray-500"><i :class="['fa-solid', META[k].icon, 'mr-2 text-primary']"></i>{{ META[k].label }}</div>
        <div class="text-2xl font-semibold mt-1">{{ show(k, v) }}</div>
      </div>
    </div>
  </div>
</template>
