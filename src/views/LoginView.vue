
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
const form = reactive({
  full_name: '',
  email: '',
  password: '',
})

const info = ref('')
const show = ref(false)

const titles: Record<Mode, string> = {
  signin: 'Welcome back',
  signup: 'Create your account',
  forgot: 'Reset your password',
}

const subtitles: Record<Mode, string> = {
  signin: 'Sign in to continue to your TrainHub workspace.',
  signup: 'Join TrainHub and start managing your training activities.',
  forgot: 'Enter your email and we’ll send you a password reset link.',
}

function setMode(value: Mode) {
  mode.value = value
  info.value = ''
  error.value = null
  show.value = false
}

function emailOk() {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
}

function canSubmit() {
  if (!emailOk()) return false

  if (mode.value === 'forgot') return true

  if (mode.value === 'signin') {
    return form.password.length > 0
  }

  return form.full_name.trim().length >= 2
    && form.password.length >= 8
}

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
console.log('Auth store:', authStore)
console.log('signIn:', typeof authStore.signIn)

async function handleSubmit() {
  info.value = ''

  await run(async () => {
    if (mode.value === 'signin') {
      await authStore.signIn(
        form.email.trim(),
        form.password,
      )

      await authStore.loadUserContext(true)

      if (authStore.authError) {
        throw new Error(authStore.authError)
      }

      await router.replace(
        safeRedirect(route.query.redirect) ?? { name: 'dashboard' },
      )

      return
    }

    if (mode.value === 'signup') {
      const needsConfirmation = await authStore.signUp(
        form.email.trim(),
        form.password,
        form.full_name,
      )

      if (needsConfirmation) {
        info.value =
          'Account created. Please check your email to confirm your account.'
        mode.value = 'signin'
      } else {
        await authStore.loadUserContext(true)

        if (authStore.authError) {
          throw new Error(authStore.authError)
        }

        await router.replace(
          safeRedirect(route.query.redirect) ?? { name: 'dashboard' },
        )
      }

      return
    }

    if (mode.value === 'forgot') {
      await authStore.sendReset(form.email.trim())

      info.value =
        'If an account exists for that email, a password reset link has been sent.'
    }
  })
}
const register = () => {
  router.push('/organisations/register')
}
</script>

