<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { safeRedirect } from '@/router/guards'

type Mode = 'signin' | 'signup' | 'forgot'
const route = useRoute()
const router = useRouter()
const { signIn, signUp, sendReset } = useAuth()
const { loading, error, run } = useAsyncAction()

const mode = ref<Mode>('signin')
const form = reactive({ full_name: '', email: '', password: '' })
const info = ref('')
const show = ref(false)

const titles: Record<Mode, string> = { signin: 'Sign in', signup: 'Create account', forgot: 'Reset password' }
const setMode = (m: Mode) => { mode.value = m; info.value = ''; error.value = null }
const emailOk = () => /^\S+@\S+\.\S+$/.test(form.email.trim())
const canSubmit = () => emailOk() && (mode.value === 'forgot' || form.password.length >= (mode.value === 'signup' ? 8 : 1)) &&
  (mode.value !== 'signup' || !!form.full_name.trim())

async function submit() {
  info.value = ''
  const ok = await run(async () => {
    if (mode.value === 'signin') {
      await signIn(form.email, form.password)
      router.replace(safeRedirect(route.query.redirect) ?? { name: 'dashboard' })
    } else if (mode.value === 'signup') {
      const needsConfirm = await signUp(form.email, form.password, form.full_name)
      if (needsConfirm) info.value = 'Check your email to confirm your account, then sign in.'
      else router.replace(safeRedirect(route.query.redirect) ?? { name: 'dashboard' })
    } else {
      await sendReset(form.email)
      info.value = 'If that email has an account, a reset link is on its way.'
    }
    return true
  })
  return ok
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8" data-aos="fade-up">
      <div class="text-center mb-6">
        <i class="fa-solid fa-graduation-cap text-4xl text-primary mb-3"></i>
        <h1 class="text-2xl font-semibold">{{ titles[mode] }}</h1>
        <p class="text-sm text-gray-500 mt-1">Manage trainings, registrations and payments.</p>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error.message }}</v-alert>
      <v-alert v-if="info" type="success" variant="tonal" density="compact" class="mb-4">{{ info }}</v-alert>

      <form class="space-y-4" @submit.prevent="submit">
        <v-text-field v-if="mode === 'signup'" v-model="form.full_name" label="Full name" autocomplete="name" variant="outlined" density="comfortable" hide-details="auto" />
        <v-text-field v-model="form.email" type="email" label="Email" autocomplete="email" variant="outlined" density="comfortable" hide-details="auto" />
        <v-text-field v-if="mode !== 'forgot'" v-model="form.password" :type="show ? 'text' : 'password'" label="Password"
          :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'" variant="outlined" density="comfortable"
          :hint="mode === 'signup' ? 'At least 8 characters' : ''" persistent-hint>
          <template #append-inner>
            <i :class="['fa-regular cursor-pointer', show ? 'fa-eye-slash' : 'fa-eye']" @click="show = !show"></i>
          </template>
        </v-text-field>

        <v-btn type="submit" color="primary" block size="large" :loading="loading" :disabled="!canSubmit()">
          {{ mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link' }}
        </v-btn>
      </form>

      <div class="mt-6 text-sm text-center space-y-2">
        <template v-if="mode === 'signin'">
          <div><a class="text-primary cursor-pointer hover:underline" @click="setMode('forgot')">Forgot password?</a></div>
          <div class="text-gray-500">No account? <a class="text-primary cursor-pointer hover:underline" @click="setMode('signup')">Create one</a></div>
        </template>
        <div v-else><a class="text-primary cursor-pointer hover:underline" @click="setMode('signin')"><i class="fa-solid fa-arrow-left mr-1"></i>Back to sign in</a></div>
        <div><router-link :to="{ name: 'home' }" class="text-gray-400 hover:underline">Back to site</router-link></div>
      </div>
    </div>
  </main>
</template>
