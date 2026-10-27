<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { TrainingsService, DiscountsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatMoney } from '@/utils/format'
import type { Discount } from '@/types/traininghub'

const props = defineProps<{ organisationId: string; trainingId: string }>()
const items = ref<Discount[]>([])
const { loading, error, run } = useAsyncAction()
const form = reactive({ name: 'Group discount', min_participants: 4, type: 'percentage' as 'percentage' | 'fixed', value: 10 })

const load = () => run(async () => { items.value = await TrainingsService.listDiscounts(props.trainingId) })
const valid = computed(() => form.name.trim() && form.min_participants >= 2 && form.value > 0 && (form.type !== 'percentage' || form.value <= 100))
const describe = (d: Discount) => (d.type === 'percentage' ? `${d.value}% off` : `${formatMoney(d.value)} off the whole registration`)

const add = () => run(async () => {
  await DiscountsService.create(props.organisationId, props.trainingId, { ...form, name: form.name.trim() })
  await load()
})
const toggle = (d: Discount, on: boolean) => run(async () => { await DiscountsService.setActive(d.id, on); d.is_active = on })
const remove = (d: Discount) => { if (window.confirm(`Delete "${d.name}"?`)) run(async () => { await DiscountsService.remove(d.id); await load() }) }

onMounted(load)
</script>

<template>
  <div class="th-discounts mt-4">
    <div v-if="error" class="alert alert-error" role="alert">
      <span class="alert-icon">!</span>
      <p>{{ error.message }}</p>
    </div>

    <p class="intro">
      Percentage rules apply to the subtotal; fixed rules take an amount off the whole registration. The best applicable rule wins.
    </p>

    <form class="add-form" @submit.prevent="add">
      <div class="field name-field">
        <label for="d-name">Name</label>
        <input id="d-name" v-model="form.name" type="text" />
      </div>
      <div class="field">
        <label for="d-min">Min participants</label>
        <input id="d-min" v-model.number="form.min_participants" type="number" min="2" />
      </div>
      <div class="field">
        <label for="d-type">Type</label>
        <select id="d-type" v-model="form.type">
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed amount</option>
        </select>
      </div>
      <div class="field">
        <label for="d-value">{{ form.type === 'percentage' ? 'Percent' : 'Amount' }}</label>
        <input id="d-value" v-model.number="form.value" type="number" min="1" :max="form.type === 'percentage' ? 100 : undefined" />
      </div>
      <button class="primary-button" type="submit" :disabled="!valid || loading">
        <span v-if="loading" class="spinner"></span>
        <i v-else class="fa-solid fa-plus"></i>
        Add rule
      </button>
    </form>

    <p v-if="!items.length && !loading" class="empty">
      <span class="gold-line"></span>
      No discount rules yet. Add one above to reward group registrations.
    </p>

    <ul v-if="items.length" class="rules">
      <li v-for="d in items" :key="d.id" class="rule" :class="{ 'is-off': !d.is_active }">
        <div class="rule-info">
          <span class="rule-icon"><i class="fa-solid fa-tag"></i></span>
          <div>
            <div class="rule-name">{{ d.name }}</div>
            <div class="rule-meta">{{ d.min_participants }}+ participants · {{ describe(d) }}</div>
          </div>
        </div>
        <div class="rule-actions">
          <label class="switch" :title="d.is_active ? 'Active' : 'Inactive'">
            <input
              type="checkbox"
              role="switch"
              :checked="d.is_active"
              :disabled="loading"
              :aria-label="`${d.is_active ? 'Deactivate' : 'Activate'} ${d.name}`"
              @change="toggle(d, ($event.target as HTMLInputElement).checked)"
            />
            <span class="switch-track" aria-hidden="true"></span>
          </label>
          <button class="icon-button" type="button" :disabled="loading" :aria-label="`Delete ${d.name}`" @click="remove(d)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

.th-discounts {
  --th-purple: #29143d;
  --th-purple-2: #432465;
  --th-purple-3: #6b4a88;
  --th-ink: #111014;
  --th-muted: #81758f;
  --th-lilac: #f7f3fb;
  --th-gold: #f7c948;

  color: var(--th-ink);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
}
.th-discounts *, .th-discounts *::before, .th-discounts *::after { box-sizing: border-box; }
.th-discounts button, .th-discounts input, .th-discounts select { font: inherit; }

.intro { margin: 0 0 20px; color: var(--th-muted); font-size: 12px; line-height: 1.8; max-width: 640px; }

