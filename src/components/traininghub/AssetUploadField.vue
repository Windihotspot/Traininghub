<script setup lang="ts">
import { ref } from 'vue'
import { uploadAsset } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'

const props = defineProps<{
  modelValue: string | null; organisationId: string; folder: string; label: string
  accept?: string; image?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()
const { loading, error, run } = useAsyncAction()
const picked = ref<File[] | File | null>(null)

async function onPick(v: File[] | File | null) {
  const file = Array.isArray(v) ? v[0] : v
  if (!file) return
  const url = await run(() => uploadAsset(props.organisationId, props.folder, file))
  if (url) emit('update:modelValue', url)
  picked.value = null
}
</script>

<template>
  <div>
    <v-file-input v-model="picked" :label="label" :accept="accept ?? 'image/png,image/jpeg,image/webp'"
      :loading="loading" prepend-icon="" variant="outlined" density="comfortable" hide-details="auto"
      :error-messages="error?.message" @update:model-value="onPick">
      <template #prepend-inner><i class="fa-solid fa-cloud-arrow-up mr-1"></i></template>
    </v-file-input>
    <div v-if="modelValue" class="mt-2 flex items-center gap-3 text-sm">
      <img v-if="image" :src="modelValue" alt="" class="h-16 rounded-lg border border-gray-100 object-cover" />
      <a v-else :href="modelValue" target="_blank" rel="noopener" class="text-primary hover:underline">
        <i class="fa-solid fa-file-pdf mr-1"></i>Current file
      </a>
      <v-btn size="x-small" variant="text" color="error" @click="emit('update:modelValue', null)">Remove</v-btn>
    </div>
  </div>
</template>
