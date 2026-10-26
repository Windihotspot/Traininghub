<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { OrganisationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatMoney } from '@/utils/format'

const props = defineProps<{ organisationId?: string }>()

const stats = ref<Record<string, number>>({})
const { loading, error, run } = useAsyncAction()

const META: Record<
  string,
  {
    label: string
    icon: string
    color: string
    bg: string
    money?: boolean
  }
> = {
  trainings: {
    label: 'Trainings',
    icon: 'fa-chalkboard-user',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  published: {
    label: 'Live trainings',
    icon: 'fa-bullhorn',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  registrations: {
    label: 'Registrations',
    icon: 'fa-clipboard-list',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  participants: {
    label: 'Confirmed participants',
    icon: 'fa-users',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  paid: {
    label: 'Paid payments',
    icon: 'fa-circle-check',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  pending: {
    label: 'Pending payments',
    icon: 'fa-hourglass-half',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  revenue: {
    label: 'Revenue',
    icon: 'fa-naira-sign',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    money: true,
  },
  organisations: {
    label: 'Organisations',
    icon: 'fa-building',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  published_trainings: {
    label: 'Live trainings',
    icon: 'fa-bullhorn',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  successful_payments: {
    label: 'Successful payments',
    icon: 'fa-circle-check',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  pending_payments: {
    label: 'Pending payments',
    icon: 'fa-hourglass-half',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
}

watch(
  () => props.organisationId,
  () =>
    run(async () => {
      stats.value = (
        props.organisationId
          ? await OrganisationsService.orgStats(props.organisationId)
          : await OrganisationsService.platformStats()
      ) ?? {}
    }),
  { immediate: true },
)

const entries = computed(() =>
  Object.entries(stats.value).filter(([key]) => key in META),
)

const show = (key: string, value: number) =>
  META[key].money
    ? formatMoney(Number(value))
    : Number(value).toLocaleString()
</script>

<template>
  <section class="stats-section">
    <!-- Error state -->
    <div
      v-if="error"
      class="stats-error"
      role="alert"
    >
      <div class="stats-error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>

      <div>
        <p class="font-semibold text-gray-900">
          Unable to load statistics
        </p>
        <p class="mt-1 text-sm text-gray-500">
          {{ error.message }}
        </p>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div
      v-else-if="loading"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Loading statistics"
    >
      <div
        v-for="n in 4"
        :key="n"
        class="stats-skeleton"
      >
        <div class="flex items-center justify-between">
          <div class="skeleton-block h-10 w-10 rounded-xl"></div>
          <div class="skeleton-block h-4 w-14 rounded-full"></div>
        </div>

        <div class="skeleton-block mt-6 h-8 w-2/3 rounded-lg"></div>
        <div class="skeleton-block mt-3 h-3 w-1/2 rounded-full"></div>
      </div>
    </div>

    <!-- Statistics -->
    <div
      v-else-if="entries.length"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <article
        v-for="[key, value] in entries"
        :key="key"
        class="stats-card group"
        data-aos="fade-up"
      >
        <div class="flex items-start justify-between gap-3">
          <div
            :class="[
              'stats-icon',
              META[key].bg,
              META[key].color,
            ]"
          >
            <i :class="['fa-solid', META[key].icon]"></i>
          </div>

          <span class="stats-indicator">
            <span class="stats-indicator-dot"></span>
            Overview
          </span>
        </div>

        <div class="mt-6 min-w-0">
          <p class="stats-value">
            {{ show(key, value) }}
          </p>

          <h3 class="stats-label">
            {{ META[key].label }}
          </h3>
        </div>

        <div class="stats-card-footer">
          <span>Current total</span>
          <i
            class="fa-solid fa-arrow-up-right-from-square"
            aria-hidden="true"
          ></i>
        </div>

        <div class="stats-card-accent"></div>
      </article>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="stats-empty"
    >
      <div class="stats-empty-icon">
        <i class="fa-solid fa-chart-simple"></i>
      </div>

      <h3 class="font-semibold text-gray-900">
        No statistics available
      </h3>

      <p class="mt-1 text-sm text-gray-500">
        Your statistics will appear here when data becomes available.
      </p>
    </div>
  </section>
</template>

<style scoped>
.stats-section {
  width: 100%;
}

/* Main card */
.stats-card {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 22px;
  border: 1px solid #edf0f5;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(15 23 42 / 3%);
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;
}

.stats-card:hover {
  transform: translateY(-4px);
  border-color: #dcd5fa;
  box-shadow:
    0 12px 28px rgb(30 10 94 / 7%),
    0 3px 8px rgb(15 23 42 / 3%);
}

.stats-icon {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 18px;
  transition: transform 220ms ease;
}

.stats-card:hover .stats-icon {
  transform: scale(1.06);
}

/* Small status indicator */
.stats-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid #f0f2f6;
  border-radius: 999px;
  background: #fafbfc;
  color: #8992a3;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.stats-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #16a34a;
  box-shadow: 0 0 0 3px rgb(22 163 74 / 9%);
}

/* Numbers and labels */
.stats-value {
  overflow-wrap: anywhere;
  color: #17152b;
  font-size: clamp(1.5rem, 2vw, 1.9rem);
  font-weight: 750;
  letter-spacing: -0.055em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stats-label {
  margin-top: 8px;
  color: #737b8d;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}

/* Bottom metadata */
.stats-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 22px;
  padding-top: 13px;
  border-top: 1px solid #f1f2f6;
  color: #a0a7b5;
  font-size: 11px;
  font-weight: 500;
}

.stats-card-footer i {
  font-size: 11px;
  opacity: 0;
  transform: translate(-3px, 3px);
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.stats-card:hover .stats-card-footer i {
  opacity: 1;
  transform: translate(0, 0);
}

/* Subtle bottom accent */
.stats-card-accent {
  position: absolute;
  right: 22px;
  bottom: 0;
  left: 22px;
  height: 2px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(
    90deg,
    #5c2ecd 0%,
    #a78bfa 55%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity 220ms ease;
}

.stats-card:hover .stats-card-accent {
  opacity: 1;
}

/* Loading state */
.stats-skeleton {
  min-width: 0;
  padding: 22px;
  border: 1px solid #edf0f5;
  border-radius: 18px;
  background: #fff;
}

.skeleton-block {
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

/* Error and empty states */
.stats-error,
.stats-empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px;
  border: 1px solid #edf0f5;
  border-radius: 18px;
  background: #fff;
}

.stats-error-icon,
.stats-empty-icon {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #f5f3ff;
  color: #5c2ecd;
  font-size: 18px;
}

.stats-error-icon {
  background: #fef2f2;
  color: #dc2626;
}

.stats-empty {
  flex-direction: column;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .stats-card,
  .stats-icon,
  .stats-card-footer i,
  .stats-card-accent {
    transition: none;
  }

  .stats-card:hover {
    transform: none;
  }

  .skeleton-block {
    animation: none;
  }
}
</style>