/* Add form */
.add-form {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr auto;
  gap: 16px;
  align-items: end;
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid #eae3ef;
  border-radius: 16px;
  background: linear-gradient(120deg, #fff, #fbf8fe);
}

.field { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.field label { color: #30263a; font-size: 11px; font-weight: 700; }
.field input, .field select {
  width: 100%; min-width: 0; height: 47px; padding: 12px 14px;
  border: 1px solid #e4dce9; border-radius: 8px; outline: none;
  background: #fff; color: #21172b; font-size: 12px; line-height: 1.5;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field input:focus, .field select:focus { border-color: #8a67a6; box-shadow: 0 0 0 3px rgba(100, 62, 133, 0.1); }
.field select {
  appearance: none; padding-right: 38px; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%238c8096' stroke-width='1.6'%3E%3Cpath d='m1 1.5 5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
}

.primary-button {
  min-height: 47px; display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  padding: 13px 20px; border: 0; border-radius: 8px; white-space: nowrap;
  background: var(--th-purple); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.primary-button:hover:not(:disabled) { transform: translateY(-1px); background: var(--th-purple-2); }
.primary-button:disabled { cursor: not-allowed; opacity: 0.55; }
.spinner {
  width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff; border-radius: 50%; animation: th-disc-spin 0.7s linear infinite;
}
@keyframes th-disc-spin { to { transform: rotate(360deg); } }

/* Empty state */
.empty { display: flex; align-items: center; gap: 12px; margin: 0; color: var(--th-muted); font-size: 12px; line-height: 1.6; }
.gold-line { width: 27px; height: 2px; flex-shrink: 0; background: var(--th-gold); }

/* Rules list */
.rules { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.rule {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px; border: 1px solid #eae3ef; border-radius: 12px; background: #fff;
  box-shadow: 0 8px 24px rgba(44, 21, 62, 0.03);
}
.rule-info { display: flex; align-items: center; gap: 13px; min-width: 0; transition: opacity 0.2s; }
.rule.is-off .rule-info { opacity: 0.5; }
.rule-icon {
  display: grid; place-items: center; flex: 0 0 38px; width: 38px; height: 38px;
  border: 1px solid rgba(247, 201, 72, 0.28); border-radius: 11px;
  background: var(--th-purple); color: var(--th-gold); font-size: 13px;
}
.rule-name { color: var(--th-purple); font: 800 14px 'Manrope', sans-serif; letter-spacing: -0.3px; }
.rule-meta { margin-top: 3px; color: var(--th-muted); font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.rule-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

/* Switch */
.switch { position: relative; display: inline-flex; cursor: pointer; }
.switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.switch-track { position: relative; width: 34px; height: 20px; border-radius: 20px; background: #d9d0e0; transition: background 0.2s; }
.switch-track::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
  border-radius: 50%; background: #fff; transition: transform 0.2s;
}
.switch input:checked + .switch-track { background: var(--th-purple); }
.switch input:checked + .switch-track::after { transform: translateX(14px); background: var(--th-gold); }
.switch input:focus-visible + .switch-track { box-shadow: 0 0 0 3px rgba(100, 62, 133, 0.2); }
.switch input:disabled { cursor: not-allowed; }

/* Delete */
.icon-button {
  width: 36px; height: 36px; display: grid; place-items: center;
  border: 1px solid transparent; border-radius: 8px; background: transparent;
  color: #8c8096; font-size: 12px; cursor: pointer; transition: color 0.2s, background 0.2s, border-color 0.2s;
}
.icon-button:hover:not(:disabled) { border-color: #f0d2d2; background: #fff7f7; color: #a32e38; }
.icon-button:disabled { cursor: not-allowed; opacity: 0.5; }

/* Alerts */
.alert { display: flex; align-items: flex-start; gap: 10px; margin: 0 0 16px; padding: 12px 13px; border: 1px solid; border-radius: 9px; }
.alert p { margin: 1px 0 0; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.alert-icon { width: 19px; height: 19px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; font-size: 11px; font-weight: 800; }
.alert-error { border-color: #f0d2d2; background: #fff7f7; color: #a32e38; }
.alert-error .alert-icon { background: #ffe6e6; }

/* Responsive */
@media (max-width: 900px) {
  .add-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .name-field { grid-column: span 2; }
  .add-form .primary-button { grid-column: span 2; }
}
@media (max-width: 480px) {
  .add-form { grid-template-columns: minmax(0, 1fr); padding: 16px; }
  .name-field, .add-form .primary-button { grid-column: auto; }
  .rule { padding: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .th-discounts *, .th-discounts *::before, .th-discounts *::after {
    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important;
  }
}
</style>