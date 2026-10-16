<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAsyncAction } from '@/composables/useAsyncAction'

// Landing page for invite links and password-reset links. supabase-js turns the link's
// token into a session; the user then chooses a password here.
const router = useRouter()
const { user, ready, updatePassword } = useAuth()
const { loading, error, run } = useAsyncAction()
const password = ref('')
const confirm = ref('')
const valid = computed(() => password.value.length >= 8 && password.value === confirm.value)

async function submit() {
  const ok = await run(async () => { await updatePassword(password.value); return true })
  if (ok) router.replace({ name: 'dashboard' })
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8" data-aos="fade-up">
      <div v-if="!ready" class="text-center py-8"><v-progress-circular indeterminate color="primary" /></div>

      <div v-else-if="!user" class="text-center">
        <i class="fa-solid fa-link-slash text-5xl text-gray-400 mb-4"></i>
        <h1 class="text-xl font-semibold mb-2">Link invalid or expired</h1>
        <p class="text-gray-500 text-sm mb-6">Request a new reset link, or ask your organisation owner to re-invite you.</p>
        <v-btn color="primary" :to="{ name: 'login' }">Go to sign in</v-btn>
      </div>

      <form v-else class="space-y-4" @submit.prevent="submit">
        <div class="text-center mb-2">
          <i class="fa-solid fa-key text-4xl text-primary mb-3"></i>
          <h1 class="text-2xl font-semibold">Set your password</h1>
          <p class="text-sm text-gray-500 mt-1">{{ user.email }}</p>
        </div>
        <v-alert v-if="error" type="error" variant="tonal" density="compact">{{ error.message }}</v-alert>
        <v-text-field v-model="password" type="password" label="New password" autocomplete="new-password" hint="At least 8 characters" persistent-hint variant="outlined" density="comfortable" />
        <v-text-field v-model="confirm" type="password" label="Confirm password" autocomplete="new-password" variant="outlined" density="comfortable"
          :error-messages="confirm && confirm !== password ? 'Passwords do not match' : ''" />
        <v-btn type="submit" color="primary" block size="large" :loading="loading" :disabled="!valid">Save and continue</v-btn>
      </form>
    </div>
  </main>
</template>
