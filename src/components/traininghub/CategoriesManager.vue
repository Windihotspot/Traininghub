<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CategoriesService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { Category } from '@/types/traininghub'

const props = defineProps<{ organisationId: string }>()
const items = ref<Category[]>([])
const name = ref('')
const { loading, error, run } = useAsyncAction()

const load = () => run(async () => { items.value = await CategoriesService.list(props.organisationId) })
const add = () => run(async () => { await CategoriesService.create(props.organisationId, name.value); name.value = ''; await load() })
const remove = (c: Category) => { if (window.confirm(`Delete "${c.name}"?`)) run(async () => { await CategoriesService.remove(c.id); await load() }) }
onMounted(load)
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error.message }}</v-alert>
    <form class="flex gap-3 mb-4" @submit.prevent="add">
      <v-text-field v-model="name" label="New category" variant="outlined" density="compact" hide-details />
      <v-btn type="submit" color="primary" :loading="loading" :disabled="!name.trim()"><i class="fa-solid fa-plus mr-2"></i>Add</v-btn>
    </form>
    <div class="flex flex-wrap gap-2">
      <v-chip v-for="c in items" :key="c.id" :closable="!!c.organisation_id" variant="tonal" @click:close="remove(c)">
        {{ c.name }}<span v-if="!c.organisation_id" class="ml-1 text-xs text-gray-400">(global)</span>
      </v-chip>
    </div>
  </div>
</template>
