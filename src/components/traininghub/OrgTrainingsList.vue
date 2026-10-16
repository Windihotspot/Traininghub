<script setup lang="ts">
import { ref, watch } from 'vue'
import { TrainingsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatDate } from '@/utils/format'
import TrainingStatusActions from './TrainingStatusActions.vue'
import type { Training } from '@/types/traininghub'

const props = defineProps<{ organisationId: string; orgSlug?: string; canEdit?: boolean; canPublish?: boolean }>()
const trainings = ref<Training[]>([])
const { loading, error, run } = useAsyncAction()

watch(() => props.organisationId, (id) => {
  if (id) run(async () => { trainings.value = await TrainingsService.listForOrg(id) })
}, { immediate: true })

const onUpdated = (t: Training) => {
  const i = trainings.value.findIndex(x => x.id === t.id)
  if (i >= 0) trainings.value[i] = { ...trainings.value[i], ...t }
}
const statusColor = (s: string) =>
  ({ draft: 'grey', published: 'blue', registration_open: 'green', registration_closed: 'orange', completed: 'purple', archived: 'grey' } as Record<string, string>)[s] ?? 'grey'
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error.message }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <p v-else-if="!trainings.length" class="text-gray-500 py-6 text-center">No trainings yet.</p>

    <div v-for="t in trainings" :key="t.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4" data-aos="fade-up">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h4 class="font-semibold">{{ t.title }}</h4>
          <p class="text-sm text-gray-500"><i class="fa-regular fa-calendar mr-1"></i>{{ formatDate(t.start_date) }} → {{ formatDate(t.end_date) }}</p>
        </div>
        <div class="flex items-center gap-2">
          <v-chip :color="statusColor(t.status)" size="small" variant="tonal">{{ t.status.replace('_', ' ') }}</v-chip>
          <v-btn v-if="canEdit" size="small" variant="text" :to="{ name: 'training-edit', params: { id: t.id } }">
            <i class="fa-solid fa-pen mr-1"></i>Edit
          </v-btn>
          <v-btn v-if="orgSlug && t.status !== 'draft' && t.status !== 'archived'" size="small" variant="text"
            :to="{ name: 'training-detail', params: { orgSlug, slug: t.slug } }">
            <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>View
          </v-btn>
        </div>
      </div>
      <TrainingStatusActions v-if="canPublish" :training="t" @updated="onUpdated" />
    </div>
  </div>
</template>
