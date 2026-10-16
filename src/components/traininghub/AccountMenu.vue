<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, signOut } = useAuth()
async function logout() { await signOut(); router.replace({ name: 'login' }) }
</script>

<template>
  <div v-if="user" class="flex items-center gap-3 text-sm">
    <span class="text-gray-500 hidden sm:inline"><i class="fa-regular fa-user mr-1"></i>{{ user.email }}</span>
    <v-btn size="small" variant="tonal" @click="logout"><i class="fa-solid fa-right-from-bracket mr-2"></i>Sign out</v-btn>
  </div>
</template>
