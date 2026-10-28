<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue'
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

const orgSlug = computed(() => String(route.params.orgSlug ?? ''))
const trainingSlug = computed(() => String(route.params.slug ?? ''))

const open = computed(() => training.value?.status === 'registration_open')

const seatsLeft = computed(() => {
  const capacity = training.value?.capacity

  if (capacity == null) return null

  return Math.max(Number(capacity) - taken.value, 0)
})

const soldOut = computed(() => seatsLeft.value === 0)

const canRegister = computed(() => open.value && !soldOut.value)

const describe = (discount: Discount) => {
  return discount.type === 'percentage'
    ? `${discount.value}% off`
    : `${formatMoney(discount.value, training.value?.currency)} off`
}

const sections = [
  {
    key: 'overview',
    title: 'Overview',
    icon: 'fa-circle-info'
  },
  {
    key: 'who_should_attend',
    title: 'Who should attend',
    icon: 'fa-users'
  },
  {
    key: 'learning_objectives',
    title: 'Learning objectives',
    icon: 'fa-bullseye'
  },
  {
    key: 'course_outline',
    title: 'Course outline',
    icon: 'fa-list-check'
  },
  {
    key: 'requirements',
    title: 'Requirements',
    icon: 'fa-clipboard-check'
  }
] as const

type SectionKey = (typeof sections)[number]['key']

const visibleSections = computed(() => {
  if (!training.value) return []

  return sections.filter(({ key }) => {
    const value = training.value?.[key]

    return typeof value === 'string' && value.trim().length > 0
  })
})

const highlights = computed(() => {
  const item = training.value

  if (!item) return []

  return [
    {
      title: item.delivery_mode,
      subtitle: item.location || 'Available online',
      icon: 'fa-desktop',
      capitalize: true
    },
    {
      title: `${formatDate(item.start_date)} – ${formatDate(item.end_date)}`,
      subtitle: item.start_time
        ? `${item.start_time.slice(0, 5)}${item.end_time ? ` – ${item.end_time.slice(0, 5)}` : ''}`
        : 'Training schedule',
      icon: 'fa-calendar-days'
    },
    {
      title: `${formatMoney(item.fee, item.currency)} per participant`,
      subtitle: discounts.value.length ? 'Group discounts available' : 'Standard registration fee',
      icon: 'fa-naira-sign'
    },
    ...(seatsLeft.value !== null
      ? [
          {
            title: soldOut.value ? 'Fully booked' : `${seatsLeft.value} seats left`,
            subtitle: `Capacity: ${item.capacity}`,
            icon: 'fa-users'
          }
        ]
      : [])
  ]
})

function sectionContent(key: SectionKey): string {
  const value = training.value?.[key]

  return typeof value === 'string' ? value : ''
}

function goTo(key: string) {
  activeTab.value = key

  document.getElementById(key)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

let observer: IntersectionObserver | null = null

function setupSectionObserver() {
  observer?.disconnect()

  if (!('IntersectionObserver' in window)) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      if (visible.length) {
        activeTab.value = visible[0].target.id
      }
    },
    {
      rootMargin: '-20% 0px -65% 0px',
      threshold: 0
    }
  )

  visibleSections.value.forEach(({ key }) => {
    const element = document.getElementById(key)

    if (element) observer?.observe(element)
  })
}

async function loadTraining() {
  await run(async () => {
    notFound.value = false
    training.value = null
    discounts.value = []
    taken.value = 0
    activeTab.value = null

    const result = await TrainingsService.getBySlug(orgSlug.value, trainingSlug.value)

    if (!result) {
      notFound.value = true
      return
    }

    training.value = result

    const [availableDiscounts, seatsTaken] = await Promise.all([
      TrainingsService.listDiscounts(result.id),
      TrainingsService.seatsTaken(result.id)
    ])

    discounts.value = availableDiscounts.filter((discount) => discount.is_active)

    taken.value = seatsTaken

    // Automatically activate the first available tab.
    activeTab.value = visibleSections.value[0]?.key ?? null
  })
}
onMounted(loadTraining)
</script>

