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
const activeTab = ref<string | null>(null)
const { loading, error, run } = useAsyncAction()

const orgSlug = String(route.params.orgSlug)
const open = computed(() => training.value?.status === 'registration_open')
const seatsLeft = computed(() => (training.value?.capacity ? Math.max(training.value.capacity - taken.value, 0) : null))
const soldOut = computed(() => seatsLeft.value === 0)
const canRegister = computed(() => open.value && !soldOut.value)
const describe = (d: Discount) => (d.type === 'percentage' ? `${d.value}% off` : `${formatMoney(d.value, training.value?.currency)} off`)

const SECTIONS = [
  ['overview', 'Overview', 'fa-circle-info'], ['who_should_attend', 'Who should attend', 'fa-users'],
  ['learning_objectives', 'Learning objectives', 'fa-bullseye'], ['course_outline', 'Course outline', 'fa-list-check'],
  ['requirements', 'Requirements', 'fa-clipboard-check'],
] as const

// Only sections that have content become tabs / blocks
const visibleSections = computed(() => SECTIONS.filter(([key]) => training.value?.[key]))

// Highlights strip (hidden items are skipped)
const highlights = computed(() => {
  const t = training.value
  if (!t) return []
  return [
    { title: t.delivery_mode, sub: t.location || null, capitalize: true },
    { title: `${formatDate(t.start_date)} – ${formatDate(t.end_date)}`, sub: t.start_time ? `${t.start_time.slice(0, 5)}${t.end_time ? ' – ' + t.end_time.slice(0, 5) : ''}` : null },
    { title: `${formatMoney(t.fee, t.currency)} per participant`, sub: discounts.value.length ? 'Group discounts available' : null },
    seatsLeft.value !== null ? { title: soldOut.value ? 'Fully booked' : `${seatsLeft.value} seats left`, sub: `Capacity: ${t.capacity}` } : null,
  ].filter(Boolean) as { title: string; sub: string | null; capitalize?: boolean }[]
})

function goTo(key: string) {
  activeTab.value = key
  document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => run(async () => {
  training.value = await TrainingsService.getBySlug(orgSlug, String(route.params.slug))
  if (!training.value) { notFound.value = true; return }
  const [d, s] = await Promise.all([TrainingsService.listDiscounts(training.value.id), TrainingsService.seatsTaken(training.value.id)])
  discounts.value = d.filter(x => x.is_active); taken.value = s
  activeTab.value = visibleSections.value[0]?.[0] ?? null
}))
</script>

