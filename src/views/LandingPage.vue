<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { useRouter } from 'vue-router'

const router = useRouter()

const login = () => {
  router.push('/login')
}
const register = () => {
  router.push('/organisations/register')
}

/* ---------------------------------------------
   Helpers
--------------------------------------------- */
const naira = (n) => '₦' + Math.round(n).toLocaleString('en-NG')

function tweenTo(target, r, ms = 600) {
  const from = r.value
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min((now - start) / ms, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    r.value = from + (target - from) * eased
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function useInView(threshold = 0.3) {
  const el = ref(null)
  const seen = ref(false)
  onMounted(() => {
    if (!el.value) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          seen.value = true
          io.disconnect()
        }
      },
      { threshold }
    )
    io.observe(el.value)
  })
  return { el, seen }
}

/* ---------------------------------------------
   Dummy data — swap for real API/store data later
--------------------------------------------- */
const menuOpen = ref(false)

const navLinks = [
  { label: 'Trainings', href: '#trainings' },
  { label: 'How it works', href: '#journey' },
  { label: 'Organisations', href: '#organisations' },
  { label: 'FAQ', href: '#faq' },
]

const stats = [
  { label: 'Organisations onboarded', value: 18, prefix: '', suffix: '' },
  { label: 'Trainings published', value: 240, prefix: '', suffix: '+' },
  { label: 'Participants registered', value: 9600, prefix: '', suffix: '+' },
  { label: 'Fees collected (₦ millions)', value: 1200, prefix: '₦', suffix: 'M' },
]
const { el: statsEl, seen: statsSeen } = useInView(0.4)
const statCounts = reactive(stats.map(() => 0))
watch(statsSeen, (seen) => {
  if (!seen) return
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min((now - start) / 1400, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    stats.forEach((s, i) => (statCounts[i] = Math.round(s.value * eased)))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

/* ---- Hero: live registration demo ---- */
const FEE = 220000
const DISCOUNT_MIN = 4
const DISCOUNT_RATE = 0.1
const demoPeople = [
  { name: 'Adaeze Okafor', title: 'Risk Analyst' },
  { name: 'Tunde Bakare', title: 'Compliance Officer' },
  { name: 'Ngozi Eze', title: 'Portfolio Manager' },
  { name: 'Musa Ibrahim', title: 'Head of Treasury' },
]
const demo = reactive({ count: 0, status: 'Draft' })
const demoSubtotal = computed(() => demo.count * FEE)
const demoDiscount = computed(() => (demo.count >= DISCOUNT_MIN ? demoSubtotal.value * DISCOUNT_RATE : 0))
const demoTotal = computed(() => demoSubtotal.value - demoDiscount.value)
const shownTotal = ref(0)
watch(demoTotal, (v) => tweenTo(v, shownTotal))

const statusStyle = {
  Draft: 'bg-[#F1ECF7] text-[#6B5D7E]',
  Pending: 'bg-[#FFF3D6] text-[#9A6A00]',
  Paid: 'bg-[#DDF5E8] text-[#1D7A4D]',
}

let timers = []
const later = (fn, ms) => timers.push(setTimeout(fn, ms))
function runDemo() {
  demo.count = 0
  demo.status = 'Draft'
  demoPeople.forEach((_, i) => later(() => (demo.count = i + 1), 900 + i * 900))
  later(() => (demo.status = 'Pending'), 900 + demoPeople.length * 900 + 600)
  later(() => (demo.status = 'Paid'), 900 + demoPeople.length * 900 + 2400)
  later(runDemo, 900 + demoPeople.length * 900 + 6000)
}

/* ---- Audience tabs ---- */
const audiences = [
  {
    key: 'participants',
    label: 'Participants',
    icon: 'mdi-account-school-outline',
    headline: 'Find a training and register in minutes',
    copy: 'Search across organisations, compare dates and fees, and book for yourself or your whole team.',
    points: [
      'Search and filter by category, delivery mode, month and price',
      'Register as an individual or as a company with several participants',
      'Pay securely and receive a confirmation email straight away',
    ],
  },
  {
    key: 'organisations',
    label: 'Organisations',
    icon: 'mdi-domain',
    headline: 'Your own training portal, ready on day one',
    copy: 'Publish trainings, watch registrations arrive and hand the participant list to your team in one click.',
    points: [
      'Create, edit and publish trainings with structured details',
      'See who registered, who paid and who is still pending',
      'Export registrations to Excel or CSV, filtered by training',
    ],
  },
  {
    key: 'platform',
    label: 'Platform admins',
    icon: 'mdi-shield-crown-outline',
    headline: 'Oversee every organisation from one console',
    copy: 'Onboard new organisations, manage users and keep a clear view of trainings, registrations and payments.',
    points: [
      'Onboard organisations and assign owners, admins and staff',
      'Review payments across the whole platform',
      'Trace every sensitive action through the audit log',
    ],
  },
]
const activeAudience = ref('participants')
const currentAudience = computed(() => audiences.find((a) => a.key === activeAudience.value))

/* ---- Trainings ---- */
const categories = ['All', 'Finance', 'Risk', 'Compliance', 'Technology']
const activeCategory = ref('All')
const trainings = [
  { id: 1, org: 'NGX X-Academy', title: 'Investment & Portfolio Management Analysis', category: 'Finance', date: '6 – 7 Oct 2026', mode: 'Virtual', fee: 220000 },
  { id: 2, org: 'NGX X-Academy', title: 'Compliance & Enterprise Risk Management', category: 'Compliance', date: '13 – 14 Oct 2026', mode: 'Virtual', fee: 200000 },
  { id: 3, org: 'NGX X-Academy', title: 'Advanced Derivatives Contracts', category: 'Finance', date: '20 – 21 Oct 2026', mode: 'Physical', fee: 250000 },
  { id: 4, org: 'NGX X-Academy', title: 'Certificate in Ethical Artificial Intelligence', category: 'Technology', date: '27 – 28 Oct 2026', mode: 'Hybrid', fee: 180000 },
  { id: 5, org: 'NGX X-Academy', title: 'Operational & Investment Risk Management', category: 'Risk', date: '3 – 4 Nov 2026', mode: 'Virtual', fee: 210000 },
  { id: 6, org: 'NGX X-Academy', title: 'Fixed Income Valuation', category: 'Finance', date: '10 – 11 Nov 2026', mode: 'Physical', fee: 230000 },
]
const visibleTrainings = computed(() =>
  activeCategory.value === 'All' ? trainings : trainings.filter((t) => t.category === activeCategory.value)
)
const modeIcon = { Virtual: 'mdi-monitor', Physical: 'mdi-map-marker-outline', Hybrid: 'mdi-swap-horizontal' }

/* ---- Journey ---- */
const journey = [
  { icon: 'mdi-magnify', title: 'Find', copy: 'Search the catalogue and open the training page for dates, fees and what you will learn.' },
  { icon: 'mdi-account-multiple-plus-outline', title: 'Register', copy: 'Sign up as an individual, or add every colleague under one company registration.' },
  { icon: 'mdi-credit-card-check-outline', title: 'Pay', copy: 'Pay through the payment gateway. The platform confirms the payment itself, not the browser.' },
  { icon: 'mdi-email-check-outline', title: 'Get confirmed', copy: 'Participants receive a confirmation and the organisation sees the registration at once.' },
]
const { el: journeyEl, seen: journeySeen } = useInView(0.35)

/* ---- Discount calculator ---- */
const people = ref(4)
const calcSubtotal = computed(() => people.value * FEE)
const calcDiscount = computed(() => (people.value >= DISCOUNT_MIN ? calcSubtotal.value * DISCOUNT_RATE : 0))
const calcTotal = computed(() => calcSubtotal.value - calcDiscount.value)
const calcShown = ref(calcTotal.value)
watch(calcTotal, (v) => tweenTo(v, calcShown, 450))
const toGoal = computed(() => Math.max(DISCOUNT_MIN - people.value, 0))

/* ---- Organisation dashboard preview ---- */
const { el: dashEl, seen: dashSeen } = useInView(0.3)
const dashTiles = [
  { label: 'Trainings', value: '24', icon: 'mdi-school-outline' },
  { label: 'Registrations', value: '382', icon: 'mdi-clipboard-text-outline' },
  { label: 'Paid', value: '347', icon: 'mdi-check-decagram-outline' },
  { label: 'Pending', value: '35', icon: 'mdi-timer-sand' },
]
const revenueBars = [
  { month: 'Apr', h: 38 },
  { month: 'May', h: 52 },
  { month: 'Jun', h: 44 },
  { month: 'Jul', h: 68 },
  { month: 'Aug', h: 60 },
  { month: 'Sep', h: 92 },
]
const recentRegs = [
  { ref: 'REG-000123', company: 'ABC Limited', size: 4, amount: 792000, status: 'Paid' },
  { ref: 'REG-000124', company: 'Zenith Capital', size: 2, amount: 440000, status: 'Pending' },
  { ref: 'REG-000125', company: 'Individual', size: 1, amount: 220000, status: 'Paid' },
]

/* ---- Capabilities ---- */
const capabilities = [
  { icon: 'mdi-office-building-cog-outline', title: 'Built for many organisations', copy: 'Every record belongs to an organisation, so NGX is the first tenant and others can join without a rebuild.' },
  { icon: 'mdi-account-group-outline', title: 'Individual and company bookings', copy: 'One registration can hold one person or a whole team, with the corporate discount worked out for you.' },
  { icon: 'mdi-shield-check-outline', title: 'Payments you can trust', copy: 'A payment is only marked paid after the backend verifies it with the provider, never from a browser redirect.' },
  { icon: 'mdi-file-excel-outline', title: 'Export in one click', copy: 'Download participant lists as Excel or CSV, filtered by training, payment status or company.' },
  { icon: 'mdi-key-chain-variant', title: 'Roles and permissions', copy: 'Owners, admins and staff each see only what they should, and never another organisation’s data.' },
  { icon: 'mdi-text-box-search-outline', title: 'Audit trail', copy: 'Publishing, edits, refunds and exports are recorded, so you can answer who did what and when.' },
]

/* ---- FAQ ---- */
const faqs = [
  { q: 'Can my organisation use the platform as well as NGX?', a: 'Yes. The platform is multi-organisation from the start. Each organisation has its own dashboard, trainings, users and registrations, kept separate from everyone else.' },
  { q: 'How does the corporate discount work?', a: 'The organisation sets the minimum number of participants and the discount, as a percentage or a fixed amount. The total updates automatically as people are added to a registration.' },
  { q: 'How do I know a payment went through?', a: 'The payment provider notifies our backend, which verifies the transaction before the registration moves from Pending to Paid. You then receive a confirmation email.' },
  { q: 'Can we get a list of everyone who registered?', a: 'Yes. Open Registrations, filter by training, payment status or company, and export the list to Excel or CSV.' },
  { q: 'Do you support virtual and in-person trainings?', a: 'Every training is Virtual, Physical or Hybrid, with its own date, time, location and capacity.' },
]
const openFaq = ref(0)

const footerLinks = {
  Platform: ['Browse trainings', 'Organisations', 'How it works', 'Pricing'],
  Organisations: ['Publish a training', 'Manage registrations', 'Export reports', 'Onboard your team'],
  Support: ['Help centre', 'Contact us', 'Terms of service', 'Privacy policy'],
}
const email = ref('')

onMounted(() => {
  AOS.init({ duration: 700, once: true, easing: 'ease-out-cubic', offset: 60 })
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    demo.count = demoPeople.length
    demo.status = 'Paid'
    shownTotal.value = demoTotal.value
  } else {
    runDemo()
  }
})
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="tp-shell w-full bg-white text-[#25133B]">
    <!-- ============ NAVBAR ============ -->
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#ECE4F4]">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <a href="#" class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-lg bg-[#25133B] flex items-center justify-center">
            <i class="mdi mdi-school-outline text-[#F2B84B] text-[18px]"></i>
          </div>
          <span class="tp-heading text-[17px] font-bold">TrainHub</span>
        </a>

        <nav class="hidden md:flex items-center gap-8 text-[14px] text-[#6B5D7E]">
          <a v-for="l in navLinks" :key="l.label" :href="l.href" class="hover:text-[#25133B] transition-colors">{{ l.label }}</a>
        </nav>

        <div class="flex items-center gap-3">
          <button @click="login" class="hidden sm:block text-[14px] font-medium text-[#6B5D7E] hover:text-[#25133B] px-3 py-2">Log in</button>
          <button @click="register" class="hidden sm:block bg-[#25133B] hover:bg-[#331B52] transition-colors text-white text-[14px] font-semibold px-4 py-2.5 rounded-full">
            Register your organisation
          </button>
          <button
            class="md:hidden h-10 w-10 flex items-center justify-center rounded-full hover:bg-[#F7F3FB]"
            :aria-expanded="menuOpen"
            aria-label="Toggle menu"
            @click="menuOpen = !menuOpen"
          >
            <i class="mdi text-[22px]" :class="menuOpen ? 'mdi-close' : 'mdi-menu'"></i>
          </button>
        </div>
      </div>
      <div v-if="menuOpen" class="md:hidden border-t border-[#ECE4F4] bg-white px-6 py-4 flex flex-col gap-4 text-[15px]">
        <a v-for="l in navLinks" :key="l.label" :href="l.href" @click="menuOpen = false">{{ l.label }}</a>
        <button @click="register" class="bg-[#25133B] text-white text-[14px] font-semibold px-4 py-3 rounded-full">Register your organisation</button>
      </div>
    </header>

    <!-- ============ HERO ============ -->
    <section class="relative overflow-hidden">
      <div
        class="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl"
        style="background: radial-gradient(circle, #CBB6E8 0%, transparent 70%);"
      ></div>

      <div class="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 items-center relative">
        <div data-aos="fade-right">
          <h1 class="tp-heading text-[38px] sm:text-[48px] lg:text-[56px] font-bold leading-[1.05] mb-5">
            Professional training, from listing to payment.
          </h1>
          <p class="text-[16px] lg:text-[17px] text-[#6B5D7E] leading-relaxed mb-8 max-w-md">
            Organisations publish trainings and manage who signed up. Participants and companies find a course,
            register and pay, all in one place. NGX X-Academy is already running on it.
          </p>
          <div class="flex flex-wrap items-center gap-4">
              <button @click="register" class="hidden sm:block bg-[#25133B] hover:bg-[#331B52] transition-colors text-white text-[14px] font-semibold px-4 py-2.5 rounded-full">
            Register your organisation
          </button>
          </div>
        </div>

        <!-- live registration demo -->
        <div data-aos="fade-left" data-aos-delay="150" class="relative">
          <div class="rounded-[32px] p-5 sm:p-8" style="background: radial-gradient(circle at 80% 10%, #4A2A75 0%, #25133B 65%);">
            <div class="flex items-center justify-between mb-4 text-white">
              <span class="flex items-center gap-2 text-[12.5px] font-medium">
                <span class="relative flex h-2.5 w-2.5">
                  <span class="tp-ping absolute inline-flex h-full w-full rounded-full bg-[#F2B84B] opacity-75"></span>
                  <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#F2B84B]"></span>
                </span>
                Live registration
              </span>
              <span class="text-[12px] text-[#CBB6E8]">NGX X-Academy</span>
            </div>

            <div class="bg-white rounded-2xl shadow-xl p-5">
              <div class="flex items-start justify-between gap-3 mb-4">
                <div class="min-w-0">
                  <p class="text-[12px] text-[#9A8EAD]">REG-000123 for ABC Limited</p>
                  <p class="text-[14.5px] font-semibold leading-snug">Investment & Portfolio Management Analysis</p>
                  <p class="text-[12px] text-[#6B5D7E] mt-0.5">6 – 7 Oct 2026, Virtual</p>
                </div>
                <span class="shrink-0 text-[11.5px] font-semibold rounded-full px-3 py-1 transition-colors duration-300" :class="statusStyle[demo.status]">
                  {{ demo.status }}
                </span>
              </div>

              <div class="min-h-[184px] border-t border-[#ECE4F4] pt-3">
                <p v-if="demo.count === 0" class="text-[13px] text-[#9A8EAD] py-8 text-center">Add participants to this registration</p>
                <TransitionGroup name="tp-slide" tag="ul" class="flex flex-col gap-2">
                  <li v-for="(p, i) in demoPeople.slice(0, demo.count)" :key="p.name" class="flex items-center gap-3">
                    <div class="h-8 w-8 rounded-full bg-[#F1ECF7] text-[#25133B] text-[11px] font-semibold flex items-center justify-center">
                      {{ p.name.split(' ').map((n) => n[0]).join('') }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-[13px] font-medium truncate">{{ p.name }}</p>
                      <p class="text-[11.5px] text-[#9A8EAD] truncate">{{ p.title }}</p>
                    </div>
                    <span class="text-[12px] text-[#6B5D7E]">{{ naira(FEE) }}</span>
                  </li>
                </TransitionGroup>
              </div>

              <div class="border-t border-[#ECE4F4] pt-3 mt-1 text-[13px] flex flex-col gap-1.5">
                <div class="flex justify-between text-[#6B5D7E]"><span>Subtotal</span><span>{{ naira(demoSubtotal) }}</span></div>
                <div class="flex justify-between h-5 transition-opacity duration-300" :class="demoDiscount ? 'opacity-100 text-[#9A6A00] font-medium' : 'opacity-0'">
                  <span>Corporate discount (10%)</span><span>-{{ naira(demoDiscount) }}</span>
                </div>
                <div class="flex justify-between items-baseline pt-1">
                  <span class="font-semibold">Total</span>
                  <span class="tp-heading text-[22px] font-bold">{{ naira(shownTotal) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ STATS STRIP ============ -->
    <section ref="statsEl" class="border-y border-[#ECE4F4] bg-[#F7F3FB]">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
        <div v-for="(s, i) in stats" :key="s.label" data-aos="zoom-in" :data-aos-delay="i * 100" class="text-center lg:text-left">
          <p class="tp-heading text-[28px] lg:text-[32px] font-bold">
            {{ s.prefix }}{{ statCounts[i].toLocaleString('en-NG') }}{{ s.suffix }}
          </p>
          <p class="text-[13px] text-[#6B5D7E]">{{ s.label }}</p>
        </div>
      </div>
    </section>

    <!-- ============ AUDIENCES ============ -->
    <section id="organisations" class="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <div class="text-center max-w-xl mx-auto mb-10" data-aos="fade-up">
        <h2 class="tp-heading text-[30px] lg:text-[36px] font-bold mb-3">One platform, three workspaces</h2>
        <p class="text-[15px] text-[#6B5D7E] leading-relaxed">
          Everyone gets a view built for what they need to do.
        </p>
      </div>

      <div class="flex justify-center mb-10" data-aos="fade-up" data-aos-delay="100">
        <div class="inline-flex flex-wrap justify-center gap-1 p-1 rounded-full bg-[#F7F3FB] border border-[#ECE4F4]" role="tablist">
          <button
            v-for="a in audiences"
            :key="a.key"
            role="tab"
            :aria-selected="activeAudience === a.key"
            class="flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-full transition-colors"
            :class="activeAudience === a.key ? 'bg-[#25133B] text-white' : 'text-[#6B5D7E] hover:text-[#25133B]'"
            @click="activeAudience = a.key"
          >
            <i class="mdi text-[18px]" :class="a.icon"></i>
            {{ a.label }}
          </button>
        </div>
      </div>

      <Transition name="tp-fade" mode="out-in">
        <div :key="currentAudience.key" class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-5xl mx-auto">
          <div>
            <h3 class="tp-heading text-[26px] lg:text-[30px] font-bold leading-tight mb-3">{{ currentAudience.headline }}</h3>
            <p class="text-[15px] text-[#6B5D7E] leading-relaxed">{{ currentAudience.copy }}</p>
          </div>
          <ul class="flex flex-col gap-4">
            <li
              v-for="pt in currentAudience.points"
              :key="pt"
              class="flex items-start gap-3 rounded-2xl border border-[#ECE4F4] p-4"
            >
              <i class="mdi mdi-check-circle text-[20px] text-[#7B4FB8] shrink-0"></i>
              <span class="text-[14px] leading-relaxed">{{ pt }}</span>
            </li>
          </ul>
        </div>
      </Transition>
    </section>

    <!-- ============ TRAININGS ============ -->
    <section id="trainings" class="bg-[#F7F3FB] py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-6 lg:px-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10" data-aos="fade-up">
          <div>
            <h2 class="tp-heading text-[30px] lg:text-[36px] font-bold mb-2">Upcoming trainings</h2>
            <p class="text-[15px] text-[#6B5D7E]">A sample of what NGX X-Academy has open for registration.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in categories"
              :key="c"
              class="text-[13px] font-medium px-4 py-2 rounded-full border transition-colors"
              :class="activeCategory === c ? 'bg-[#25133B] border-[#25133B] text-white' : 'bg-white border-[#DDD0EC] text-[#6B5D7E] hover:border-[#25133B]'"
              @click="activeCategory = c"
            >
              {{ c }}
            </button>
          </div>
        </div>

        <TransitionGroup name="tp-card" tag="div" class="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <article
            v-for="t in visibleTrainings"
            :key="t.id"
            class="bg-white rounded-2xl border border-[#ECE4F4] p-5 flex flex-col hover:shadow-lg hover:shadow-[#25133B]/10 transition-shadow"
          >
            <div class="flex items-center justify-between mb-4">
              <span class="text-[12px] font-medium text-[#25133B] bg-[#F1ECF7] rounded-full px-3 py-1">{{ t.category }}</span>
              <span class="flex items-center gap-1 text-[12px] text-[#6B5D7E]">
                <i class="mdi text-[15px]" :class="modeIcon[t.mode]"></i>{{ t.mode }}
              </span>
            </div>
            <p class="text-[12px] text-[#9A8EAD] mb-1">{{ t.org }}</p>
            <h3 class="text-[16px] font-semibold leading-snug mb-4 flex-1">{{ t.title }}</h3>
            <p class="flex items-center gap-1.5 text-[13px] text-[#6B5D7E] mb-4">
              <i class="mdi mdi-calendar-blank-outline text-[16px]"></i>{{ t.date }}
            </p>
            <div class="flex items-center justify-between pt-4 border-t border-[#ECE4F4]">
              <p class="text-[15px] font-bold">{{ naira(t.fee) }}<span class="text-[12px] font-normal text-[#9A8EAD]"> / participant</span></p>
              <button class="text-[13px] font-semibold bg-[#25133B] hover:bg-[#331B52] transition-colors text-white rounded-full px-4 py-2">
                View training
              </button>
            </div>
          </article>
        </TransitionGroup>
      </div>
    </section>

    <!-- ============ JOURNEY ============ -->
    <section id="journey" ref="journeyEl" class="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <div class="text-center max-w-xl mx-auto mb-16" data-aos="fade-up">
        <h2 class="tp-heading text-[30px] lg:text-[36px] font-bold mb-3">From search to confirmation</h2>
        <p class="text-[15px] text-[#6B5D7E] leading-relaxed">Four steps, and the organisation sees the result the moment it happens.</p>
      </div>

      <div class="relative">
        <div class="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-[#ECE4F4]">
          <div class="h-full bg-[#7B4FB8] transition-[width] duration-[1600ms] ease-out" :style="{ width: journeySeen ? '100%' : '0%' }"></div>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
          <div v-for="(s, i) in journey" :key="s.title" data-aos="zoom-in" :data-aos-delay="i * 150" class="relative text-center">
            <div class="relative mx-auto h-14 w-14 rounded-2xl bg-[#25133B] flex items-center justify-center mb-5 ring-8 ring-white">
              <i class="mdi text-[#F2B84B] text-[26px]" :class="s.icon"></i>
              <span class="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-[#DDD0EC] text-[11px] font-bold flex items-center justify-center">{{ i + 1 }}</span>
            </div>
            <p class="text-[16px] font-semibold mb-1">{{ s.title }}</p>
            <p class="text-[13.5px] text-[#6B5D7E] leading-relaxed max-w-[15rem] mx-auto">{{ s.copy }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ DISCOUNT CALCULATOR ============ -->
    <section class="bg-[#25133B] py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div data-aos="fade-right">
          <h2 class="tp-heading text-[30px] lg:text-[36px] font-bold text-white mb-4">Book for the whole team in one go</h2>
          <p class="text-[15px] text-[#CBB6E8] leading-relaxed max-w-md">
            Corporate registration is built in. Add everyone under one company, and the organisation’s discount applies on its own.
            The threshold and the rate are set by each organisation, never hard-coded.
          </p>
        </div>

        <div data-aos="fade-left" data-aos-delay="150" class="rounded-3xl bg-white p-7 lg:p-8">
          <div class="flex items-center justify-between mb-2">
            <label for="people" class="text-[14px] font-semibold">Participants</label>
            <span class="tp-heading text-[26px] font-bold">{{ people }}</span>
          </div>
          <input id="people" v-model.number="people" type="range" min="1" max="15" class="w-full accent-[#25133B] mb-2" />
          <p class="text-[13px] h-5 mb-5" :class="toGoal ? 'text-[#6B5D7E]' : 'text-[#1D7A4D] font-medium'">
            {{ toGoal ? `Add ${toGoal} more to unlock the corporate discount` : 'Corporate discount unlocked' }}
          </p>

          <div class="flex flex-col gap-2 text-[14px] border-t border-[#ECE4F4] pt-4">
            <div class="flex justify-between text-[#6B5D7E]"><span>{{ people }} × {{ naira(FEE) }}</span><span>{{ naira(calcSubtotal) }}</span></div>
            <div class="flex justify-between h-5 transition-opacity duration-300" :class="calcDiscount ? 'opacity-100 text-[#9A6A00] font-medium' : 'opacity-0'">
              <span>Discount (10%)</span><span>-{{ naira(calcDiscount) }}</span>
            </div>
            <div class="flex justify-between items-baseline pt-3 border-t border-[#ECE4F4] mt-1">
              <span class="font-semibold">Total</span>
              <span class="tp-heading text-[30px] font-bold">{{ naira(calcShown) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ ORGANISATION DASHBOARD ============ -->
    <section ref="dashEl" class="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <div class="text-center max-w-xl mx-auto mb-12" data-aos="fade-up">
        <h2 class="tp-heading text-[30px] lg:text-[36px] font-bold mb-3">See who registered, instantly</h2>
        <p class="text-[15px] text-[#6B5D7E] leading-relaxed">
          The organisation dashboard tracks registrations, payments and revenue, and exports the list whenever you need it.
        </p>
      </div>

      <div data-aos="zoom-in" class="rounded-3xl border border-[#ECE4F4] shadow-2xl shadow-[#25133B]/10 overflow-hidden bg-white">
        <div class="flex items-center gap-2 px-5 py-3 bg-[#F7F3FB] border-b border-[#ECE4F4]">
          <span class="h-2.5 w-2.5 rounded-full bg-[#DDD0EC]"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-[#DDD0EC]"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-[#DDD0EC]"></span>
          <span class="ml-3 text-[12px] text-[#9A8EAD] truncate">trainhub.app/dashboard</span>
        </div>

        <div class="p-5 lg:p-8">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div v-for="t in dashTiles" :key="t.label" class="rounded-2xl bg-[#F7F3FB] p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[12.5px] text-[#6B5D7E]">{{ t.label }}</span>
                <i class="mdi text-[18px] text-[#7B4FB8]" :class="t.icon"></i>
              </div>
              <p class="tp-heading text-[26px] font-bold">{{ t.value }}</p>
            </div>
          </div>

          <div class="grid lg:grid-cols-5 gap-6">
            <div class="lg:col-span-2 rounded-2xl border border-[#ECE4F4] p-5">
              <p class="text-[13.5px] font-semibold mb-1">Revenue</p>
              <p class="text-[12px] text-[#9A8EAD] mb-5">Last six months</p>
              <div class="flex items-end justify-between gap-3 h-40">
                <div v-for="(b, i) in revenueBars" :key="b.month" class="flex-1 flex flex-col items-center justify-end h-full gap-2">
                  <div
                    class="w-full rounded-t-lg bg-[#25133B] transition-[height] duration-[900ms] ease-out"
                    :class="i === revenueBars.length - 1 ? 'bg-[#7B4FB8]' : ''"
                    :style="{ height: dashSeen ? b.h + '%' : '0%', transitionDelay: i * 120 + 'ms' }"
                  ></div>
                  <span class="text-[11px] text-[#9A8EAD]">{{ b.month }}</span>
                </div>
              </div>
            </div>

            <div class="lg:col-span-3 rounded-2xl border border-[#ECE4F4] p-5">
              <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p class="text-[13.5px] font-semibold">Recent registrations</p>
                <div class="flex gap-2">
                  <button class="flex items-center gap-1.5 text-[12px] font-semibold border border-[#DDD0EC] hover:border-[#25133B] rounded-full px-3 py-1.5 transition-colors">
                    <i class="mdi mdi-file-excel-outline text-[15px]"></i>Export Excel
                  </button>
                  <button class="flex items-center gap-1.5 text-[12px] font-semibold border border-[#DDD0EC] hover:border-[#25133B] rounded-full px-3 py-1.5 transition-colors">
                    <i class="mdi mdi-file-delimited-outline text-[15px]"></i>CSV
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-[13px] min-w-[420px]">
                  <thead>
                    <tr class="text-left text-[#9A8EAD] text-[12px]">
                      <th class="font-medium pb-2">Reference</th>
                      <th class="font-medium pb-2">Company</th>
                      <th class="font-medium pb-2">People</th>
                      <th class="font-medium pb-2">Amount</th>
                      <th class="font-medium pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(r, i) in recentRegs"
                      :key="r.ref"
                      class="border-t border-[#ECE4F4] transition-all duration-700"
                      :class="dashSeen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'"
                      :style="{ transitionDelay: 500 + i * 200 + 'ms' }"
                    >
                      <td class="py-3 font-medium">{{ r.ref }}</td>
                      <td class="py-3">{{ r.company }}</td>
                      <td class="py-3">{{ r.size }}</td>
                      <td class="py-3">{{ naira(r.amount) }}</td>
                      <td class="py-3">
                        <span class="text-[11.5px] font-semibold rounded-full px-2.5 py-1" :class="statusStyle[r.status]">{{ r.status }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ CAPABILITIES ============ -->
    <section class="bg-[#F7F3FB] py-20 lg:py-28">
      <div class="max-w-7xl mx-auto px-6 lg:px-10">
        <div class="text-center max-w-xl mx-auto mb-14" data-aos="fade-up">
          <h2 class="tp-heading text-[30px] lg:text-[36px] font-bold mb-3">Everything a training business needs</h2>
          <p class="text-[15px] text-[#6B5D7E] leading-relaxed">The details that save you work later are already handled.</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(c, i) in capabilities"
            :key="c.title"
            data-aos="flip-up"
            :data-aos-delay="(i % 3) * 100"
            class="bg-white rounded-2xl border border-[#ECE4F4] p-6 hover:border-[#7B4FB8] transition-colors"
          >
            <div class="h-11 w-11 rounded-xl bg-[#F1ECF7] flex items-center justify-center mb-4">
              <i class="mdi text-[#25133B] text-[22px]" :class="c.icon"></i>
            </div>
            <p class="text-[15.5px] font-semibold mb-1.5">{{ c.title }}</p>
            <p class="text-[13.5px] text-[#6B5D7E] leading-relaxed">{{ c.copy }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ FAQ ============ -->
    <section id="faq" class="max-w-3xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <div class="text-center mb-12" data-aos="fade-up">
        <h2 class="tp-heading text-[30px] lg:text-[36px] font-bold">Questions, answered</h2>
      </div>

      <div class="flex flex-col gap-3">
        <div
          v-for="(f, i) in faqs"
          :key="f.q"
          data-aos="fade-up"
          :data-aos-delay="i * 60"
          class="rounded-2xl border transition-colors"
          :class="openFaq === i ? 'border-[#7B4FB8] bg-[#F7F3FB]' : 'border-[#ECE4F4]'"
        >
          <button
            class="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
            :aria-expanded="openFaq === i"
            @click="openFaq = openFaq === i ? -1 : i"
          >
            <span class="text-[15px] font-semibold">{{ f.q }}</span>
            <i class="mdi mdi-chevron-down text-[22px] shrink-0 transition-transform duration-300" :class="openFaq === i ? 'rotate-180' : ''"></i>
          </button>
          <div class="grid transition-[grid-template-rows] duration-300" :class="openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
            <div class="overflow-hidden">
              <p class="px-5 pb-5 text-[14px] text-[#6B5D7E] leading-relaxed">{{ f.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ CTA BANNER ============ -->
    <section class="max-w-7xl mx-auto px-6 lg:px-10 pb-20 lg:pb-28">
      <div data-aos="zoom-in" class="relative overflow-hidden rounded-[32px] bg-[#25133B] px-8 py-14 lg:py-16 text-center">
        <div class="absolute inset-0 opacity-90" style="background: radial-gradient(circle at 20% 20%, #4A2A75 0%, #25133B 65%);"></div>
        <div class="relative z-10 max-w-lg mx-auto">
          <h2 class="tp-heading text-white text-[28px] lg:text-[34px] font-bold mb-4">
            Ready to fill your next training?
          </h2>
          <p class="text-[#CBB6E8] text-[15px] mb-8">
            Set up your organisation, publish your first training and start taking registrations.
          </p>
          <div class="flex flex-wrap justify-center gap-4">
            <button @click="register" class="bg-[#F2B84B] hover:bg-[#E5A92F] transition-colors text-[#25133B] text-[15px] font-semibold px-6 py-3 rounded-full">
              Register your organisation
            </button>
           
          </div>
        </div>
      </div>
    </section>

    <!-- ============ FOOTER ============ -->
    <footer class="border-t border-[#ECE4F4]">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
        <div class="lg:col-span-2">
          <div class="flex items-center gap-2 mb-4">
            <div class="h-8 w-8 rounded-lg bg-[#25133B] flex items-center justify-center">
              <i class="mdi mdi-school-outline text-[#F2B84B] text-[18px]"></i>
            </div>
            <span class="tp-heading text-[16px] font-bold">TrainHub</span>
          </div>
          <p class="text-[13.5px] text-[#6B5D7E] leading-relaxed mb-5 max-w-xs">
            A platform for organisations to publish, manage and charge for professional trainings, and for people to find and book them.
          </p>
          <div class="flex items-center gap-3">
            <a href="#" aria-label="LinkedIn" class="h-9 w-9 rounded-full bg-[#F7F3FB] flex items-center justify-center text-[#6B5D7E] hover:text-[#25133B]">
              <i class="fa-brands fa-linkedin-in"></i>
            </a>
            <a href="#" aria-label="X" class="h-9 w-9 rounded-full bg-[#F7F3FB] flex items-center justify-center text-[#6B5D7E] hover:text-[#25133B]">
              <i class="fa-brands fa-x-twitter"></i>
            </a>
            <a href="#" aria-label="Instagram" class="h-9 w-9 rounded-full bg-[#F7F3FB] flex items-center justify-center text-[#6B5D7E] hover:text-[#25133B]">
              <i class="fa-brands fa-instagram"></i>
            </a>
          </div>
        </div>

        <div v-for="(links, section) in footerLinks" :key="section">
          <p class="text-[13px] font-semibold mb-4">{{ section }}</p>
          <ul class="flex flex-col gap-3">
            <li v-for="link in links" :key="link">
              <a href="#" class="text-[13.5px] text-[#6B5D7E] hover:text-[#25133B]">{{ link }}</a>
            </li>
          </ul>
        </div>

        <div>
          <p class="text-[13px] font-semibold mb-4">Get new trainings by email</p>
          <p class="text-[13px] text-[#6B5D7E] mb-3">One short email when new trainings open.</p>
          <div class="flex items-center gap-2">
            <input
              v-model="email"
              type="email"
              placeholder="you@email.com"
              aria-label="Email address"
              class="min-w-0 flex-1 bg-[#F7F3FB] rounded-full px-4 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#25133B]/30"
            />
            <button aria-label="Subscribe" class="h-10 w-10 shrink-0 rounded-full bg-[#25133B] hover:bg-[#331B52] flex items-center justify-center text-white">
              <i class="mdi mdi-arrow-right text-[18px]"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="border-t border-[#ECE4F4]">
        <div class="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p class="text-[12.5px] text-[#9A8EAD]">© 2026 TrainHub. All rights reserved.</p>
          <p class="text-[12.5px] text-[#9A8EAD]">Payments powered by Quidly.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Figtree:wght@400;500;600&display=swap');

.tp-shell {
  font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif;
}

.tp-heading {
  font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.015em;
}

/* live dot */
.tp-ping {
  animation: tp-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes tp-ping {
  75%,
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* participants appearing in the hero card */
.tp-slide-enter-active {
  transition: all 0.45s ease;
}
.tp-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.tp-slide-leave-active {
  display: none;
}

/* audience tab content */
.tp-fade-enter-active,
.tp-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.tp-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.tp-fade-leave-to {
  opacity: 0;
}

/* training filter */
.tp-card-move,
.tp-card-enter-active,
.tp-card-leave-active {
  transition: all 0.4s ease;
}
.tp-card-enter-from,
.tp-card-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.tp-card-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .tp-ping {
    animation: none;
  }
  .tp-slide-enter-active,
  .tp-fade-enter-active,
  .tp-fade-leave-active,
  .tp-card-move,
  .tp-card-enter-active,
  .tp-card-leave-active {
    transition: none;
  }
}
</style>