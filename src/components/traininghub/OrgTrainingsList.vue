<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { TrainingsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatDate } from '@/utils/format'
import TrainingStatusActions from './TrainingStatusActions.vue'
import type { Training } from '@/types/traininghub'

const props = defineProps<{
  organisationId: string
  orgSlug?: string
  canEdit?: boolean
  canPublish?: boolean
}>()

const trainings = ref<Training[]>([])
const { loading, error, run } = useAsyncAction()

watch(
  () => props.organisationId,
  (id) => {
    if (!id) {
      trainings.value = []
      return
    }

    run(async () => {
      trainings.value = await TrainingsService.listForOrg(id)
    })
  },
  { immediate: true },
)

const onUpdated = (training: Training) => {
  const index = trainings.value.findIndex(
    (item) => item.id === training.id,
  )

  if (index >= 0) {
    trainings.value[index] = {
      ...trainings.value[index],
      ...training,
    }
  }
}

const STATUS_META: Record<
  string,
  { label: string; icon: string; class: string }
> = {
  draft: {
    label: 'Draft',
    icon: 'fa-file-pen',
    class: 'status-draft',
  },
  published: {
    label: 'Published',
    icon: 'fa-bullhorn',
    class: 'status-published',
  },
  registration_open: {
    label: 'Registration open',
    icon: 'fa-door-open',
    class: 'status-open',
  },
  registration_closed: {
    label: 'Registration closed',
    icon: 'fa-lock',
    class: 'status-closed',
  },
  completed: {
    label: 'Completed',
    icon: 'fa-circle-check',
    class: 'status-completed',
  },
  archived: {
    label: 'Archived',
    icon: 'fa-box-archive',
    class: 'status-archived',
  },
}

const statusMeta = (status: string) =>
  STATUS_META[status] ?? {
    label: status.replace(/_/g, ' '),
    icon: 'fa-circle-info',
    class: 'status-default',
  }

const copiedMessage = ref('')
const copyError = ref(false)

let copiedTimeout: ReturnType<typeof setTimeout> | undefined

const copyTrainingLink = async (slug: string) => {
  const url = `${window.location.origin}/trainings/${props.orgSlug}/${slug}`

  try {
    await navigator.clipboard.writeText(url)
    copiedMessage.value = 'Training link copied successfully!'
    copyError.value = false
  } catch {
    copiedMessage.value = 'Unable to copy link. Please try again.'
    copyError.value = true
  }

  if (copiedTimeout) clearTimeout(copiedTimeout)

  copiedTimeout = setTimeout(() => {
    copiedMessage.value = ''
  }, 3000)
}

onBeforeUnmount(() => {
  if (copiedTimeout) clearTimeout(copiedTimeout)
})
</script>

