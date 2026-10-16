<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { TrainingsService, CategoriesService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { toLocalInput, toIsoOrNull } from '@/utils/format'
import AssetUploadField from './AssetUploadField.vue'
import type { Training, Category } from '@/types/traininghub'

const props = defineProps<{ organisationId: string; training?: Training | null }>()
const emit = defineEmits<{ (e: 'saved', t: Training): void }>()

const editing = computed(() => !!props.training)
const t = props.training
const form = reactive({
  title: t?.title ?? '', slug: t?.slug ?? '', category_id: (t?.category_id ?? null) as string | null,
  short_description: t?.short_description ?? '', overview: t?.overview ?? '', who_should_attend: t?.who_should_attend ?? '',
  learning_objectives: t?.learning_objectives ?? '', course_outline: t?.course_outline ?? '', requirements: t?.requirements ?? '',
  start_date: t?.start_date ?? '', end_date: t?.end_date ?? '',
  start_time: t?.start_time?.slice(0, 5) ?? '', end_time: t?.end_time?.slice(0, 5) ?? '',
  timezone: t?.timezone ?? 'Africa/Lagos', delivery_mode: t?.delivery_mode ?? 'virtual',
  location: t?.location ?? '', meeting_url: t?.meeting_url ?? '',
  fee: t?.fee ?? 0, currency: t?.currency ?? 'NGN', capacity: (t?.capacity ?? null) as number | null,
  registration_open_at: toLocalInput(t?.registration_open_at), registration_close_at: toLocalInput(t?.registration_close_at),
  featured: t?.featured ?? false, cover_image: (t?.cover_image ?? null) as string | null, brochure_url: (t?.brochure_url ?? null) as string | null,
})

const categories = ref<Category[]>([])
const { loading, error, run } = useAsyncAction()
const saved = ref(false)
onMounted(async () => { try { categories.value = await CategoriesService.list(props.organisationId) } catch { /* optional */ } })

const datesOk = computed(() => !form.start_date || !form.end_date || form.end_date >= form.start_date)
const valid = computed(() => !!form.title.trim() && Number(form.fee) >= 0 && datesOk.value && (!form.capacity || Number(form.capacity) > 0))
const req = (v: string) => !!v?.trim() || 'Required'
const s = (v?: string | null) => (v?.trim() ? v.trim() : null)

async function submit() {
  if (!valid.value) return
  const payload: Partial<Training> = {
    title: form.title.trim(), category_id: form.category_id,
    short_description: s(form.short_description), overview: s(form.overview), who_should_attend: s(form.who_should_attend),
    learning_objectives: s(form.learning_objectives), course_outline: s(form.course_outline), requirements: s(form.requirements),
    start_date: s(form.start_date), end_date: s(form.end_date), start_time: s(form.start_time), end_time: s(form.end_time),
    timezone: form.timezone, delivery_mode: form.delivery_mode, location: s(form.location), meeting_url: s(form.meeting_url),
    fee: Number(form.fee), currency: form.currency.trim() || 'NGN', capacity: form.capacity ? Number(form.capacity) : null,
    registration_open_at: toIsoOrNull(form.registration_open_at), registration_close_at: toIsoOrNull(form.registration_close_at),
    featured: form.featured, cover_image: form.cover_image, brochure_url: form.brochure_url,
  }
  if (!editing.value && s(form.slug)) payload.slug = s(form.slug)!   // blank -> generated server-side
  const res = await run(() => editing.value
    ? TrainingsService.update(props.training!.id, payload)
    : TrainingsService.create(props.organisationId, payload))
  if (res) { saved.value = true; emit('saved', res) }
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <v-alert v-if="error" type="error" variant="tonal">{{ error.message }}</v-alert>
    <v-alert v-if="editing && training!.status !== 'draft'" type="warning" variant="tonal" density="compact">
      This training is {{ training!.status.replace('_', ' ') }}. Changing the fee or dates affects people who already registered.
    </v-alert>

    <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 class="font-semibold mb-4"><i class="fa-solid fa-circle-info mr-2 text-primary"></i>Basics</h3>
      <div class="grid md:grid-cols-2 gap-4">
        <v-text-field v-model="form.title" label="Title" :rules="[req]" variant="outlined" density="comfortable" class="md:col-span-2" />
        <v-text-field v-model="form.slug" label="Slug" :disabled="editing" variant="outlined" density="comfortable"
          :hint="editing ? 'Fixed after creation so links keep working' : 'Leave blank to generate from the title'" persistent-hint />
        <v-select v-model="form.category_id" :items="categories" item-title="name" item-value="id" label="Category"
          clearable variant="outlined" density="comfortable" />
        <v-textarea v-model="form.short_description" label="Short description" rows="2" auto-grow variant="outlined" density="comfortable" class="md:col-span-2" />
      </div>
    </section>

    <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 class="font-semibold mb-4"><i class="fa-solid fa-align-left mr-2 text-primary"></i>Content</h3>
      <div class="grid gap-4">
        <v-textarea v-model="form.overview" label="Overview" rows="3" auto-grow variant="outlined" density="comfortable" />
        <v-textarea v-model="form.who_should_attend" label="Who should attend" rows="2" auto-grow variant="outlined" density="comfortable" />
        <v-textarea v-model="form.learning_objectives" label="Learning objectives" rows="3" auto-grow variant="outlined" density="comfortable" />
        <v-textarea v-model="form.course_outline" label="Course outline" rows="3" auto-grow variant="outlined" density="comfortable" />
        <v-textarea v-model="form.requirements" label="Requirements" rows="2" auto-grow variant="outlined" density="comfortable" />
      </div>
    </section>

    <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 class="font-semibold mb-4"><i class="fa-regular fa-calendar mr-2 text-primary"></i>Schedule &amp; delivery</h3>
      <div class="grid md:grid-cols-4 gap-4">
        <v-text-field v-model="form.start_date" type="date" label="Start date" variant="outlined" density="comfortable" />
        <v-text-field v-model="form.end_date" type="date" label="End date" variant="outlined" density="comfortable"
          :error-messages="datesOk ? '' : 'End must be on or after start'" />
        <v-text-field v-model="form.start_time" type="time" label="Start time" variant="outlined" density="comfortable" />
        <v-text-field v-model="form.end_time" type="time" label="End time" variant="outlined" density="comfortable" />
        <v-select v-model="form.delivery_mode" :items="['virtual', 'physical', 'hybrid']" label="Delivery" variant="outlined" density="comfortable" />
        <v-text-field v-model="form.location" label="Location" variant="outlined" density="comfortable"
          hint="Required to publish physical or hybrid trainings" persistent-hint class="md:col-span-3" />
        <v-text-field v-model="form.meeting_url" label="Meeting URL" variant="outlined" density="comfortable" class="md:col-span-2" />
        <v-text-field v-model="form.timezone" label="Timezone" variant="outlined" density="comfortable" class="md:col-span-2" />
      </div>
    </section>

    <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 class="font-semibold mb-4"><i class="fa-solid fa-tags mr-2 text-primary"></i>Pricing &amp; registration</h3>
      <div class="grid md:grid-cols-4 gap-4">
        <v-text-field v-model.number="form.fee" type="number" min="0" label="Fee per participant" variant="outlined" density="comfortable"
          :rules="[(v: number) => v >= 0 || 'Cannot be negative']" />
        <v-text-field v-model="form.currency" label="Currency" variant="outlined" density="comfortable" />
        <v-text-field v-model.number="form.capacity" type="number" min="1" label="Capacity" variant="outlined" density="comfortable"
          hint="Blank = unlimited" persistent-hint />
        <v-switch v-model="form.featured" label="Featured" color="primary" hide-details />
        <v-text-field v-model="form.registration_open_at" type="datetime-local" label="Registration opens (optional)" variant="outlined" density="comfortable" class="md:col-span-2" />
        <v-text-field v-model="form.registration_close_at" type="datetime-local" label="Registration closes (optional)" variant="outlined" density="comfortable" class="md:col-span-2" />
      </div>
    </section>

    <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 class="font-semibold mb-4"><i class="fa-regular fa-image mr-2 text-primary"></i>Media</h3>
      <div class="grid md:grid-cols-2 gap-4">
        <AssetUploadField v-model="form.cover_image" :organisation-id="organisationId" folder="covers" label="Cover image" image />
        <AssetUploadField v-model="form.brochure_url" :organisation-id="organisationId" folder="brochures" label="Brochure (PDF)" accept="application/pdf" />
      </div>
    </section>

    <div class="flex items-center gap-4">
      <v-btn type="submit" color="primary" size="large" :loading="loading" :disabled="!valid">
        <i class="fa-solid fa-floppy-disk mr-2"></i>{{ editing ? 'Save changes' : 'Create draft' }}
      </v-btn>
      <span v-if="saved && !error" class="text-green-600 text-sm"><i class="fa-solid fa-check mr-1"></i>Saved</span>
    </div>
  </form>
</template>
