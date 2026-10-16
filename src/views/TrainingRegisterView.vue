<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { TrainingsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatMoney, formatDate } from '@/utils/format'
import RegistrationForm from '@/components/traininghub/RegistrationForm.vue'
import type { Training } from '@/types/traininghub'

const route = useRoute()
const training = ref<Training | null>(null)
const notFound = ref(false)
const { loading, error, run } = useAsyncAction()

const orgSlug = String(route.params.orgSlug)
const open = computed(() => training.value?.status === 'registration_open')

onMounted(() => run(async () => {
  training.value = await TrainingsService.getBySlug(orgSlug, String(route.params.slug))
  notFound.value = !training.value
}))
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-12 px-4">
    <div v-if="loading" class="text-center py-24"><v-progress-circular indeterminate color="primary" /></div>
    <v-alert v-else-if="error" type="error" variant="tonal" class="max-w-3xl mx-auto">{{ error.message }}</v-alert>
    <div v-else-if="notFound" class="text-center py-24">
      <i class="fa-regular fa-face-frown text-5xl text-gray-400 mb-4"></i>
      <h1 class="text-2xl font-semibold mb-4">Training not found</h1>
      <v-btn color="primary" :to="{ name: 'home' }">Back to home</v-btn>
    </div>

    <template v-else-if="training">
      <header class="max-w-3xl mx-auto mb-8" data-aos="fade-down">
        <router-link :to="{ name: 'training-detail', params: { orgSlug, slug: training.slug } }" class="text-sm text-gray-500 hover:underline">
          <i class="fa-solid fa-arrow-left mr-1"></i>Training details
        </router-link>
        <h1 class="text-3xl font-bold mt-2 mb-3">{{ training.title }}</h1>
        <div class="flex flex-wrap gap-x-6 gap-y-1 text-gray-600 text-sm">
          <span><i class="fa-regular fa-calendar mr-1"></i>{{ formatDate(training.start_date) }} → {{ formatDate(training.end_date) }}</span>
          <span class="capitalize"><i class="fa-solid fa-location-dot mr-1"></i>{{ training.delivery_mode }}<template v-if="training.location"> · {{ training.location }}</template></span>
          <span><i class="fa-solid fa-tag mr-1"></i>{{ formatMoney(training.fee, training.currency) }} per participant</span>
        </div>
      </header>

      <RegistrationForm v-if="open" :training-id="training.id" :currency="training.currency" />
      <v-alert v-else type="info" variant="tonal" class="max-w-3xl mx-auto">Registration for this training is not open.</v-alert>
    </template>
  </main>
</template>
