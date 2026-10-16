<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TrainingsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AccountMenu from '@/components/traininghub/AccountMenu.vue'
import TrainingForm from '@/components/traininghub/TrainingForm.vue'
import TrainingStatusActions from '@/components/traininghub/TrainingStatusActions.vue'
import DiscountsManager from '@/components/traininghub/DiscountsManager.vue'
import type { Training } from '@/types/traininghub'

// /dashboard/trainings/new?org=<id>   or   /dashboard/trainings/:id/edit
const route = useRoute()
const router = useRouter()
const training = ref<Training | null>(null)
const ready = ref(false)
const { loading, error, run } = useAsyncAction()

const trainingId = computed(() => (route.params.id ? String(route.params.id) : ''))
const organisationId = computed(() => training.value?.organisation_id ?? String(route.query.org ?? ''))

onMounted(() => run(async () => {
  if (trainingId.value) training.value = await TrainingsService.getById(trainingId.value)
  ready.value = true
}))

function onSaved(t: Training) {
  const wasNew = !training.value
  training.value = t
  if (wasNew) router.replace({ name: 'training-edit', params: { id: t.id } })  // unlock discounts
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-10 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <router-link :to="{ name: 'dashboard' }" class="text-sm text-gray-500 hover:underline"><i class="fa-solid fa-arrow-left mr-1"></i>Dashboard</router-link>
        <AccountMenu />
      </div>

      <div v-if="loading || !ready" class="text-center py-24"><v-progress-circular indeterminate color="primary" /></div>
      <v-alert v-else-if="error" type="error" variant="tonal">{{ error.message }}</v-alert>
      <v-alert v-else-if="trainingId && !training" type="warning" variant="tonal">Training not found, or you don't have access.</v-alert>
      <v-alert v-else-if="!organisationId" type="warning" variant="tonal">No organisation selected. Start from the dashboard.</v-alert>

      <template v-else>
        <h1 class="text-2xl font-bold mb-6">{{ training ? 'Edit training' : 'New training' }}</h1>

        <div v-if="training" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div class="text-sm text-gray-500 mb-2">Status: <b>{{ training.status.replace('_', ' ') }}</b></div>
          <TrainingStatusActions :training="training" @updated="(t: Training) => (training = { ...training!, ...t })" />
        </div>

        <TrainingForm :key="training?.id ?? 'new'" :organisation-id="organisationId" :training="training" @saved="onSaved" />

        <section v-if="training" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
          <h2 class="font-semibold mb-4"><i class="fa-solid fa-percent mr-2 text-primary"></i>Group discounts</h2>
          <DiscountsManager :organisation-id="organisationId" :training-id="training.id" />
        </section>
      </template>
    </div>
  </main>
</template>
