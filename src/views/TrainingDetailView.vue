<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { TrainingsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatMoney, formatDate } from '@/utils/format'
import type { Training, Discount } from '@/types/traininghub'

const route = useRoute()
const training = ref<Training | null>(null)
const discounts = ref<Discount[]>([])
const taken = ref(0)
const notFound = ref(false)
const { loading, error, run } = useAsyncAction()

const orgSlug = String(route.params.orgSlug)
const open = computed(() => training.value?.status === 'registration_open')
const seatsLeft = computed(() => (training.value?.capacity ? Math.max(training.value.capacity - taken.value, 0) : null))
const soldOut = computed(() => seatsLeft.value === 0)
const describe = (d: Discount) => (d.type === 'percentage' ? `${d.value}% off` : `${formatMoney(d.value, training.value?.currency)} off`)

const SECTIONS = [
  ['overview', 'Overview', 'fa-circle-info'], ['who_should_attend', 'Who should attend', 'fa-users'],
  ['learning_objectives', 'Learning objectives', 'fa-bullseye'], ['course_outline', 'Course outline', 'fa-list-check'],
  ['requirements', 'Requirements', 'fa-clipboard-check'],
] as const

onMounted(() => run(async () => {
  training.value = await TrainingsService.getBySlug(orgSlug, String(route.params.slug))
  if (!training.value) { notFound.value = true; return }
  const [d, s] = await Promise.all([TrainingsService.listDiscounts(training.value.id), TrainingsService.seatsTaken(training.value.id)])
  discounts.value = d.filter(x => x.is_active); taken.value = s
}))
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-12 px-4">
    <div v-if="loading" class="text-center py-24"><v-progress-circular indeterminate color="primary" /></div>
    <v-alert v-else-if="error" type="error" variant="tonal" class="max-w-4xl mx-auto">{{ error.message }}</v-alert>
    <div v-else-if="notFound" class="text-center py-24">
      <i class="fa-regular fa-face-frown text-5xl text-gray-400 mb-4"></i>
      <h1 class="text-2xl font-semibold mb-4">Training not found</h1>
      <v-btn color="primary" :to="{ name: 'home' }">Back to home</v-btn>
    </div>

    <article v-else-if="training" class="max-w-4xl mx-auto">
      <router-link :to="{ name: 'home' }" class="text-sm text-gray-500 hover:underline"><i class="fa-solid fa-arrow-left mr-1"></i>All trainings</router-link>
      <img v-if="training.cover_image" :src="training.cover_image" alt="" class="w-full h-64 object-cover rounded-2xl mt-4" data-aos="fade-in" />
      <header class="mt-6 mb-8" data-aos="fade-up">
        <p v-if="training.organisations" class="text-sm text-primary font-medium mb-1">{{ training.organisations.name }}</p>
        <h1 class="text-3xl font-bold mb-3">{{ training.title }}</h1>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 text-sm">
          <span><i class="fa-regular fa-calendar mr-1"></i>{{ formatDate(training.start_date) }} → {{ formatDate(training.end_date) }}</span>
          <span v-if="training.start_time"><i class="fa-regular fa-clock mr-1"></i>{{ training.start_time.slice(0, 5) }}<template v-if="training.end_time"> – {{ training.end_time.slice(0, 5) }}</template></span>
          <span class="capitalize"><i class="fa-solid fa-location-dot mr-1"></i>{{ training.delivery_mode }}<template v-if="training.location"> · {{ training.location }}</template></span>
          <span v-if="seatsLeft !== null"><i class="fa-solid fa-chair mr-1"></i>{{ soldOut ? 'Fully booked' : `${seatsLeft} seats left` }}</span>
        </div>
        <p v-if="training.short_description" class="mt-4 text-gray-600">{{ training.short_description }}</p>
      </header>

      <div class="grid md:grid-cols-3 gap-6">
        <div class="md:col-span-2 space-y-6">
          <template v-for="[key, title, icon] in SECTIONS" :key="key">
            <section v-if="training[key]" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-aos="fade-up">
              <h2 class="font-semibold mb-3"><i :class="['fa-solid', icon, 'mr-2 text-primary']"></i>{{ title }}</h2>
              <p class="text-gray-700 whitespace-pre-line">{{ training[key] }}</p>
            </section>
          </template>
        </div>

        <aside class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit md:sticky md:top-6" data-aos="fade-left">
          <div class="text-3xl font-bold">{{ formatMoney(training.fee, training.currency) }}</div>
          <div class="text-sm text-gray-500 mb-4">per participant</div>
          <ul v-if="discounts.length" class="text-sm text-green-700 mb-4 space-y-1">
            <li v-for="d in discounts" :key="d.id"><i class="fa-solid fa-tag mr-1"></i>{{ describe(d) }} for {{ d.min_participants }}+ participants</li>
          </ul>
          <v-btn v-if="open && !soldOut" block color="primary" size="large" :to="{ name: 'training-register', params: { orgSlug, slug: training.slug } }">
            Register now
          </v-btn>
          <v-alert v-else type="info" variant="tonal" density="compact">{{ soldOut ? 'This training is fully booked.' : 'Registration is not open.' }}</v-alert>
          <v-btn v-if="training.brochure_url" block variant="tonal" class="mt-3" :href="training.brochure_url" target="_blank" rel="noopener">
            <i class="fa-solid fa-file-pdf mr-2"></i>Download brochure
          </v-btn>
        </aside>
      </div>
    </article>
  </main>
</template>