<template>
  <section class="training-list">
    <!-- Header -->
    <div class="training-list-header">
      <div>
        <div class="flex items-center gap-2">
          <div class="section-icon">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>

          <h3 class="section-title">
            Organisation trainings
          </h3>
        </div>

        <p class="section-subtitle">
          Manage your training programmes and registration status.
        </p>
      </div>

      <div
        v-if="!loading && !error"
        class="training-count"
      >
        <span>{{ trainings.length }}</span>
        {{ trainings.length === 1 ? 'training' : 'trainings' }}
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="state-card state-error"
      role="alert"
    >
      <div class="state-icon error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>

      <div>
        <h4 class="state-title">
          Unable to load trainings
        </h4>

        <p class="state-description">
          {{ error.message }}
        </p>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div
      v-else-if="loading"
      class="space-y-4"
      aria-label="Loading trainings"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="training-skeleton"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="skeleton-line h-5 w-2/3"></div>
            <div class="skeleton-line mt-3 h-3 w-1/2"></div>
          </div>

          <div class="skeleton-line h-7 w-24 rounded-full"></div>
        </div>

        <div class="mt-6 flex gap-2">
          <div class="skeleton-line h-9 w-20 rounded-lg"></div>
          <div class="skeleton-line h-9 w-20 rounded-lg"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!trainings.length"
      class="state-card state-empty"
    >
      <div class="state-icon empty-icon">
        <i class="fa-solid fa-graduation-cap"></i>
      </div>

      <h4 class="state-title">
        No trainings yet
      </h4>

      <p class="state-description">
        Your organisation's training programmes will appear here once created.
      </p>

      <div
        v-if="canEdit"
        class="empty-hint"
      >
        <i class="fa-solid fa-lightbulb"></i>
        Get started by creating your first training.
      </div>
    </div>

    <!-- Training cards -->
    <div
      v-else
      class="space-y-4"
    >
      <article
        v-for="(t, index) in trainings"
        :key="t.id"
        class="training-card"
        data-aos="fade-up"
        :data-aos-delay="Math.min(index * 50, 200)"
      >
        <!-- Card accent -->
        <div class="training-card-accent"></div>

        <!-- Card heading -->
        <div class="training-card-top">
          <div class="training-heading">
            <div class="training-title-row">
              <div class="training-type-icon">
                <i class="fa-solid fa-book-open"></i>
              </div>

              <h4 class="training-title">
                {{ t.title }}
              </h4>
            </div>

            <div class="training-dates">
              <span class="date-icon">
                <i class="fa-regular fa-calendar"></i>
              </span>

              <span>{{ formatDate(t.start_date) }}</span>

              <i class="fa-solid fa-arrow-right date-arrow"></i>

              <span>{{ formatDate(t.end_date) }}</span>
            </div>
          </div>

          <span
            :class="['status-badge', statusMeta(t.status).class]"
          >
            <i
              :class="['fa-solid', statusMeta(t.status).icon]"
            ></i>

            {{ statusMeta(t.status).label }}
          </span>
        </div>

        <!-- Divider -->
        <div class="training-divider"></div>

        <!-- Actions -->
        <div class="training-card-bottom">
          <div class="training-meta">
            <span class="meta-dot"></span>
            <span>Training programme</span>
          </div>

          <div class="training-actions">
            <v-btn
              v-if="canEdit"
              size="small"
              variant="outlined"
              class="action-btn edit-btn"
              :to="{ name: 'training-edit', params: { id: t.id } }"
            >
              <i class="fa-solid fa-pen-to-square mr-2"></i>
              Edit
            </v-btn>

            <template
              v-if="
                orgSlug &&
                t.status !== 'draft' &&
                t.status !== 'archived'
              "
            >
              <v-btn
                size="small"
                variant="outlined"
                class="action-btn view-btn"
                :to="{
                  name: 'training-detail',
                  params: { orgSlug, slug: t.slug },
                }"
              >
                <i
                  class="fa-solid fa-arrow-up-right-from-square mr-2"
                ></i>
                View training
              </v-btn>

              <v-btn
                size="small"
                variant="text"
                icon
                class="copy-btn"
                aria-label="Copy training link"
                title="Copy training link"
                @click="copyTrainingLink(t.slug)"
              >
                <i class="fa-regular fa-copy"></i>
              </v-btn>
            </template>
          </div>
        </div>

        <!-- Existing status workflow -->
        <div
          v-if="canPublish"
          class="training-status-actions"
        >
          <TrainingStatusActions
            :training="t"
            @updated="onUpdated"
          />
        </div>
      </article>
    </div>

    <!-- Copy feedback -->
    <Transition name="toast">
      <div
        v-if="copiedMessage"
        role="status"
        aria-live="polite"
        :class="[
          'copy-feedback',
          copyError ? 'copy-feedback-error' : 'copy-feedback-success',
        ]"
      >
        <div class="feedback-icon">
          <i
            :class="
              copyError
                ? 'fa-solid fa-circle-exclamation'
                : 'fa-solid fa-circle-check'
            "
          ></i>
        </div>

        <span class="flex-1">
          {{ copiedMessage }}
        </span>

        <button
          type="button"
          class="feedback-close"
          aria-label="Dismiss notification"
          @click="copiedMessage = ''"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.training-list {
  width: 100%;
  color: #17152b;
}

/* Header */
.training-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.section-icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8e0ff;
  border-radius: 12px;
  background: #f5f1ff;
  color: #5c2ecd;
  font-size: 15px;
}

.section-title {
  color: #17152b;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.035em;
}

.section-subtitle {
  margin-top: 7px;
  color: #858b9b;
  font-size: 12px;
  line-height: 1.6;
}

.training-count {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: 1px solid #eeebf8;
  border-radius: 999px;
  background: #faf9ff;
  color: #77728b;
  font-size: 11px;
  font-weight: 600;
}

.training-count span {
  color: #5c2ecd;
  font-size: 13px;
  font-weight: 750;
}

/* Training card */
.training-card {
  position: relative;
  overflow: hidden;
  padding: 22px;
  border: 1px solid #eceef4;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 2px 8px rgb(15 23 42 / 2.5%);
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease,
    transform 200ms ease;
}

.training-card:hover {
  transform: translateY(-2px);
  border-color: #ddd4fa;
  box-shadow: 0 10px 26px rgb(30 10 94 / 5%);
}

.training-card-accent {
  position: absolute;
  top: 0;
  left: 22px;
  width: 44px;
  height: 3px;
  border-radius: 0 0 5px 5px;
  background: #5c2ecd;
  opacity: 0.8;
}

.training-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.training-heading {
  min-width: 0;
  flex: 1;
}

.training-title-row {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.training-type-icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #f5f2ff;
  color: #5c2ecd;
  font-size: 15px;
}