<template>
  <main class="auth-page">
    <div class="auth-layout">
      <!-- Brand panel -->
      <aside class="brand-panel">
        <RouterLink to="/" class="brand">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7.2 12 3l8 4.2v9.4L12 21l-8-4.4V7.2Z"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="m8 9 4-2.1L16 9l-4 2.2L8 9Z"
                fill="#F7C948"
              />
              <path
                d="M9 12.1v3.2l3 1.6 3-1.6v-3.2"
                stroke="#F7C948"
                stroke-width="1.5"
              />
            </svg>
          </span>
          <span>TrainHub</span>
        </RouterLink>

        <div class="brand-content">
          <span class="eyebrow">
            <span class="eyebrow-dot"></span>
            YOUR TRAINING WORKSPACE
          </span>

          <h1>
            Bring your
            <span>learning</span>
            together.
          </h1>

          <p class="brand-description">
            Manage training programmes, connect with learners, and keep
            registrations and payments organised in one place.
          </p>

          <div class="brand-points">
            <div>
              <span class="check-icon">✓</span>
              Manage your training programmes
            </div>
            <div>
              <span class="check-icon">✓</span>
              Keep registrations organised
            </div>
            <div>
              <span class="check-icon">✓</span>
              Access your workspace anywhere
            </div>
          </div>
        </div>

        <div class="brand-bottom">
          <span class="gold-line"></span>
          <p>Professional training, connected.</p>
        </div>

        <span class="decor decor-one"></span>
        <span class="decor decor-two"></span>
      </aside>

      <!-- Authentication panel -->
      <section class="form-panel">
        <div class="mobile-brand">
          <RouterLink to="/" class="brand">
            <span class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7.2 12 3l8 4.2v9.4L12 21l-8-4.4V7.2Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  d="m8 9 4-2.1L16 9l-4 2.2L8 9Z"
                  fill="#F7C948"
                />
                <path
                  d="M9 12.1v3.2l3 1.6 3-1.6v-3.2"
                  stroke="#F7C948"
                  stroke-width="1.5"
                />
              </svg>
            </span>
            <span>TrainHub</span>
          </RouterLink>
        </div>

        <div class="form-content">
          <div class="form-heading ">
           

            <p>{{ subtitles[mode] }}</p>
          </div>

          <div
            v-if="error"
            class="alert alert-error"
            role="alert"
          >
            <span class="alert-icon">!</span>
            <p>{{ error.message }}</p>
          </div>

          <div
            v-if="info"
            class="alert alert-success"
            role="status"
          >
            <span class="alert-icon">✓</span>
            <p>{{ info }}</p>
          </div>

          <form class="auth-form" @submit.prevent="handleSubmit">
            <div v-if="mode === 'signup'" class="field">
              <label for="full_name">
                Full name <span>*</span>
              </label>
              <input
                id="full_name"
                v-model="form.full_name"
                type="text"
                placeholder="Enter your full name"
                autocomplete="name"
                required
                minlength="2"
              />
            </div>

            <div class="field">
              <label for="email">
                Email address <span>*</span>
              </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
            </div>

            <div v-if="mode !== 'forgot'" class="field">
              <div class="label-row">
                <label for="password">
                  Password <span>*</span>
                </label>

                <button
                  v-if="mode === 'signin'"
                  class="text-action"
                  type="button"
                  @click="setMode('forgot')"
                >
                  Forgot password?
                </button>
              </div>

              <div class="password-input">
                <input
                  id="password"
                  v-model="form.password"
                  :type="show ? 'text' : 'password'"
                  :placeholder="
                    mode === 'signup'
                      ? 'Create a password'
                      : 'Enter your password'
                  "
                  :autocomplete="
                    mode === 'signup'
                      ? 'new-password'
                      : 'current-password'
                  "
                  :minlength="mode === 'signup' ? 8 : undefined"
                  required
                />

                <button
                  class="password-toggle"
                  type="button"
                  :aria-label="show ? 'Hide password' : 'Show password'"
                  @click="show = !show"
                >
                  <i
                    :class="[
                      'fa-regular',
                      show ? 'fa-eye-slash' : 'fa-eye',
                    ]"
                    aria-hidden="true"
                  ></i>
                </button>
              </div>

              <small v-if="mode === 'signup'" class="field-hint">
                Use at least 8 characters.
              </small>
            </div>

            <button
              class="primary-button submit-button"
              type="submit"
              :disabled="!canSubmit() || loading"
            >
              <span v-if="loading" class="spinner"></span>

              {{
                loading
                  ? 'Please wait…'
                  : mode === 'signin'
                    ? 'Sign in to TrainHub'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Send reset link'
              }}

              <span v-if="!loading" class="button-arrow">→</span>
            </button>
          </form>

          <div class="form-divider">
            <span>SECURE ACCESS</span>
          </div>

          <div class="form-switch">
            <template v-if="mode === 'signin'">
              <p>
                Don't have an account?
                <button type="button" @click="register">
                  Create an account
                </button>
              </p>
            </template>

            <template v-else>
              <p>
                <button
                  type="button"
                  class="back-link"
                  @click="setMode('signin')"
                >
                  <span aria-hidden="true">←</span>
                  Back to sign in
                </button>
              </p>
            </template>
          </div>

          <p class="privacy-note">
            <span aria-hidden="true">▣</span>
            Your account information is handled securely.
          </p>

          <RouterLink to="/" class="back-to-site">
            <span aria-hidden="true">←</span>
            Back to TrainHub
          </RouterLink>
        </div>

        <footer class="form-footer">
          © {{ new Date().getFullYear() }} TrainHub.
          All rights reserved.
        </footer>
      </section>
    </div>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

