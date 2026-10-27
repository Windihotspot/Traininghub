<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import sidebarItems from '../sidebar/sidebarItem'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentPage = computed(() => {
  const items = sidebarItems.flatMap((section) => section.items)

  return (
    [...items]
      .sort((a, b) => b.path.length - a.path.length)
      .find((item) =>
        item.path === '/dashboard'
          ? route.path === item.path
          : route.path === item.path ||
            route.path.startsWith(`${item.path}/`),
      )?.title ?? 'Dashboard'
  )
})

const userName = computed(() => {
  const metadata = authStore.user?.user_metadata ?? {}

  const fullName = [
    metadata.first_name,
    metadata.last_name,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    metadata.full_name ||
    metadata.name ||
    fullName ||
    authStore.user?.email ||
    'User'
  )
})

const userEmail = computed(() => authStore.user?.email ?? '')

const userRole = computed(() => {
  if (authStore.platformRole === 'super_admin') return 'Super Admin'
  if (authStore.platformRole === 'platform_admin') return 'Platform Admin'
  if (authStore.organisationRole === 'org_owner') return 'Organisation Owner'
  if (authStore.organisationRole === 'org_admin') return 'Organisation Admin'
  if (authStore.organisationRole === 'org_staff') return 'Organisation Staff'

  return 'Member'
})

const organisationName = computed(
  () => authStore.organisation?.name ?? '',
)

const isOwner = computed(
  () => authStore.organisationRole === 'org_owner',
)

const userInitials = computed(() => {
  const name = userName.value.trim()

  if (!name || name === 'User') return 'U'

  const parts = name.split(/\s+/)

  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
})

async function handleLogout() {
  try {
    await authStore.signOut()
    await router.replace('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<template>
  <div class="flex w-full m-6 items-center justify-between gap-4">
    <!-- Page title -->
    <div class="min-w-0">
      <h1 class="truncate m-6 text-lg font-semibold text-gray-900">
        {{ currentPage }}
      </h1>
      <!-- <p
        v-if="organisationName"
        class="mt-0.5 truncate text-xs text-gray-500"
      >
        {{ organisationName }}
      </p> -->
    </div>

    <!-- Header actions -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Notifications can remain here -->

      <!-- User dropdown -->
      <el-dropdown
        trigger="click"
        placement="bottom-end"
        :hide-on-click="true"
        popper-class="quidly-user-dropdown"
        @command="(command: string) => command === 'logout' && handleLogout()"
      >
        <button
          type="button"
          class="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          aria-label="Open user menu"
        >
          <!-- Avatar -->
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 text-[11px] font-bold text-white"
          >
            {{ userInitials }}
          </div>

          <!-- User information -->
          <div class="hidden min-w-0 text-left md:block">
            <p
              class="max-w-[150px] truncate text-xs font-semibold text-gray-800"
            >
              {{ userName }}
            </p>

            <p class="max-w-[150px] truncate text-[10px] text-gray-400">
              {{ userEmail }}
            </p>
          </div>

          <i
            class="fa-solid fa-chevron-down hidden text-[9px] text-gray-400 md:block"
            aria-hidden="true"
          ></i>
        </button>

        <template #dropdown>
          <el-dropdown-menu class="!w-[280px] !p-0">
            <!-- User header -->
            <div class="border-b border-gray-100 px-4 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 text-sm font-bold text-white"
                >
                  {{ userInitials }}
                </div>

                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-gray-900">
                    {{ userName }}
                  </p>

                  <p class="mt-0.5 truncate text-xs text-gray-400">
                    {{ userEmail }}
                  </p>

                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      class="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-semibold text-purple-600"
                    >
                      {{ userRole }}
                    </span>

                    <span
                      v-if="isOwner"
                      class="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-semibold text-green-600"
                    >
                      Owner
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Menu items -->
            <div class="p-2">
              <el-dropdown-item
                command="logout"
                class="logout-dropdown-item !mx-0 !rounded-lg !px-3 !py-2.5"
              >
                <i
                  class="fa-solid fa-arrow-right-from-bracket mr-3 text-sm"
                  aria-hidden="true"
                ></i>

                <span class="text-sm font-medium">Logout</span>
              </el-dropdown-item>
            </div>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style>
/* Global because Element Plus renders its dropdown popper outside this component. */
.quidly-user-dropdown {
  padding: 0 !important;
  overflow: hidden;
  border: 1px solid #f3f4f6 !important;
  border-radius: 16px !important;
  box-shadow: 0 12px 32px rgb(15 23 42 / 10%) !important;
}

.quidly-user-dropdown .el-dropdown-menu {
  padding: 0 !important;
}

.quidly-user-dropdown .el-dropdown-menu__item {
  line-height: normal;
  color: #374151;
}

.quidly-user-dropdown .el-dropdown-menu__item.logout-dropdown-item {
  color: #dc2626;
}

.quidly-user-dropdown
  .el-dropdown-menu__item.logout-dropdown-item:hover {
  color: #b91c1c;
  background: #fef2f2;
}

.quidly-user-dropdown .el-dropdown-menu__item:focus {
  color: #b91c1c;
  background: #fef2f2;
}
</style>