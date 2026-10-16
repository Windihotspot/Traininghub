<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { OrganisationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AssetUploadField from './AssetUploadField.vue'

const props = defineProps<{ organisationId: string }>()
const form = reactive({ name: '', description: '', website: '', contact_email: '', contact_phone: '', logo_url: null as string | null })
const saved = ref(false)
const { loading, error, run } = useAsyncAction()

watch(() => props.organisationId, (id) => run(async () => {
  const o = await OrganisationsService.get(id)
  if (o) Object.assign(form, { name: o.name, description: o.description ?? '', website: o.website ?? '',
    contact_email: o.contact_email ?? '', contact_phone: o.contact_phone ?? '', logo_url: o.logo_url })
}), { immediate: true })

const n = (v: string) => v.trim() || null
async function save() {
  saved.value = false
  const ok = await run(async () => {
    await OrganisationsService.updateProfile(props.organisationId, {
      name: form.name.trim(), description: n(form.description), website: n(form.website),
      contact_email: n(form.contact_email), contact_phone: n(form.contact_phone), logo_url: form.logo_url })
    return true
  })
  saved.value = !!ok
}
</script>

<template>
  <form class="grid md:grid-cols-2 gap-4" @submit.prevent="save">
    <v-alert v-if="error" type="error" variant="tonal" class="md:col-span-2">{{ error.message }}</v-alert>
    <v-text-field v-model="form.name" label="Name" :rules="[(v: string) => !!v.trim() || 'Required']" variant="outlined" density="comfortable" />
    <v-text-field v-model="form.website" label="Website" variant="outlined" density="comfortable" />
    <v-text-field v-model="form.contact_email" label="Contact email" type="email" variant="outlined" density="comfortable" />
    <v-text-field v-model="form.contact_phone" label="Contact phone" variant="outlined" density="comfortable" />
    <v-textarea v-model="form.description" label="Description" rows="2" auto-grow variant="outlined" density="comfortable" class="md:col-span-2" />
    <AssetUploadField v-model="form.logo_url" :organisation-id="organisationId" folder="logo" label="Logo" image class="md:col-span-2" />
    <div class="md:col-span-2 flex items-center gap-4">
      <v-btn type="submit" color="primary" :loading="loading" :disabled="!form.name.trim()"><i class="fa-solid fa-floppy-disk mr-2"></i>Save</v-btn>
      <span v-if="saved" class="text-green-600 text-sm"><i class="fa-solid fa-check mr-1"></i>Saved</span>
    </div>
  </form>
</template>
