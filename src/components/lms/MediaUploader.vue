<script setup lang="ts">
import { ref } from 'vue'
import { LmsService } from '@/services/lms'
import { useAsyncAction } from '@/composables/useAsyncAction'

const props = defineProps<{ organisationId: string; kind: 'video' | 'audio' | 'pdf'; current?: string | null }>()
const emit = defineEmits<{ (e: 'uploaded', v: { asset_id: string; duration: number }): void }>()
const accept = { video: 'video/mp4,video/webm,video/quicktime', audio: 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/aac', pdf: 'application/pdf' }
const { loading, error, run } = useAsyncAction()
const mode = ref<'upload' | 'link'>('upload')
const link = ref(''); const provider = ref('youtube'); const done = ref(false)

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const r = await run(() => LmsService.uploadMedia(props.organisationId, file))
  if (r) { done.value = true; emit('uploaded', { asset_id: r.asset_id, duration: r.duration }) }
}
async function addLink() {
  const r = await run(() => LmsService.addExternalMedia(props.organisationId, props.kind as 'video' | 'audio', provider.value, link.value.trim()))
  if (r) { done.value = true; emit('uploaded', { asset_id: r.asset_id, duration: 0 }) }
}
</script>

<template>
  <div class="border border-dashed border-gray-300 rounded-xl p-4">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-2">{{ error.message }}</v-alert>
    <v-btn-toggle v-if="kind !== 'pdf'" v-model="mode" mandatory density="compact" class="mb-3">
      <v-btn value="upload" size="small">Upload file</v-btn><v-btn value="link" size="small">Paste link</v-btn>
    </v-btn-toggle>
    <input v-if="mode === 'upload'" type="file" :accept="accept[kind]" :disabled="loading" @change="onFile" />
    <div v-else class="flex gap-2">
      <v-select v-model="provider" :items="['youtube', 'vimeo', 'bunny', 'cloudflare', 'external']" density="compact" variant="outlined" hide-details style="max-width:160px" />
      <v-text-field v-model="link" label="Embed URL (https)" density="compact" variant="outlined" hide-details />
      <v-btn color="primary" :loading="loading" :disabled="!link.startsWith('https://')" @click="addLink">Add</v-btn>
    </div>
    <p v-if="loading" class="text-sm text-gray-500 mt-2">Uploading… keep this tab open.</p>
    <p v-else-if="done || current" class="text-sm text-green-600 mt-2"><i class="fa-solid fa-check mr-1"></i>Media attached</p>
  </div>
</template>