.training-title {
  padding-top: 3px;
  color: #222039;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
  letter-spacing: -0.025em;
}

.training-dates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
  color: #7e8596;
  font-size: 12px;
  font-weight: 500;
}

.date-icon {
  color: #9690ac;
}

.date-arrow {
  color: #b0b5c1;
  font-size: 9px;
}

/* Status badges */
.status-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.2;
}

.status-draft {
  border-color: #e8eaf0;
  background: #f5f6f8;
  color: #737987;
}

.status-published {
  border-color: #dbeafe;
  background: #eff6ff;
  color: #2563eb;
}

.status-open {
  border-color: #d1fae5;
  background: #ecfdf5;
  color: #047857;
}

.status-closed {
  border-color: #ffedd5;
  background: #fff7ed;
  color: #c2410c;
}

.status-completed {
  border-color: #e9d5ff;
  background: #faf5ff;
  color: #7e22ce;
}

.status-archived {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
}

.status-default {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
}

/* Footer */
.training-divider {
  height: 1px;
  margin: 21px 0 15px;
  background: #f0f1f5;
}

.training-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.training-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9aa0ae;
  font-size: 11px;
  font-weight: 500;
}

.meta-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b8a4f4;
}

.training-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.action-btn {
  min-height: 34px !important;
  border-radius: 9px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.edit-btn {
  border-color: #e7e2f4 !important;
  background: #fff !important;
  color: #5c2ecd !important;
}

.view-btn {
  border-color: #5c2ecd !important;
  background: #5c2ecd !important;
  color: #fff !important;
}

.view-btn:hover {
  border-color: #4820ad !important;
  background: #4820ad !important;
}

.copy-btn {
  width: 34px !important;
  height: 34px !important;
  border: 1px solid #eceef4 !important;
  border-radius: 9px !important;
  color: #737b8d !important;
}

.copy-btn:hover {
  border-color: #ddd4fa !important;
  background: #f7f4ff !important;
  color: #5c2ecd !important;
}

/* Status workflow area */
.training-status-actions {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #f0f1f5;
}

/* Empty and error states */
.state-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 24px;
  border: 1px solid #eceef4;
  border-radius: 18px;
  background: #fff;
}

.state-icon {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  font-size: 17px;
}

.empty-icon {
  background: #f5f1ff;
  color: #5c2ecd;
}

.error-icon {
  background: #fef2f2;
  color: #dc2626;
}

.state-title {
  color: #27243b;
  font-size: 14px;
  font-weight: 700;
}

.state-description {
  margin-top: 5px;
  color: #858b9b;
  font-size: 12px;
  line-height: 1.7;
}

.state-empty {
  flex-direction: column;
  padding: 44px 24px;
  text-align: center;
}

.state-empty .state-icon {
  width: 54px;
  height: 54px;
  margin-bottom: 2px;
  border-radius: 17px;
  font-size: 21px;
}

.empty-hint {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  padding: 9px 12px;
  border-radius: 9px;
  background: #faf8ff;
  color: #71648f;
  font-size: 11px;
}

/* Skeletons */
.training-skeleton {
  padding: 22px;
  border: 1px solid #eceef4;
  border-radius: 18px;
  background: #fff;
}

.skeleton-line {
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    #f0f2f7 25%,
    #e7eaf1 50%,
    #f0f2f7 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite linear;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}

/* Copy notification */
.copy-feedback {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  display: flex;
  max-width: min(420px, calc(100vw - 32px));
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 35px rgb(15 23 42 / 12%);
  font-size: 12px;
  font-weight: 600;
}

.copy-feedback-success {
  border-color: #d1fae5;
  color: #166534;
}

.copy-feedback-error {
  border-color: #fecaca;
  color: #b91c1c;
}

.feedback-icon {
  font-size: 18px;
}

.copy-feedback-success .feedback-icon {
  color: #16a34a;
}

.copy-feedback-error .feedback-icon {
  color: #dc2626;
}

.feedback-close {
  display: flex;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: #8a91a0;
}

.feedback-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateY(8px);
  opacity: 0;
}

/* Responsive layout */
@media (max-width: 640px) {
  .training-list-header {
    align-items: flex-start;
  }

  .section-title {
    font-size: 15px;
  }

  .section-subtitle {
    max-width: 260px;
  }

  .training-card {
    padding: 17px;
    border-radius: 15px;
  }

  .training-card-top {
    flex-direction: column;
    gap: 15px;
  }

  .status-badge {
    align-self: flex-start;
  }

  .training-card-bottom {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .training-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .copy-feedback {
    right: 16px;
    bottom: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .training-card,
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }

  .training-card:hover {
    transform: none;
  }

  .skeleton-line {
    animation: none;
  }
}
</style>