<template>
  <main class="min-h-screen bg-gray-50">
    <div v-if="loading" class="text-center py-24"><v-progress-circular indeterminate color="primary" /></div>
    <v-alert v-else-if="error" type="error" variant="tonal" class="max-w-4xl mx-auto my-12">{{ error.message }}</v-alert>
    <div v-else-if="notFound" class="text-center py-24 px-4">
      <i class="fa-regular fa-face-frown text-5xl text-gray-400 mb-4"></i>
      <h1 class="text-2xl font-semibold mb-4">Training not found</h1>
      <v-btn color="primary" :to="{ name: 'home' }">Back to home</v-btn>
    </div>

    <article v-else-if="training">
      <!-- HERO -->
      <section class="relative bg-primary text-white">
        <img v-if="training.cover_image" :src="training.cover_image" alt="" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10"></div>

        <div class="relative max-w-6xl mx-auto px-4 pt-8 pb-28 md:pb-32">
          <router-link :to="{ name: 'home' }" class="text-sm text-white/80 hover:underline">
            <i class="fa-solid fa-arrow-left mr-1"></i>All trainings
          </router-link>

          <div class="mt-10 md:mt-16 grid md:grid-cols-5 gap-8 items-start">
            <header class="md:col-span-3 md:pt-16" data-aos="fade-up">
              <p v-if="training.organisations" class="text-sm font-medium mb-2 text-white/90">{{ training.organisations.name }}</p>
              <h1 class="text-3xl md:text-5xl font-bold leading-tight">{{ training.title }}</h1>
              <p v-if="training.short_description" class="mt-4 text-lg text-white/90 max-w-xl">{{ training.short_description }}</p>
            </header>

            <!-- Floating action card -->
            <div class="md:col-span-2 bg-white text-gray-900 rounded-2xl shadow-lg p-6" data-aos="fade-left">
              <h2 class="text-lg font-semibold">
                {{ canRegister ? `Starts ${formatDate(training.start_date)}` : soldOut ? 'This training is fully booked' : 'Registration is not open' }}
              </h2>
              <p class="text-sm text-gray-600 mt-1 mb-4">
                <template v-if="canRegister">Secure your seat now{{ seatsLeft !== null ? ` — ${seatsLeft} left` : '' }}. Download the brochure for the full details.</template>
                <template v-else>Check back later or browse other trainings.</template>
              </p>
              <v-btn v-if="canRegister" block color="primary" size="large" class="mb-3"
                :to="{ name: 'training-register', params: { orgSlug, slug: training.slug } }">Register now</v-btn>
              <v-btn v-else block color="primary" size="large" class="mb-3" :to="{ name: 'home' }">Browse trainings</v-btn>
              <v-btn v-if="training.brochure_url" block variant="outlined" color="primary" size="large"
                :href="training.brochure_url" target="_blank" rel="noopener">
                <i class="fa-solid fa-file-pdf mr-2"></i>Download brochure
              </v-btn>
            </div>
          </div>
        </div>
      </section>

      <!-- HIGHLIGHTS STRIP (overlaps hero) -->
      <div class="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div class="bg-white rounded-2xl shadow-md border border-gray-100 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-200" data-aos="fade-up">
          <div v-for="(h, i) in highlights" :key="i" class="p-6">
            <div class="font-semibold text-lg leading-snug" :class="{ capitalize: h.capitalize }">{{ h.title }}</div>
            <div v-if="h.sub" class="text-sm text-gray-500 mt-2">{{ h.sub }}</div>
          </div>
        </div>
      </div>

      <!-- TAB NAV -->
      <nav v-if="visibleSections.length > 1" class="sticky top-0 z-20 bg-white border-b border-gray-200 mt-6">
        <div class="max-w-6xl mx-auto px-4">
          <v-tabs v-model="activeTab" color="primary" density="comfortable" show-arrows>
            <v-tab v-for="[key, title] in visibleSections" :key="key" :value="key" class="text-none" @click="goTo(key)">{{ title }}</v-tab>
          </v-tabs>
        </div>
      </nav>

      <!-- CONTENT -->
      <div class="max-w-6xl mx-auto px-4 py-12 grid lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2 space-y-12">
          <section v-for="[key, title, icon] in visibleSections" :id="key" :key="key" class="scroll-mt-20">
            <h2 class="text-xl font-bold mb-4"><i :class="['fa-solid', icon, 'mr-3 text-primary text-xl']"></i>{{ title }}</h2>
            <p class="text-gray-700 leading-relaxed whitespace-pre-line">{{ training[key] }}</p>
          </section>
        </div>

        <!-- Tinted sidebar card -->
        <aside class="rounded-2xl p-6 h-fit lg:sticky lg:top-20" style="background: rgb(var(--v-theme-primary), 0.08)">
          <h2 class="text-xl font-bold mb-4">
            {{ canRegister ? 'Registration is open!' : soldOut ? 'Fully booked' : 'Registration is not open' }}
          </h2>
          <ul class="text-sm text-gray-700 space-y-2 list-disc pl-5 mb-4">
            <li>Starts: {{ formatDate(training.start_date) }}</li>
            <li>Ends: {{ formatDate(training.end_date) }}</li>
            <li v-if="seatsLeft !== null">{{ soldOut ? 'No seats left' : `${seatsLeft} seats left` }}</li>
          </ul>

          <div class="text-3xl font-bold">{{ formatMoney(training.fee, training.currency) }}</div>
          <div class="text-sm text-gray-500 mb-4">per participant</div>

          <ul v-if="discounts.length" class="text-sm text-green-700 mb-5 space-y-1">
            <li v-for="d in discounts" :key="d.id"><i class="fa-solid fa-tag mr-1"></i>{{ describe(d) }} for {{ d.min_participants }}+ participants</li>
          </ul>

          <v-btn v-if="canRegister" block color="primary" size="large"
            :to="{ name: 'training-register', params: { orgSlug, slug: training.slug } }">Register now</v-btn>
        </aside>
      </div>
    </article>
  </main>
</template>