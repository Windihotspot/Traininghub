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
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error.message }}</v-alert>
    <p class="text-sm text-gray-500 mb-4">Percentage rules apply to the subtotal; fixed rules take an amount off the whole registration. The best applicable rule wins.</p>

    <form class="grid md:grid-cols-5 gap-3 mb-4" @submit.prevent="add">
      <v-text-field v-model="form.name" label="Name" variant="outlined" density="compact" hide-details />
      <v-text-field v-model.number="form.min_participants" type="number" min="2" label="Min participants" variant="outlined" density="compact" hide-details />
      <v-select v-model="form.type" :items="[{ title: 'Percentage', value: 'percentage' }, { title: 'Fixed amount', value: 'fixed' }]" label="Type" variant="outlined" density="compact" hide-details />
      <v-text-field v-model.number="form.value" type="number" min="1" :label="form.type === 'percentage' ? 'Percent' : 'Amount'" variant="outlined" density="compact" hide-details />
      <v-btn type="submit" color="primary" :loading="loading" :disabled="!valid"><i class="fa-solid fa-plus mr-2"></i>Add</v-btn>
    </form>

    <p v-if="!items.length && !loading" class="text-gray-500 text-sm">No discount rules.</p>
    <div v-for="d in items" :key="d.id" class="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-2 mb-2">
      <div class="text-sm"><b>{{ d.name }}</b> · {{ d.min_participants }}+ participants · {{ describe(d) }}</div>
      <div class="flex items-center gap-2">
        <v-switch :model-value="d.is_active" color="primary" hide-details density="compact" :disabled="loading" @update:model-value="(v: boolean | null) => toggle(d, !!v)" />
        <v-btn icon size="small" variant="text" color="error" :disabled="loading" @click="remove(d)"><i class="fa-solid fa-trash"></i></v-btn>
      </div>
    </div>
  </div>
</template>
