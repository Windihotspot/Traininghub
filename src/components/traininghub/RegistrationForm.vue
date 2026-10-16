<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useRegistration, MAX_PARTICIPANTS } from '@/composables/useRegistration'
import { formatMoney } from '@/utils/format'
import { savePendingPayment } from '@/utils/pendingPayment'

const props = defineProps<{ trainingId: string; currency?: string }>()
const router = useRouter()
const r = useRegistration(() => props.trainingId)

const required = (v: string) => !!v?.trim() || 'Required'
const email = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v?.trim() ?? '') || 'Enter a valid email'

async function onSubmit() {
  const res = await r.submit()
  if (!res) return
  savePendingPayment({ registration_reference: res.registration.reference, contact_email: r.contact.email.trim() })
  if (res.payment.checkout_url) window.location.href = res.payment.checkout_url
  else router.push({ name: 'registration-confirmation', query: { reference: res.payment.reference } })
}
</script>

<template>
  <div class="max-w-3xl mx-auto" data-aos="fade-up">
    <v-alert v-if="r.error.value" type="error" variant="tonal" class="mb-4" closable>
      {{ r.error.value.message }}
    </v-alert>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4"><i class="fa-solid fa-user-group mr-2 text-primary"></i>Registration type</h3>
      <v-btn-toggle v-model="r.type.value" mandatory color="primary" class="mb-4" divided>
        <v-btn value="individual">Individual</v-btn>
        <v-btn value="corporate">Corporate</v-btn>
      </v-btn-toggle>
      <v-text-field v-if="r.type.value === 'corporate'" v-model="r.companyName.value" label="Company name"
        :rules="[required]" variant="outlined" density="comfortable" />
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4"><i class="fa-solid fa-address-card mr-2 text-primary"></i>Contact person</h3>
      <div class="grid md:grid-cols-3 gap-4">
        <v-text-field v-model="r.contact.name" label="Full name" :rules="[required]" variant="outlined" density="comfortable" />
        <v-text-field v-model="r.contact.email" label="Email" type="email" :rules="[email]" variant="outlined" density="comfortable" />
        <v-text-field v-model="r.contact.phone" label="Phone (optional)" variant="outlined" density="comfortable" />
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold"><i class="fa-solid fa-users mr-2 text-primary"></i>Participants ({{ r.participants.value.length }})</h3>
        <v-btn v-if="r.type.value === 'corporate'" size="small" variant="tonal" color="primary"
          :disabled="r.participants.value.length >= MAX_PARTICIPANTS" @click="r.addParticipant">
          <i class="fa-solid fa-plus mr-2"></i>Add participant
        </v-btn>
      </div>

      <div v-for="(p, i) in r.participants.value" :key="i" class="border border-gray-100 rounded-xl p-4 mb-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium text-gray-500">Participant {{ i + 1 }}</span>
          <v-btn v-if="r.participants.value.length > 1" icon size="x-small" variant="text" color="error" @click="r.removeParticipant(i)">
            <i class="fa-solid fa-trash"></i>
          </v-btn>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <v-text-field v-model="p.first_name" label="First name" :rules="[required]" variant="outlined" density="comfortable" />
          <v-text-field v-model="p.last_name" label="Last name" :rules="[required]" variant="outlined" density="comfortable" />
          <v-text-field v-model="p.email" label="Email" type="email" variant="outlined" density="comfortable"
            :rules="[email, () => !r.duplicateEmails.value.has(p.email.trim().toLowerCase()) || 'Duplicate email']" />
          <v-text-field v-model="p.phone" label="Phone (optional)" variant="outlined" density="comfortable" />
          <v-text-field v-model="p.job_title" label="Job title (optional)" variant="outlined" density="comfortable" class="md:col-span-2" />
        </div>
      </div>
    </div>

    <div class="bg-gray-50 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
      <div v-if="r.pricing.value" class="text-sm space-y-1">
        <div>Subtotal: <b>{{ formatMoney(r.pricing.value.subtotal, r.pricing.value.currency ?? currency) }}</b></div>
        <div v-if="r.pricing.value.discount_amount > 0" class="text-green-600">
          Discount: −{{ formatMoney(r.pricing.value.discount_amount, r.pricing.value.currency ?? currency) }}
        </div>
        <div class="text-lg">Total: <b>{{ formatMoney(r.pricing.value.total_amount, r.pricing.value.currency ?? currency) }}</b></div>
      </div>
      <v-btn color="primary" size="large" :loading="r.loading.value" :disabled="!r.isValid.value" @click="onSubmit">
        <i class="fa-solid fa-lock mr-2"></i>Register &amp; pay
      </v-btn>
    </div>
  </div>
</template>
