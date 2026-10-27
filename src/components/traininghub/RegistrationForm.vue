<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useRegistration, MAX_PARTICIPANTS } from '@/composables/useRegistration'
import { formatMoney } from '@/utils/format'
import { savePendingPayment } from '@/utils/pendingPayment'

const props = defineProps<{ trainingId: string; currency?: string }>()
const router = useRouter()
const r = useRegistration(() => props.trainingId)

type Rule = (v: string) => true | string
const required: Rule = (v) => !!v?.trim() || 'Required'
const email: Rule = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v?.trim() ?? '') || 'Enter a valid email'

// Errors show only after a field has been blurred
const touched = reactive<Record<string, boolean>>({})
const touch = (k: string) => { touched[k] = true }
const msg = (k: string, v: string, ...rules: Rule[]) => {
  if (!touched[k]) return ''
  for (const rule of rules) { const res = rule(v); if (res !== true) return res }
  return ''
}
const dup = (p: { email: string }): Rule => () => !r.duplicateEmails.value.has(p.email.trim().toLowerCase()) || 'Duplicate email'
const removeParticipant = (i: number) => {
  Object.keys(touched).forEach((k) => k.startsWith('p') && delete touched[k])
  r.removeParticipant(i)
}

async function onSubmit() {
  const res = await r.submit()
  if (!res) return
  savePendingPayment({ registration_reference: res.registration.reference, contact_email: r.contact.email.trim() })
  if (res.payment.checkout_url) window.location.href = res.payment.checkout_url
  else router.push({ name: 'registration-confirmation', query: { reference: res.payment.reference } })
}
</script>

