<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import sidebarItems from './sidebarItem'

const emit = defineEmits<{
  (event: 'navigate'): void
}>()

const authStore = useAuthStore()
const route = useRoute()

const visibleSidebarItems = computed(() =>
  sidebarItems
    .filter((section) =>
      section.roles.some((role) => authStore.userRoles.includes(role)),
    )
    .map((section) => ({
      ...section,
      items: section.items,
    })),
)

function isItemActive(path: string) {
  // Dashboard should only be active on the dashboard page.
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }

  // All Trainings should be active on the list and edit pages,
  // but not on the New Training page.
  if (path === '/dashboard/trainings') {
    return (
      route.path === '/dashboard/trainings' ||
      /^\/dashboard\/trainings\/[^/]+\/edit$/.test(route.path)
    )
  }

  // New Training should be active on its own route only.
  if (path === '/dashboard/trainings/new') {
    return route.path === '/dashboard/trainings/new'
  }

  // Default matching for other sidebar items.
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <div class="flex h-full flex-col bg-white">
    <!-- Logo -->
    <div
      class="flex h-[76px] shrink-0 items-centerpx-6"
    >
      <RouterLink
        to="/dashboard"
        class="flex items-center gap-3"
        @click="emit('navigate')"
      >
        <!-- Keep your existing logo content here -->
      </RouterLink>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-scroll flex-1 overflow-y-auto px-4 py-4">
      <div
        v-for="group in visibleSidebarItems"
        :key="group.section"
        class="mb-5"
      >
        <p
          class="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400"
        >
          {{ group.section }}
        </p>

        <div class="space-y-1">
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="sidebar-link group flex items-center gap-3 rounded-md px-3 py-2.5 transition-all duration-150"
            :class="{ 'sidebar-active': isItemActive(item.path) }"
            :aria-current="isItemActive(item.path) ? 'page' : undefined"
            @click="emit('navigate')"
          >
            <div
              class="sidebar-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-all"
            >
              <i :class="item.icon" class="text-sm"></i>
            </div>

            <span
              class="sidebar-label min-w-0 flex-1 truncate text-[13px] font-medium text-gray-600 transition-colors"
            >
              {{ item.title }}
            </span>

            <span
              v-if="item.badge"
              class="rounded-full bg-green-50 px-2 py-0.5 text-[8px] font-bold text-green-700"
            >
              {{ item.badge }}
            </span>
          </RouterLink>
        </div>
      </div>
    </nav>
  </div>
</template>
<style scoped>

.sidebar-scroll {
  scrollbar-width: none;
}

.sidebar-scroll::-webkit-scrollbar {
  display: none;
}

/* Navigation #f0fdf4
.sidebar-link {
  background: transparent;
  border-radius: 8px;
  color: #211044;
}

/* Hover state */
.sidebar-link:hover {
  background: #f8f5fc;
}

.sidebar-link:hover .sidebar-icon {
  color: #211044;
}

.sidebar-link:hover .sidebar-label {
  color: #211044;
}

/* Active navigation state */
.sidebar-active {
  background: #f8f5fc;
}

/* Active icon */
.sidebar-active .sidebar-icon {
  background: #211044;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(33, 16, 68, 0.16);
}

/* Active label */
.sidebar-active .sidebar-label {
  color: #211044;
  font-weight: 600;
}

/* Smooth icon and label transitions */
.sidebar-icon {
  transition:
    background-color 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease;
}

.sidebar-label {
  transition: color 150ms ease;
}

/* Keyboard accessibility */
.sidebar-link:focus-visible {
  outline: 2px solid #211044;
  outline-offset: 2px;
}

/* Badge styling */
.sidebar-link .rounded-full {
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

</style>