.auth-page {
  --th-purple: #29143d;
  --th-purple-2: #432465;
  --th-purple-3: #6b4a88;
  --th-ink: #111014;
  --th-muted: #81758f;
  --th-border: #e7e1ec;
  --th-lilac: #f7f3fb;
  --th-gold: #f7c948;
  --th-green: #19875a;

  min-height: 100vh;
  padding: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #faf8fc;
  color: var(--th-ink);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
}

.auth-page *,
.auth-page *::before,
.auth-page *::after {
  box-sizing: border-box;
}

.auth-page button,
.auth-page input {
  font: inherit;
}

.auth-layout {
  width: 100%;
  max-width: 1100px;
  min-height: 660px;
  display: grid;
  grid-template-columns: 0.92fr 1.08fr;
  overflow: hidden;
  border: 1px solid #eae3ef;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(44, 21, 62, 0.08);
}

/* Left brand panel */

.brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 38px 40px;
  overflow: hidden;
  isolation: isolate;
  background: var(--th-purple);
  color: #fff;
}

.brand {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  color: inherit;
  text-decoration: none;
  font-family: 'Manrope', sans-serif;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.6px;
}

.brand-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 11px;
  color: #fff;
}

.brand-mark svg {
  width: 25px;
  height: 25px;
}

.brand-content {
  position: relative;
  z-index: 1;
  margin: 55px 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #9b85b0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
}

.brand-panel .eyebrow {
  color: #d4c2e6;
}

.eyebrow-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--th-gold);
}

.brand-content h1 {
  max-width: 390px;
  margin: 23px 0 17px;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(35px, 4vw, 49px);
  font-weight: 800;
  line-height: 1.13;
  letter-spacing: -2px;
}

.brand-content h1 span {
  display: block;
  color: var(--th-gold);
}

.brand-description {
  max-width: 365px;
  margin: 0;
  color: #d0c3da;
  font-size: 13px;
  line-height: 1.9;
}

.brand-points {
  display: grid;
  gap: 17px;
  margin-top: 30px;
}

.brand-points > div {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #f2edf6;
  font-size: 12px;
}

.check-icon {
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid rgba(247, 201, 72, 0.28);
  border-radius: 7px;
  background: rgba(247, 201, 72, 0.1);
  color: var(--th-gold);
  font-size: 12px;
  font-weight: 800;
}

.brand-bottom {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-bottom p {
  margin: 0;
  color: #c9b9d8;
  font-size: 11px;
}

.gold-line {
  width: 27px;
  height: 2px;
  flex-shrink: 0;
  background: var(--th-gold);
}

.decor {
  position: absolute;
  z-index: -1;
  display: block;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  pointer-events: none;
}

.decor-one {
  top: 14%;
  right: -100px;
  width: 270px;
  height: 270px;
}

.decor-two {
  right: 12%;
  bottom: -105px;
  width: 220px;
  height: 220px;
}

/* Right form panel */

.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 45px 50px 24px;
  background: #fff;
}

.mobile-brand {
  display: none;
}

.form-content {
  width: 100%;
  max-width: 390px;
  margin: auto;
  padding: 25px 0;
}

.form-heading {
  margin-bottom: 30px;
}

.form-heading h2 {
  margin: 15px 0 9px;
  color: var(--th-purple);
  font-family: 'Manrope', sans-serif;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -1.1px;
}

.form-heading > p {
  margin: 0;
  color: var(--th-muted);
  font-size: 12px;
  line-height: 1.8;
}

.auth-form {
  display: grid;
  gap: 21px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
}

.field label {
  color: #30263a;
  font-size: 11px;
  font-weight: 700;
}