<template>
  <form class="th-reg max-w-3xl mx-auto flex flex-col gap-5" data-aos="fade-up" @submit.prevent="onSubmit">
    <div v-if="r.error.value" class="alert alert-error" role="alert">
      <span class="alert-icon">!</span>
      <p>{{ r.error.value.message }}</p>
    </div>

    <!-- Registration type -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-user-group"></i></span>
        <div><h2>Registration type</h2><p>Register yourself, or a team from your company.</p></div>
      </div>
      <div class="flex flex-col gap-5">
        <el-radio-group v-model="r.type.value" class="type-toggle">
          <el-radio-button value="individual">Individual</el-radio-button>
          <el-radio-button value="corporate">Corporate</el-radio-button>
        </el-radio-group>
        <div v-if="r.type.value === 'corporate'" :class="['field', { 'has-error': msg('company', r.companyName.value, required) }]">
          <label for="company">Company name <span>*</span></label>
          <el-input id="company" v-model="r.companyName.value" @blur="touch('company')" />
          <small v-if="msg('company', r.companyName.value, required)" class="field-error">{{ msg('company', r.companyName.value, required) }}</small>
        </div>
      </div>
    </section>

    <!-- Contact -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-address-card"></i></span>
        <div><h2>Contact person</h2><p>We send the receipt and confirmation here.</p></div>
      </div>
      <div class="grid grid-cols-3 gap-x-4 gap-y-5 max-md:grid-cols-1">
        <div :class="['field', { 'has-error': msg('c.name', r.contact.name, required) }]">
          <label for="c_name">Full name <span>*</span></label>
          <el-input id="c_name" v-model="r.contact.name" @blur="touch('c.name')" />
          <small v-if="msg('c.name', r.contact.name, required)" class="field-error">{{ msg('c.name', r.contact.name, required) }}</small>
        </div>
        <div :class="['field', { 'has-error': msg('c.email', r.contact.email, email) }]">
          <label for="c_email">Email <span>*</span></label>
          <el-input id="c_email" v-model="r.contact.email" type="email" @blur="touch('c.email')" />
          <small v-if="msg('c.email', r.contact.email, email)" class="field-error">{{ msg('c.email', r.contact.email, email) }}</small>
        </div>
        <div class="field">
          <label for="c_phone">Phone (optional)</label>
          <el-input id="c_phone" v-model="r.contact.phone" />
        </div>
      </div>
    </section>

    <!-- Participants -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-users"></i></span>
        <div><h2>Participants ({{ r.participants.value.length }})</h2><p>Everyone who will attend the training.</p></div>
        <el-button v-if="r.type.value === 'corporate'" class="ghost-button ml-auto" size="small"
          :disabled="r.participants.value.length >= MAX_PARTICIPANTS" @click="r.addParticipant">
          <i class="fa-solid fa-plus mr-2"></i>Add participant
        </el-button>
      </div>

      <div class="flex flex-col gap-4">
        <div v-for="(p, i) in r.participants.value" :key="i" class="p-card">
          <div class="flex justify-between items-center mb-4">
            <span class="p-label">Participant {{ i + 1 }}</span>
            <el-button v-if="r.participants.value.length > 1" text circle size="small" class="danger" aria-label="Remove participant" @click="removeParticipant(i)">
              <i class="fa-solid fa-trash"></i>
            </el-button>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-5 max-sm:grid-cols-1">
            <div :class="['field', { 'has-error': msg(`p${i}.first`, p.first_name, required) }]">
              <label :for="`p${i}_first`">First name <span>*</span></label>
              <el-input :id="`p${i}_first`" v-model="p.first_name" @blur="touch(`p${i}.first`)" />
              <small v-if="msg(`p${i}.first`, p.first_name, required)" class="field-error">{{ msg(`p${i}.first`, p.first_name, required) }}</small>
            </div>
            <div :class="['field', { 'has-error': msg(`p${i}.last`, p.last_name, required) }]">
              <label :for="`p${i}_last`">Last name <span>*</span></label>
              <el-input :id="`p${i}_last`" v-model="p.last_name" @blur="touch(`p${i}.last`)" />
              <small v-if="msg(`p${i}.last`, p.last_name, required)" class="field-error">{{ msg(`p${i}.last`, p.last_name, required) }}</small>
            </div>
            <div :class="['field', { 'has-error': msg(`p${i}.email`, p.email, email, dup(p)) }]">
              <label :for="`p${i}_email`">Email <span>*</span></label>
              <el-input :id="`p${i}_email`" v-model="p.email" type="email" @blur="touch(`p${i}.email`)" />
              <small v-if="msg(`p${i}.email`, p.email, email, dup(p))" class="field-error">{{ msg(`p${i}.email`, p.email, email, dup(p)) }}</small>
            </div>
            <div class="field">
              <label :for="`p${i}_phone`">Phone (optional)</label>
              <el-input :id="`p${i}_phone`" v-model="p.phone" />
            </div>
            <div class="field col-span-2 max-sm:col-span-1">
              <label :for="`p${i}_job`">Job title (optional)</label>
              <el-input :id="`p${i}_job`" v-model="p.job_title" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Summary -->
    <div class="form-actions">
      <div v-if="r.pricing.value" class="summary">
        <div>Subtotal <b>{{ formatMoney(r.pricing.value.subtotal, r.pricing.value.currency ?? currency) }}</b></div>
        <div v-if="r.pricing.value.discount_amount > 0" class="discount">
          Discount −{{ formatMoney(r.pricing.value.discount_amount, r.pricing.value.currency ?? currency) }}
        </div>
        <div class="total">Total <b>{{ formatMoney(r.pricing.value.total_amount, r.pricing.value.currency ?? currency) }}</b></div>
      </div>
      <span v-else class="save-note"><span class="gold-line"></span>Your total appears once the form is complete.</span>
      <el-button class="primary-button" type="primary" native-type="submit" :loading="r.loading.value" :disabled="!r.isValid.value">
        <i class="fa-solid fa-lock mr-2"></i>Register &amp; pay
      </el-button>
    </div>
  </form>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

.th-reg {
  --th-purple: #29143d;
  --th-purple-2: #432465;
  --th-purple-3: #6b4a88;
  --th-ink: #111014;
  --th-muted: #81758f;
  --th-border: #e7e1ec;
  --th-lilac: #f7f3fb;
  --th-gold: #f7c948;
  --th-green: #19875a;

  --el-color-primary: #29143d;
  --el-color-primary-light-3: #6b4a88;
  --el-color-primary-light-5: #a38bb8;
  --el-color-primary-light-7: #d9d0e0;
  --el-color-primary-light-9: #f7f3fb;
  --el-color-primary-dark-2: #432465;
  --el-border-radius-base: 8px;
  --el-font-family: 'DM Sans', sans-serif;

  color: var(--th-ink);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
}
.th-reg *, .th-reg *::before, .th-reg *::after { box-sizing: border-box; }

.th-reg .form-section {
  padding: 27px 28px 28px;
  border: 1px solid #eae3ef; border-radius: 20px; background: #fff;
  box-shadow: 0 20px 60px rgba(44, 21, 62, 0.06);
}
.th-reg .section-heading { display: flex; align-items: center; gap: 13px; margin-bottom: 25px; }
.th-reg .section-icon {
  display: grid; place-items: center; flex: 0 0 38px; width: 38px; height: 38px;
  border: 1px solid rgba(247, 201, 72, 0.28); border-radius: 11px;
  background: var(--th-purple); color: var(--th-gold); font-size: 14px;
}
.th-reg h2 { margin: 0 0 4px; color: var(--th-purple); font: 800 18px 'Manrope', sans-serif; letter-spacing: -0.5px; }
.th-reg .section-heading p { margin: 0; color: var(--th-muted); font-size: 12px; line-height: 1.7; }

