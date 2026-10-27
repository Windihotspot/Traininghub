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
  <main class="th-page min-h-screen py-12 px-4">
    <div v-if="loading" class="text-center py-24" role="status" aria-label="Loading">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl" style="color: var(--th-purple)"></i>
    </div>

    <div v-else-if="error" class="alert alert-error max-w-3xl mx-auto" role="alert">
      <span class="alert-icon">!</span>
      <p>{{ error.message }}</p>
    </div>

    <div v-else-if="notFound" class="text-center py-24">
      <span class="section-icon mx-auto mb-5"><i class="fa-regular fa-face-frown"></i></span>
      <h1 class="page-title mb-2">Training not found</h1>
      <p class="muted mb-6">The link may be wrong, or the training was removed.</p>
      <router-link :to="{ name: 'home' }" class="primary-button">Back to home</router-link>
    </div>

    <template v-else-if="training">
      <header class="max-w-3xl mx-auto mb-8" data-aos="fade-down">
        <router-link :to="{ name: 'training-detail', params: { orgSlug, slug: training.slug } }" class="back-link">
          <i class="fa-solid fa-arrow-left mr-2"></i>Training details
        </router-link>
        <h1 class="page-title mt-3 mb-4">{{ training.title }}</h1>
        <div class="flex flex-wrap gap-2">
          <span class="meta-pill"><i class="fa-regular fa-calendar"></i>{{ formatDate(training.start_date) }} to {{ formatDate(training.end_date) }}</span>
          <span class="meta-pill capitalize"><i class="fa-solid fa-location-dot"></i>{{ training.delivery_mode }}<template v-if="training.location">, {{ training.location }}</template></span>
          <span class="meta-pill"><i class="fa-solid fa-tag"></i>{{ formatMoney(training.fee, training.currency) }} per participant</span>
        </div>
      </header>

      <RegistrationForm v-if="open" :training-id="training.id" :currency="training.currency" />
      <div v-else class="alert alert-info max-w-3xl mx-auto" role="status">
        <span class="alert-icon">i</span>
        <p>Registration for this training is not open.</p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.th-page {
  --th-purple: #29143d;
  --th-purple-2: #432465;
  --th-purple-3: #6b4a88;
  --th-muted: #81758f;
  --th-lilac: #f7f3fb;
  --th-gold: #f7c948;

  background: var(--th-lilac);
  color: #111014;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
}
.page-title { margin: 0; color: var(--th-purple); font: 800 30px/1.2 'Manrope', sans-serif; letter-spacing: -0.8px; }
.muted { color: var(--th-muted); font-size: 12px; }

.back-link { color: var(--th-muted); font-size: 12px; font-weight: 600; text-decoration: none; transition: color 0.2s; }
.back-link:hover { color: var(--th-purple); }

.meta-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px;
  border: 1px solid #eae3ef; border-radius: 999px; background: #fff;
  color: #30263a; font-size: 11px; font-weight: 600;
}
.meta-pill i { color: var(--th-purple-3); }

.section-icon {
  display: grid; place-items: center; width: 38px; height: 38px;
  border: 1px solid rgba(247, 201, 72, 0.28); border-radius: 11px;
  background: var(--th-purple); color: var(--th-gold); font-size: 14px;
}
.primary-button {
  min-height: 47px; display: inline-flex; align-items: center; justify-content: center;
  padding: 13px 20px; border-radius: 8px; background: var(--th-purple); color: #fff;
  font-size: 12px; font-weight: 700; text-decoration: none; transition: background 0.2s, transform 0.2s;
}
.primary-button:hover { transform: translateY(-1px); background: var(--th-purple-2); }

.alert { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border: 1px solid; border-radius: 9px; }
.alert p { margin: 1px 0 0; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.alert-icon { width: 19px; height: 19px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; font-size: 11px; font-weight: 800; }
.alert-error { border-color: #f0d2d2; background: #fff7f7; color: #a32e38; }
.alert-error .alert-icon { background: #ffe6e6; }
.alert-info { border-color: #d9d0e0; background: #fff; color: var(--th-purple-2); }
.alert-info .alert-icon { background: var(--th-lilac); }

@media (max-width: 600px) { .page-title { font-size: 24px; } }
</style>