.field label > span {
  color: #b53d54;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.text-action {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--th-purple-3);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.text-action:hover,
.form-switch button:hover,
.back-to-site:hover {
  color: #8053a4;
  text-decoration: underline;
}

.field input {
  width: 100%;
  min-width: 0;
  height: 47px;
  padding: 12px 14px;
  border: 1px solid #e4dce9;
  border-radius: 8px;
  outline: none;
  background: #fff;
  color: #21172b;
  font-size: 12px;
  line-height: 1.5;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field input::placeholder {
  color: #b0a6b8;
}

.field input:focus {
  border-color: #8a67a6;
  box-shadow: 0 0 0 3px rgba(100, 62, 133, 0.1);
}

.password-input {
  position: relative;
}

.password-input input {
  padding-right: 48px;
}

.password-toggle {
  position: absolute;
  top: 0;
  right: 0;
  width: 45px;
  height: 47px;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: #8c8096;
  cursor: pointer;
}

.password-toggle:hover {
  color: var(--th-purple);
}

.field-hint {
  color: #998da3;
  font-size: 10px;
  line-height: 1.55;
}

.primary-button {
  min-height: 47px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 13px 18px;
  border: 0;
  border-radius: 8px;
  background: var(--th-purple);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: var(--th-purple-2);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.submit-button {
  width: 100%;
  margin-top: 3px;
}

.button-arrow {
  margin-left: auto;
  font-size: 18px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: th-login-spin 0.7s linear infinite;
}

@keyframes th-login-spin {
  to {
    transform: rotate(360deg);
  }
}

.form-divider {
  display: flex;
  align-items: center;
  gap: 13px;
  margin: 26px 0 21px;
  color: #a095aa;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
}

.form-divider::before,
.form-divider::after {
  height: 1px;
  flex: 1;
  background: #eee9f1;
  content: '';
}

.form-switch {
  text-align: center;
}

.form-switch p {
  margin: 0;
  color: var(--th-muted);
  font-size: 11px;
  line-height: 1.8;
}

.form-switch button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--th-purple-2);
  font-size: inherit;
  font-weight: 700;
  cursor: pointer;
}

.form-switch .back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.privacy-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 25px 0 0;
  color: #9a8fa3;
  font-size: 10px;
  line-height: 1.7;
  text-align: center;
}

.privacy-note span {
  color: var(--th-purple-3);
}

.back-to-site {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-top: 22px;
  color: #8a7d96;
  font-size: 11px;
  text-decoration: none;
}

.form-footer {
  padding-top: 20px;
  border-top: 1px solid #f0eaf4;
  color: #a095aa;
  font-size: 10px;
  text-align: center;
}

/* Alerts */

.alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 20px;
  padding: 12px 13px;
  border: 1px solid;
  border-radius: 9px;
}

.alert p {
  margin: 1px 0 0;
  font-size: 11px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.alert-icon {
  width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 800;
}

.alert-error {
  border-color: #f0d2d2;
  background: #fff7f7;
  color: #a32e38;
}

.alert-error .alert-icon {
  background: #ffe6e6;
}

.alert-success {
  border-color: #ccebd8;
  background: #f3fbf6;
  color: #167447;
}

.alert-success .alert-icon {
  background: #dff5e7;
}

/* Responsive layout */

@media (max-width: 900px) {
  .auth-page {
    padding: 22px;
  }

  .auth-layout {
    max-width: 650px;
    min-height: 620px;
    grid-template-columns: 1fr;
  }

  .brand-panel {
    display: none;
  }

  .form-panel {
    padding: 28px 45px 22px;
  }

  .mobile-brand {
    display: block;
    margin-bottom: 15px;
  }

  .mobile-brand .brand {
    color: var(--th-purple);
    font-size: 17px;
  }

  .mobile-brand .brand-mark {
    border-color: #e7e1ec;
  }

  .form-content {
    max-width: 410px;
    padding: 25px 0 35px;
  }
}

@media (max-width: 480px) {
  .auth-page {
    min-height: 100vh;
    padding: 0;
    background: #fff;
  }

  .auth-layout {
    min-height: 100vh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .form-panel {
    padding: 24px 22px 18px;
  }

  .form-content {
    padding: 30px 0;
  }

  .form-heading {
    margin-bottom: 27px;
  }

  .form-heading h2 {
    font-size: 27px;
  }

  .auth-form {
    gap: 19px;
  }

  .field input {
    height: 48px;
  }

  .password-toggle {
    height: 48px;
  }

  .form-footer {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-page *,
  .auth-page *::before,
  .auth-page *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