<template>
  <main class="min-h-screen bg-[#fbfaff] text-[#17143f]">
    <!-- Loading -->
    <div v-if="loading" class="flex min-h-[60vh] items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-[#e7e2ff] border-t-[#39218f]"
        />

        <p class="text-sm font-medium text-slate-500">Loading training details...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mx-auto max-w-3xl px-5 py-20">
      <div class="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <i class="fa-solid fa-circle-exclamation mb-4 text-3xl text-red-500" />

        <h1 class="text-xl font-bold text-slate-900">Unable to load training</h1>

        <p class="mt-2 text-sm text-slate-500">
          {{ error.message }}
        </p>

        <button
          type="button"
          class="mt-6 rounded-xl bg-[#302078] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#211653]"
          @click="loadTraining"
        >
          Try again
        </button>
      </div>
    </div>

    <!-- Not found -->
    <div
      v-else-if="notFound"
      class="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center"
    >
      <div class="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#f0edff]">
        <i class="fa-regular fa-face-frown text-3xl text-[#39218f]" />
      </div>

      <h1 class="text-2xl font-bold text-[#17143f]">Training not found</h1>

      <p class="mt-2 max-w-md text-sm leading-6 text-slate-500">
        This training may have been removed or the link may be incorrect.
      </p>

      <router-link
        :to="{ name: 'home' }"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#39218f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#281765]"
      >
        <i class="fa-solid fa-arrow-left" />
        Back to trainings
      </router-link>
    </div>

    <article v-else-if="training">
      <!-- ==========================================
           HERO
      =========================================== -->
      <section class="relative isolate overflow-hidden bg-[#100e25] text-white">
        <!-- Cover image -->
        <img
          v-if="training.cover_image"
          :src="training.cover_image"
          :alt="training.title"
          class="absolute inset-0 -z-20 h-full w-full object-cover"
        />

        <!-- Dark overlay for readable text -->
        <div class="absolute inset-0 -z-10 bg-[#100e25]/80" />

        <!-- Purple gradient -->
        <div
          class="absolute inset-0 -z-10 bg-gradient-to-r from-[#100e25]/95 via-[#171137]/85 to-[#171137]/45"
        />

        <!-- Bottom fade -->
        <div
          class="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#100e25]/70 to-transparent"
        />

        <div class="mx-auto max-w-7xl px-5 pb-28 pt-8 sm:px-8 sm:pb-32 lg:px-12">
          <!-- Back navigation -->
          <router-link
            :to="{ name: 'home' }"
            class="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white"
          >
            <i class="fa-solid fa-arrow-left" />
            All trainings
          </router-link>

          <div class="mt-10 grid items-center gap-10 lg:mt-12 lg:grid-cols-12 lg:gap-12">
            <!-- Training title -->
            <header class="lg:col-span-7" data-aos="fade-up">
              <div
                v-if="training.organisations?.name"
                class="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md"
              >
                <i class="fa-solid fa-building-columns text-[#b9aaff]" />

                {{ training.organisations.name }}
              </div>

              <h1
                class="max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl"
              >
                {{ training.title }}
              </h1>

              <p
                v-if="training.short_description"
                class="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8"
              >
                {{ training.short_description }}
              </p>

              <!-- Quick metadata -->
              <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-white/85">
                <span class="inline-flex items-center gap-2">
                  <i class="fa-regular fa-clock text-lg text-[#c3b6ff]" />
                  {{ training.delivery_mode }}
                </span>

                <span class="hidden h-5 w-px bg-white/25 sm:block" />

                <span class="inline-flex items-center gap-2">
                  <i class="fa-regular fa-calendar text-lg text-[#c3b6ff]" />
                  {{ formatDate(training.start_date) }}
                </span>

                <span v-if="seatsLeft !== null" class="hidden h-5 w-px bg-white/25 sm:block" />

                <span v-if="seatsLeft !== null" class="inline-flex items-center gap-2">
                  <i class="fa-solid fa-users text-lg text-[#c3b6ff]" />
                  {{ seatsLeft }} seats left
                </span>
              </div>
            </header>

            <!-- Floating registration card -->
            <aside
              class="rounded-3xl border border-white/70 bg-white p-6 text-[#17143f] shadow-2xl shadow-black/25 sm:p-8 lg:col-span-5"
              data-aos="fade-left"
              data-aos-delay="100"
            >
              <div class="flex items-start gap-4">
                <div
                  class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0edff] text-xl text-[#39218f] sm:flex"
                >
                  <i class="fa-regular fa-calendar-check" />
                </div>

                <div>
                  <h2 class="text-lg font-bold sm:text-xl">
                    {{
                      canRegister
                        ? `Starts ${formatDate(training.start_date)}`
                        : soldOut
                          ? 'This training is fully booked'
                          : 'Registration is not open'
                    }}
                  </h2>

                  <p class="mt-2 text-sm leading-6 text-slate-500">
                    <template v-if="canRegister">
                      Secure your seat now
                      <template v-if="seatsLeft !== null"> — {{ seatsLeft }} left. </template>

                      <template v-if="training.brochure_url">
                        Download the brochure for the full details.
                      </template>
                    </template>

                    <template v-else-if="soldOut"> All available seats have been booked. </template>

                    <template v-else>
                      Check the training details and return when registration opens.
                    </template>
                  </p>
                </div>
              </div>

              <!-- Register button -->
              <router-link
                v-if="canRegister"
                :to="{
                  name: 'training-register',
                  params: {
                    orgSlug,
                    slug: training.slug
                  }
                }"
                class="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#39218f] to-[#5140b8] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-[#39218f]/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#39218f]/30 focus:outline-none focus:ring-4 focus:ring-[#39218f]/20"
              >
                Register now
                <i class="fa-solid fa-arrow-right" />
              </router-link>

              <router-link
                v-else
                :to="{ name: 'home' }"
                class="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#39218f] to-[#5140b8] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Browse trainings
                <i class="fa-solid fa-arrow-right" />
              </router-link>

              <!-- Brochure -->
              <a
                v-if="training.brochure_url"
                :href="training.brochure_url"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-3 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#5140b8] bg-white px-5 py-3 text-sm font-semibold text-[#39218f] transition hover:bg-[#f5f2ff] focus:outline-none focus:ring-4 focus:ring-[#39218f]/10"
              >
                <i class="fa-regular fa-file-pdf text-lg" />
                Download brochure
              </a>

              <div
                v-if="discounts.length"
                class="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
              >
                <i class="fa-solid fa-tag mt-0.5" />

                <span> Group discounts available for this training. </span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <!-- ==========================================
           TRAINING HIGHLIGHTS
      =========================================== -->
      <section class="relative z-10 mx-auto -mt-14 max-w-7xl px-5 sm:px-8 lg:px-12">
        <div
          class="grid overflow-hidden rounded-2xl border border-[#e9e5fa] bg-white shadow-xl shadow-[#20154f]/[0.06] sm:grid-cols-2 lg:grid-cols-4"
          data-aos="fade-up"
        >
          <div
            v-for="(highlight, index) in highlights"
            :key="highlight.title"
            class="flex items-start gap-4 border-b border-[#eeeaf8] p-5 last:border-b-0 sm:p-6 lg:border-b-0 lg:border-r lg:border-[#eeeaf8] lg:last:border-r-0"
            :class="{
              'sm:border-r sm:border-[#eeeaf8]': index % 2 === 0
            }"
          >
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0edff] text-lg text-[#39218f]"
            >
              <i :class="['fa-solid', highlight.icon]" />
            </div>

            <div class="min-w-0">
              <h3
                class="break-words text-sm font-bold leading-6 text-[#17143f] sm:text-base"
                :class="{ capitalize: highlight.capitalize }"
              >
                {{ highlight.title }}
              </h3>

              <p v-if="highlight.subtitle" class="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                {{ highlight.subtitle }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SECTION NAVIGATION
      =========================================== -->
      <!-- ==========================================
     SECTION TABS
=========================================== -->
      <nav v-if="visibleSections.length" class="mt-8 border-b border-[#eae6f6] bg-white">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide">
           <button
  v-for="section in visibleSections"
  :key="section.key"
  :id="`tab-${section.key}`"
  type="button"
  role="tab"
  :aria-selected="activeTab === section.key"
  :aria-controls="`panel-${section.key}`"
  class="relative flex shrink-0 items-center gap-2.5 whitespace-nowrap
         border-b-2 px-4 py-5 text-sm font-semibold transition-colors"
  :class="activeTab === section.key
    ? '!border-[#39218f] !text-[#39218f]'
    : 'border-transparent text-slate-500 hover:text-[#39218f]'"
  @click="activeTab = section.key"
>
  <i :class="['fa-solid', section.icon, 'text-base']" />
  {{ section.title }}
</button>
          </div>
        </div>
      </nav>

      <!-- ==========================================
           CONTENT + REGISTRATION SIDEBAR
      =========================================== -->
      <div
        class="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:px-12"
      >
        <!-- Main content -->
        <div class="min-w-0 lg:col-span-8">
          <section
            v-for="section in visibleSections"
            v-show="activeTab === section.key"
            :id="section.key"
            :key="section.key"
            :aria-labelledby="`tab-${section.key}`"
            role="tabpanel"
            :aria-controls="`tab-${section.key}`"
            class="rounded-2xl border border-[#e9e5fa] bg-white p-6 sm:p-8"
            data-aos="fade-up"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0edff] text-xl text-[#39218f]"
              >
                <i :class="['fa-solid', section.icon]" />
              </div>

              <div class="min-w-0 flex-1">
                <h2 class="text-xl font-bold tracking-tight text-[#17143f] sm:text-2xl">
                  {{ section.title }}
                </h2>

                <div
                  class="mt-4 whitespace-pre-line break-words text-sm leading-8 text-slate-600 sm:text-base"
                >
                  {{ sectionContent(section.key) }}
                </div>
              </div>
            </div>

            <div class="mt-8 border-b border-[#eae6f6]" />
          </section>

          <!-- Empty state -->
          <div
            v-if="!visibleSections.length"
            class="rounded-2xl border border-dashed border-[#d9d2f0] bg-white p-10 text-center"
          >
            <i class="fa-solid fa-book-open mb-4 text-3xl text-[#39218f]" />

            <h2 class="text-lg font-bold text-[#17143f]">Training details coming soon</h2>

            <p class="mt-2 text-sm text-slate-500">
              Additional information about this training will be available shortly.
            </p>
          </div>
        </div>

        <!-- Registration sidebar -->
        <aside class="lg:col-span-4">
          <div
            class="rounded-3xl border border-[#e9e5fa] bg-gradient-to-br from-[#f4f1ff] via-white to-[#f9f7ff] p-6 shadow-sm sm:p-8 lg:sticky lg:top-24"
            data-aos="fade-left"
          >
            <!-- Badge -->
            <div
              class="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
              :class="
                canRegister ? 'bg-emerald-100 text-emerald-700' : 'bg-[#e9e5fa] text-[#39218f]'
              "
            >
              <span
                class="h-2 w-2 rounded-full"
                :class="canRegister ? 'bg-emerald-500' : 'bg-[#7663c9]'"
              />

              {{
                canRegister
                  ? 'Registration is open!'
                  : soldOut
                    ? 'Fully booked'
                    : 'Registration is not open'
              }}
            </div>

            <h2 class="text-2xl font-extrabold text-[#17143f]">Training details</h2>

            <!-- Dates and seats -->
            <ul class="mt-6 space-y-4">
              <li class="flex items-start gap-3">
                <i class="fa-regular fa-calendar mt-0.5 text-lg text-[#5140b8]" />

                <div>
                  <p class="text-xs font-medium text-slate-500">Starts</p>

                  <p class="mt-1 text-sm font-semibold text-[#17143f]">
                    {{ formatDate(training.start_date) }}
                  </p>
                </div>
              </li>

              <li class="flex items-start gap-3">
                <i class="fa-regular fa-calendar-check mt-0.5 text-lg text-[#5140b8]" />

                <div>
                  <p class="text-xs font-medium text-slate-500">Ends</p>

                  <p class="mt-1 text-sm font-semibold text-[#17143f]">
                    {{ formatDate(training.end_date) }}
                  </p>
                </div>
              </li>

              <li v-if="seatsLeft !== null" class="flex items-start gap-3">
                <i class="fa-solid fa-users mt-0.5 text-lg text-[#5140b8]" />

                <div>
                  <p class="text-xs font-medium text-slate-500">Availability</p>

                  <p class="mt-1 text-sm font-semibold text-[#17143f]">
                    {{ soldOut ? 'No seats available' : `${seatsLeft} seats left` }}
                  </p>
                </div>
              </li>
            </ul>

            <div class="my-6 border-t border-[#e5dff6]" />

            <!-- Price -->
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registration fee
            </p>

            <div class="mt-2 flex flex-wrap items-baseline gap-2">
              <span class="text-3xl font-extrabold tracking-tight text-[#17143f] sm:text-4xl">
                {{ formatMoney(training.fee, training.currency) }}
              </span>
            </div>

            <p class="mt-1 text-sm text-slate-500">Per participant</p>

            <!-- Discounts -->
            <div v-if="discounts.length" class="mt-5 space-y-3">
              <div
                v-for="discount in discounts"
                :key="discount.id"
                class="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700"
              >
                <i class="fa-solid fa-tag mt-0.5" />

                <span>
                  {{ describe(discount) }} for {{ discount.min_participants }}+ participants
                </span>
              </div>
            </div>

            <!-- Register -->
            <router-link
              v-if="canRegister"
              :to="{
                name: 'training-register',
                params: {
                  orgSlug,
                  slug: training.slug
                }
              }"
              class="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#39218f] to-[#5140b8] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#39218f]/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#39218f]/20"
            >
              Register now
              <i class="fa-solid fa-arrow-right" />
            </router-link>

            <router-link
              v-else
              :to="{ name: 'home' }"
              class="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#e9e5fa] px-5 py-3 text-sm font-bold text-[#39218f] transition hover:bg-[#ded7f7]"
            >
              Explore other trainings
              <i class="fa-solid fa-arrow-right" />
            </router-link>

            <!-- Brochure -->
            <a
              v-if="training.brochure_url"
              :href="training.brochure_url"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d9d1f3] bg-white px-5 py-3 text-sm font-semibold text-[#39218f] transition hover:bg-[#f7f5ff]"
            >
              <i class="fa-regular fa-file-pdf text-lg" />
              Download brochure
            </a>

            <p class="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <i class="fa-solid fa-shield-halved mt-0.5 text-[#5140b8]" />

              Your registration details will be handled securely.
            </p>
          </div>
        </aside>
      </div>

      <!-- Bottom CTA -->
      <!-- <section
        v-if="canRegister"
        class="mx-5 mb-12 overflow-hidden rounded-3xl bg-gradient-to-r from-[#211653] via-[#39218f] to-[#5140b8] px-6 py-10 text-center text-white sm:mx-8 sm:px-10 lg:mx-auto lg:max-w-7xl"
      >
        <h2 class="text-2xl font-extrabold sm:text-3xl">
          Ready to take the next step?
        </h2>

        <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
          Secure your place in this training and start building practical skills.
        </p>

        <router-link
          :to="{
            name: 'training-register',
            params: {
              orgSlug,
              slug: training.slug,
            },
          }"
          class="mt-6 inline-flex items-center justify-center gap-3 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[#39218f] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f4f1ff]"
        >
          Register for this training
          <i class="fa-solid fa-arrow-right" />
        </router-link>
      </section> -->
    </article>
  </main>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

section[id] {
  scroll-margin-top: 100px;
}

@media (prefers-reduced-motion: reduce) {
  :deep(*) {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
