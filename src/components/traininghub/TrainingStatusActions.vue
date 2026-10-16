<script setup lang="ts">
import { computed, ref } from 'vue'
import { TrainingsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { Training, TrainingAction, TrainingStatus } from '@/types/traininghub'

const props = defineProps<{ training: Training }>()
const emit = defineEmits<{ (e: 'updated', t: Training): void }>()

// Mirrors the transitions table in trainings-set-status (server stays the authority)
const ACTIONS: Record<TrainingAction, { label: string; icon: string; from: TrainingStatus[]; confirm?: boolean }> = {
  publish:            { label: 'Publish',            icon: 'fa-upload',         from: ['draft'] },
  open_registration:  { label: 'Open registration',  icon: 'fa-door-open',      from: ['published', 'registration_closed'] },
  close_registration: { label: 'Close registration', icon: 'fa-door-closed',    from: ['registration_open'], confirm: true },
  complete:           { label: 'Mark completed',     icon: 'fa-flag-checkered', from: ['published', 'registration_open', 'registration_closed'], confirm: true },
  unpublish:          { label: 'Unpublish',          icon: 'fa-eye-slash',      from: ['published', 'registration_open'], confirm: true },
  archive:            { label: 'Archive',            icon: 'fa-box-archive',    from: ['draft', 'published', 'registration_closed', 'completed'], confirm: true },
}

const available = computed(() =>
  (Object.entries(ACTIONS) as [TrainingAction, (typeof ACTIONS)[TrainingAction]][])
    .filter(([, a]) => a.from.includes(props.training.status)))

const { loading, error, run } = useAsyncAction()
const pending = ref<TrainingAction | null>(null)
const missing = computed(() => (error.value?.details?.missing as string[] | undefined) ?? [])

async function onClick(action: TrainingAction) {
  if (ACTIONS[action].confirm && !window.confirm(`${ACTIONS[action].label}?`)) return
  pending.value = action
  const res = await run(() => TrainingsService.setStatus(props.training.id, action))
  pending.value = null
  if (res) emit('updated', res.training)
}
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2">
      <v-btn v-for="[key, a] in available" :key="key" size="small" variant="tonal"
        :loading="loading && pending === key" :disabled="loading" @click="onClick(key)">
        <i :class="['fa-solid', a.icon, 'mr-2']"></i>{{ a.label }}
      </v-btn>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3">
      {{ error.message }}
      <ul v-if="missing.length" class="list-disc ml-5 mt-1"><li v-for="m in missing" :key="m">{{ m }}</li></ul>
    </v-alert>
  </div>
</template>
