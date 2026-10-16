<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePaymentConfirmation } from '@/composables/usePaymentConfirmation'

const route = useRoute()
const reference = () => String(route.query.reference ?? '')
const { state, registrationReference, contactEmail, canResume, resuming, errorMessage, check, resume } =
  usePaymentConfirmation(reference)

onMounted(() => {
  if (reference()) check()
  else { state.value = 'error'; errorMessage.value = 'Missing payment reference.' }
})
</script>

<template>
  <div class="max-w-lg mx-auto text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-8" data-aos="zoom-in">
    <template v-if="state === 'checking' || state === 'idle'">
      <v-progress-circular indeterminate color="primary" class="mb-4" />
      <p class="text-gray-600">Confirming your payment…</p>
    </template>

    <template v-else-if="state === 'paid'">
      <i class="fa-solid fa-circle-check text-6xl text-green-500 mb-4"></i>
      <h2 class="text-2xl font-semibold mb-2">Registration confirmed</h2>
      <p class="text-gray-600 mb-1">A confirmation email is on its way.</p>
      <p v-if="registrationReference" class="text-sm text-gray-500">Ref: {{ registrationReference }}</p>
      <v-btn class="mt-6" color="primary" :to="{ name: 'home' }">Back to trainings</v-btn>
    </template>

    <template v-else-if="state === 'failed' || state === 'pending'">
      <template v-if="state === 'failed'">
        <i class="fa-solid fa-circle-xmark text-6xl text-red-500 mb-4"></i>
        <h2 class="text-2xl font-semibold mb-2">Payment unsuccessful</h2>
        <p class="text-gray-600 mb-4">Your seat is held for a limited time. You can try again.</p>
      </template>
      <template v-else>
        <i class="fa-solid fa-hourglass-half text-6xl text-amber-500 mb-4"></i>
        <h2 class="text-2xl font-semibold mb-2">Still processing</h2>
        <p class="text-gray-600 mb-4">We haven't received confirmation yet. If you did not complete payment, you can restart it.</p>
      </template>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-3 text-left">{{ errorMessage }}</v-alert>
      <v-text-field v-model="contactEmail" type="email" label="Email used to register" variant="outlined"
        density="comfortable" hint="Needed to verify it's your registration" persistent-hint class="mb-4" />
      <div class="flex gap-3 justify-center">
        <v-btn v-if="state === 'pending'" variant="tonal" @click="check">Check again</v-btn>
        <v-btn color="primary" :loading="resuming" :disabled="!canResume" @click="resume">
          <i class="fa-solid fa-rotate-right mr-2"></i>{{ state === 'failed' ? 'Retry payment' : 'Pay again' }}
        </v-btn>
      </div>
    </template>

    <template v-else>
      <i class="fa-solid fa-triangle-exclamation text-6xl text-red-500 mb-4"></i>
      <p class="text-gray-700 mb-4">{{ errorMessage }}</p>
      <v-btn v-if="reference()" variant="tonal" @click="check">Try again</v-btn>
    </template>
  </div>
</template>
