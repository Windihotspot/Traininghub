<script setup lang="ts">
import { reactive } from 'vue'
import { OrganisationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { CreateOrganisationPayload } from '@/types/traininghub'

const emit = defineEmits<{ (e: 'created', org: { id: string; name: string; slug: string }): void }>()
const empty = () => ({ name: '', slug: '', description: '', contact_email: '', owner_email: '', owner_name: '' })
const form = reactive(empty())
const { loading, error, run } = useAsyncAction()
const req = (v: string) => !!v?.trim() || 'Required'

async function submit() {
  const payload = Object.fromEntries(
    Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)) as unknown as CreateOrganisationPayload
  const res = await run(() => OrganisationsService.create(payload))
  if (res) { emit('created', res.organisation); Object.assign(form, empty()) }
}
</script>

<template>
  <form class="grid md:grid-cols-2 gap-4" @submit.prevent="submit">
    <v-alert v-if="error" type="error" variant="tonal" class="md:col-span-2">{{ error.message }}</v-alert>
    <v-text-field v-model="form.name" label="Organisation name" :rules="[req]" variant="outlined" density="comfortable" />
    <v-text-field v-model="form.slug" label="Slug (optional)" variant="outlined" density="comfortable" />
    <v-text-field v-model="form.owner_name" label="Owner name" variant="outlined" density="comfortable" />
    <v-text-field v-model="form.owner_email" label="Owner email" type="email" :rules="[req]" variant="outlined" density="comfortable" />
    <v-text-field v-model="form.contact_email" label="Contact email (defaults to owner)" variant="outlined" density="comfortable" />
    <v-textarea v-model="form.description" label="Description" rows="2" variant="outlined" density="comfortable" />
    <v-btn type="submit" color="primary" :loading="loading" :disabled="!form.name || !form.owner_email" class="md:col-span-2">
      <i class="fa-solid fa-building mr-2"></i>Create organisation
    </v-btn>
  </form>
</template>
