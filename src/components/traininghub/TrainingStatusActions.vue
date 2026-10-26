<script setup lang="ts">
import { computed, ref } from 'vue'
import { TrainingsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type {
  Training,
  TrainingAction,
  TrainingStatus,
} from '@/types/traininghub'

const props = defineProps<{ training: Training }>()

const emit = defineEmits<{
  (e: 'updated', t: Training): void
}>()

const ACTIONS: Record<
  TrainingAction,
  {
    label: string
    icon: string
    from: TrainingStatus[]
    confirm?: boolean
  }
> = {
  publish: {
    label: 'Publish',
    icon: 'fa-upload',
    from: ['draft'],
  },
  open_registration: {
    label: 'Open registration',
    icon: 'fa-door-open',
    from: ['published', 'registration_closed'],
  },
  close_registration: {
    label: 'Close registration',
    icon: 'fa-door-closed',
    from: ['registration_open'],
    confirm: true,
  },
  complete: {
    label: 'Mark completed',
    icon: 'fa-flag-checkered',
    from: ['published', 'registration_open', 'registration_closed'],
    confirm: true,
  },
  unpublish: {
    label: 'Unpublish',
    icon: 'fa-eye-slash',
    from: ['published', 'registration_open'],
    confirm: true,
  },
  archive: {
    label: 'Archive',
    icon: 'fa-box-archive',
    from: ['draft', 'published', 'registration_closed', 'completed'],
    confirm: true,
  },
}

const ACTION_STYLES: Record<TrainingAction, string> = {
  publish: 'action-publish',
  open_registration: 'action-open',
  close_registration: 'action-close',
  complete: 'action-complete',
  unpublish: 'action-unpublish',
  archive: 'action-archive',
}

const available = computed(() =>
  (Object.entries(ACTIONS) as [
    TrainingAction,
    (typeof ACTIONS)[TrainingAction],
  ][]).filter(([, action]) =>
    action.from.includes(props.training.status),
  ),
)

const { loading, error, run } = useAsyncAction()
const pending = ref<TrainingAction | null>(null)

const missing = computed(
  () =>
    (error.value?.details?.missing as string[] | undefined) ?? [],
)

async function onClick(action: TrainingAction) {
  if (
    ACTIONS[action].confirm &&
    !window.confirm(`${ACTIONS[action].label}?`)
  ) {
    return
  }

  pending.value = action

  try {
    const result = await run(() =>
      TrainingsService.setStatus(props.training.id, action),
    )

    if (result) emit('updated', result.training)
  } finally {
    pending.value = null
  }
}
</script>

<template>
  <div class="status-actions-wrapper">
    <div class="status-actions">
      <v-btn
        v-for="[key, action] in available"
        :key="key"
        size="small"
        variant="outlined"
        :class="['status-action-btn', ACTION_STYLES[key]]"
        :loading="loading && pending === key"
        :disabled="loading"
        @click="onClick(key)"
      >
        <i
          :class="['fa-solid', action.icon, 'status-action-icon']"
        ></i>

        <span>{{ action.label }}</span>
      </v-btn>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="status-action-error"
    >
      {{ error.message }}

      <ul
        v-if="missing.length"
        class="list-disc ml-5 mt-1"
      >
        <li
          v-for="item in missing"
          :key="item"
        >
          {{ item }}
        </li>
      </ul>
    </v-alert>
  </div>
</template>

<style scoped>
.status-actions-wrapper {
  width: 100%;
}

.status-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
}

/* Shared button styling */
.status-action-btn {
  min-height: 37px !important;
  padding: 0 13px !important;
  border: 1px solid transparent !important;
  border-radius: 10px !important;
  font-size: 11px !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  box-shadow: 0 1px 2px rgb(15 23 42 / 3%) !important;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease !important;
}

.status-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgb(15 23 42 / 7%) !important;
}

.status-action-btn :deep(.v-btn__content) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.status-action-icon {
  font-size: 12px;
}

/* Publish — brand violet */
.action-publish {
  background: #5c2ecd !important;
  border-color: #5c2ecd !important;
  color: #ffffff !important;
}

.action-publish:hover:not(:disabled) {
  background: #4820ad !important;
  border-color: #4820ad !important;
}

/* Open registration — green */
.action-open {
  background: #ecfdf5 !important;
  border-color: #a7f3d0 !important;
  color: #047857 !important;
}

.action-open:hover:not(:disabled) {
  background: #d1fae5 !important;
  border-color: #6ee7b7 !important;
}

/* Close registration — orange */
.action-close {
  background: #fff7ed !important;
  border-color: #fed7aa !important;
  color: #c2410c !important;
}

.action-close:hover:not(:disabled) {
  background: #ffedd5 !important;
  border-color: #fdba74 !important;
}

/* Mark completed — green */
.action-complete {
  background: #ecfdf5 !important;
  border-color: #a7f3d0 !important;
  color: #047857 !important;
}

.action-complete:hover:not(:disabled) {
  background: #d1fae5 !important;
  border-color: #6ee7b7 !important;
}

/* Unpublish — violet */
.action-unpublish {
  background: #f5f1ff !important;
  border-color: #ddd6fe !important;
  color: #5c2ecd !important;
}

.action-unpublish:hover:not(:disabled) {
  background: #ede9fe !important;
  border-color: #c4b5fd !important;
}

/* Archive — neutral grey */
.action-archive {
  background: #f8fafc !important;
  border-color: #e2e8f0 !important;
  color: #475569 !important;
}

.action-archive:hover:not(:disabled) {
  background: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}

/* Error message */
.status-action-error {
  margin-top: 14px;
  border-radius: 10px !important;
  font-size: 12px;
}

/* Mobile */
@media (max-width: 640px) {
  .status-actions {
    gap: 8px;
  }

  .status-action-btn {
    min-height: 36px !important;
    padding: 0 11px !important;
    font-size: 10px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-action-btn {
    transition: none !important;
  }

  .status-action-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>