.th-reg .p-card { padding: 20px; border: 1px solid #eae3ef; border-radius: 14px; background: #fcfaff; }
.th-reg .p-label { color: var(--th-purple-3); font-size: 12px; font-weight: 700; }
.th-reg .danger { color: #a32e38; }

/* Fields */
.th-reg .field { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.th-reg .field label { color: #30263a; font-size: 11px; font-weight: 700; }
.th-reg .field label > span { color: #b53d54; }
.th-reg .field-error { color: #a32e38; font-size: 10px; line-height: 1.55; }
.th-reg .el-input__wrapper {
  min-height: 47px; padding: 0 14px; border-radius: 8px;
  box-shadow: 0 0 0 1px #e4dce9 inset; background: #fff; font-size: 12px; transition: box-shadow 0.2s;
}
.th-reg .el-input__wrapper.is-focus { box-shadow: 0 0 0 1px #8a67a6 inset, 0 0 0 4px rgba(100, 62, 133, 0.1); }
.th-reg .has-error .el-input__wrapper { box-shadow: 0 0 0 1px #d98a94 inset; }

/* Type toggle */
.th-reg .type-toggle .el-radio-button__inner {
  min-height: 47px; display: inline-flex; align-items: center; padding: 0 26px;
  font-size: 12px; font-weight: 700; color: #30263a; border-color: #e4dce9;
}
.th-reg .type-toggle .el-radio-button__original-radio:checked + .el-radio-button__inner {
  background: var(--th-purple); border-color: var(--th-purple); color: var(--th-gold); box-shadow: -1px 0 0 0 var(--th-purple);
}
.th-reg .type-toggle .el-radio-button:first-child .el-radio-button__inner { border-radius: 8px 0 0 8px; }
.th-reg .type-toggle .el-radio-button:last-child .el-radio-button__inner { border-radius: 0 8px 8px 0; }

/* Actions + summary */
.th-reg .form-actions {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 18px;
  padding: 21px 24px; border: 1px solid #eae3ef; border-radius: 16px;
  background: linear-gradient(120deg, #fff, #fbf8fe);
}
.th-reg .summary { display: grid; gap: 4px; color: var(--th-muted); font-size: 12px; }
.th-reg .summary b { color: #30263a; margin-left: 6px; }
.th-reg .summary .discount { color: var(--th-green); font-weight: 600; }
.th-reg .summary .total { color: var(--th-purple); font: 700 15px 'Manrope', sans-serif; }
.th-reg .summary .total b { color: var(--th-purple); font-weight: 800; }
.th-reg .save-note { display: flex; align-items: center; gap: 12px; color: var(--th-muted); font-size: 12px; }
.th-reg .gold-line { width: 27px; height: 2px; flex-shrink: 0; background: var(--th-gold); }

.th-reg .primary-button.el-button {
  min-height: 47px; padding: 13px 20px; border: 0; border-radius: 8px;
  background: var(--th-purple); color: #fff; font-size: 12px; font-weight: 700;
  transition: background 0.2s, transform 0.2s;
}
.th-reg .primary-button.el-button:hover:not(.is-disabled) { transform: translateY(-1px); background: var(--th-purple-2); }
.th-reg .primary-button.el-button.is-disabled { opacity: 0.55; }
.th-reg .ghost-button.el-button { border-color: #e4dce9; border-radius: 8px; color: #30263a; font-weight: 700; }
.th-reg .el-button.is-text:not(.is-disabled):hover { background: var(--th-lilac); color: var(--th-purple); }

/* Alerts */
.th-reg .alert { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border: 1px solid; border-radius: 9px; }
.th-reg .alert p { margin: 1px 0 0; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.th-reg .alert-icon { width: 19px; height: 19px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; font-size: 11px; font-weight: 800; }
.th-reg .alert-error { border-color: #f0d2d2; background: #fff7f7; color: #a32e38; }
.th-reg .alert-error .alert-icon { background: #ffe6e6; }

@media (max-width: 600px) {
  .th-reg .form-section { padding: 21px 17px; }
  .th-reg .section-heading { flex-wrap: wrap; }
  .th-reg .form-actions { align-items: stretch; flex-direction: column; padding: 18px; }
  .th-reg .primary-button.el-button { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .th-reg *, .th-reg *::before, .th-reg *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
</style>