<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePaymentConfirmation } from '@/composables/usePaymentConfirmation'

const route = useRoute()

const reference = () => String(route.query.reference ?? '')

const {
  state,
  registrationReference,
  contactEmail,
  canResume,
  resuming,
  errorMessage,
  check,
  resume,
} = usePaymentConfirmation(reference)

onMounted(() => {
  if (reference()) {
    check()
  } else {
    state.value = 'error'
    errorMessage.value = 'Missing payment reference.'
  }
})
</script>

<template>
  <main
    class="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-[#fbfaff] px-4 py-12 sm:px-6"
  >
    <!-- Decorative background -->
    <div
      class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#e9e3ff] opacity-60 blur-3xl"
    />

    <div
      class="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#e5e1ff] opacity-60 blur-3xl"
    />

    <div class="relative w-full max-w-xl" data-aos="zoom-in">
      <!-- Brand -->
      <div class="mb-8 text-center">
        <router-link
          :to="{ name: 'home' }"
          class="inline-flex items-center gap-3"
        >
          <span
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#39218f] to-[#5140b8] text-xl text-white shadow-lg shadow-[#39218f]/20"
          >
            <i class="fa-solid fa-graduation-cap" />
          </span>

          <span class="text-2xl font-extrabold tracking-tight text-[#17143f]">
            Train<span class="text-[#5140b8]">Hub</span>
          </span>
        </router-link>

        <p class="mt-3 text-sm text-slate-500">
          Your training registration and payment status
        </p>
      </div>

      <!-- Main card -->
      <section
        class="overflow-hidden rounded-3xl border border-[#e9e5fa] bg-white shadow-xl shadow-[#20154f]/[0.06]"
      >
        <!-- Loading -->
        <div
          v-if="state === 'checking' || state === 'idle'"
          class="px-6 py-12 text-center sm:px-10 sm:py-16"
        >
          <div
            class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#f0edff]"
          >
            <span
              class="h-10 w-10 animate-spin rounded-full border-4 border-[#dcd5fa] border-t-[#39218f]"
            />
          </div>

          <p
            class="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#5140b8]"
          >
            Payment verification
          </p>

          <h1 class="mt-3 text-2xl font-extrabold text-[#17143f] sm:text-3xl">
            Confirming your payment
          </h1>

          <p class="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
            Please wait while we verify your transaction and update your
            registration. This may take a moment.
          </p>

          <div
            class="mx-auto mt-8 h-1.5 max-w-xs overflow-hidden rounded-full bg-[#eeeafb]"
          >
            <div
              class="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#39218f] to-[#7663d5]"
            />
          </div>
        </div>

        <!-- Successful payment -->
        <div
          v-else-if="state === 'paid'"
          class="px-6 py-10 text-center sm:px-10 sm:py-14"
        >
          <div
            class="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60"
          >
            <i class="fa-solid fa-circle-check text-5xl text-emerald-500" />
          </div>

          <div
            class="mt-7 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700"
          >
            <span class="h-2 w-2 rounded-full bg-emerald-500" />
            PAYMENT CONFIRMED
          </div>

          <h1
            class="mt-5 text-3xl font-extrabold tracking-tight text-[#17143f] sm:text-4xl"
          >
            You're registered!
          </h1>

          <p class="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-500 sm:text-base">
            Your payment has been confirmed successfully. A confirmation
            email is on its way. We look forward to having you at the training.
          </p>

          <!-- Registration reference -->
          <div
            v-if="registrationReference"
            class="mx-auto mt-8 max-w-sm rounded-2xl border border-[#e9e5fa] bg-[#fbfaff] p-5 text-left"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Registration reference
                </p>

                <p class="mt-2 break-all text-base font-bold text-[#39218f]">
                  {{ registrationReference }}
                </p>
              </div>

              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0edff] text-[#39218f]"
              >
                <i class="fa-solid fa-receipt text-lg" />
              </span>
            </div>
          </div>

          <router-link
            :to="{ name: 'home' }"
            class="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#39218f] to-[#5140b8] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#39218f]/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#39218f]/20 sm:w-auto sm:min-w-64"
          >
            Explore more trainings
            <i class="fa-solid fa-arrow-right" />
          </router-link>
        </div>

        <!-- Failed or pending payment -->
        <div
          v-else-if="state === 'failed' || state === 'pending'"
          class="px-6 py-10 sm:px-10 sm:py-12"
        >
          <div class="text-center">
            <div
              class="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl"
              :class="
                state === 'failed'
                  ? 'bg-red-50'
                  : 'bg-amber-50'
              "
            >
              <i
                :class="[
                  'text-5xl',
                  state === 'failed'
                    ? 'fa-solid fa-circle-xmark text-red-500'
                    : 'fa-solid fa-hourglass-half text-amber-500',
                ]"
              />
            </div>

            <div
              class="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
              :class="
                state === 'failed'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-700'
              "
            >
              <span
                class="h-2 w-2 rounded-full"
                :class="
                  state === 'failed'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                "
              />

              {{ state === 'failed' ? 'PAYMENT UNSUCCESSFUL' : 'AWAITING CONFIRMATION' }}
            </div>

            <h1
              class="mt-5 text-2xl font-extrabold tracking-tight text-[#17143f] sm:text-3xl"
            >
              {{
                state === 'failed'
                  ? 'Payment unsuccessful'
                  : 'Payment is still processing'
              }}
            </h1>

            <p class="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
              {{
                state === 'failed'
                  ? 'We could not confirm a successful payment. You can try again to complete your registration.'
                  : 'We have not received payment confirmation yet. If you completed payment, check the status again before attempting another payment.'
              }}
            </p>
          </div>

          <!-- Seat notice -->
          <div
            class="mt-7 flex items-start gap-3 rounded-2xl border p-4"
            :class="
              state === 'failed'
                ? 'border-red-100 bg-red-50/70'
                : 'border-amber-100 bg-amber-50/70'
            "
          >
            <i
              :class="[
                'mt-0.5 text-lg',
                state === 'failed'
                  ? 'fa-solid fa-circle-info text-red-500'
                  : 'fa-solid fa-clock text-amber-600',
              ]"
            />

            <p class="text-sm leading-6 text-slate-600">
              {{
                state === 'failed'
                  ? 'Your seat may be held temporarily. Complete payment as soon as possible to avoid losing your place.'
                  : 'If you have already paid, allow time for confirmation and check again before making another payment.'
              }}
            </p>
          </div>

          <!-- Error -->
          <div
            v-if="errorMessage"
            role="alert"
            class="mt-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"
          >
            <i class="fa-solid fa-triangle-exclamation mt-1" />
            <p>{{ errorMessage }}</p>
          </div>

          <!-- Email -->
          <div class="mt-7">
            <label
              for="contact-email"
              class="mb-2 block text-sm font-semibold text-[#17143f]"
            >
              Email used for registration
            </label>

            <div class="relative">
              <i
                class="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400"
              />

              <input
                id="contact-email"
                v-model="contactEmail"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                class="min-h-12 w-full rounded-xl border border-[#e2ddf1] bg-white py-3 pl-12 pr-4 text-sm text-[#17143f] outline-none transition placeholder:text-slate-400 focus:border-[#5140b8] focus:ring-4 focus:ring-[#39218f]/10"
              />
            </div>

            <p class="mt-2 text-xs leading-5 text-slate-500">
              Enter the email address you used when registering so we can
              verify your registration.
            </p>
          </div>

          <!-- Actions -->
          <div class="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              v-if="state === 'pending'"
              type="button"
              class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d9d1f3] bg-white px-5 py-3 text-sm font-semibold text-[#39218f] transition hover:bg-[#f7f5ff] focus:outline-none focus:ring-4 focus:ring-[#39218f]/10"
              @click="check"
            >
              <i class="fa-solid fa-rotate" />
              Check payment
            </button>

            <button
              type="button"
              :disabled="!canResume || resuming"
              class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#39218f] to-[#5140b8] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#39218f]/15 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#39218f]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              @click="resume"
            >
              <i
                :class="[
                  resuming ? 'fa-solid fa-spinner animate-spin' : 'fa-solid fa-rotate-right',
                ]"
              />

              {{
                resuming
                  ? 'Preparing payment...'
                  : state === 'failed'
                    ? 'Retry payment'
                    : 'Pay again'
              }}
            </button>
          </div>

          <p class="mt-5 text-center text-xs leading-5 text-slate-400">
            If you have already paid, verify your payment status before
            initiating another transaction.
          </p>
        </div>

        <!-- General error / missing reference -->
        <div
          v-else
          class="px-6 py-10 text-center sm:px-10 sm:py-14"
        >
          <div
            class="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-red-50"
          >
            <i
              class="fa-solid fa-triangle-exclamation text-5xl text-red-500"
            />
          </div>

          <h1 class="mt-6 text-2xl font-extrabold text-[#17143f] sm:text-3xl">
            Unable to verify payment
          </h1>

          <p class="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            {{ errorMessage || 'We could not verify this payment. Please try again.' }}
          </p>

          <button
            v-if="reference()"
            type="button"
            class="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#39218f] to-[#5140b8] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-[#39218f]/20 sm:w-auto sm:min-w-48"
            @click="check"
          >
            <i class="fa-solid fa-rotate-right" />
            Try again
          </button>

          <router-link
            v-else
            :to="{ name: 'home' }"
            class="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#39218f] to-[#5140b8] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 sm:w-auto sm:min-w-48"
          >
            <i class="fa-solid fa-arrow-left" />
            Back to trainings
          </router-link>
        </div>
      </section>

      <!-- Footer -->
      <footer class="mt-7 text-center">
        <p class="text-xs leading-6 text-slate-400">
          <i class="fa-solid fa-shield-halved mr-1 text-[#5140b8]" />
          Secure registration powered by TrainHub
        </p>

        <router-link
          :to="{ name: 'home' }"
          class="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#5140b8] transition hover:text-[#281765]"
        >
          <i class="fa-solid fa-arrow-left text-xs" />
          Back to trainings
        </router-link>
      </footer>
    </div>
  </main>
</template>