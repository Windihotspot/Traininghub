<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { LmsService } from '@/services/lms'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { CAssessment, CQuestion } from '@/types/lms'

const props = defineProps<{ modelValue: boolean; trainingId: string; moduleId: string | null; assessment: CAssessment | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'saved'): void }>()
const { loading, error, run } = useAsyncAction()

const newQ = (): CQuestion => ({ question_type: 'single_choice', prompt: '', explanation: '', points: 1,
  options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] })
const blank = () => ({ title: '', description: '', assessment_type: props.moduleId ? 'quiz' : 'final_exam', pass_mark: 70,
  max_attempts: 3 as number | null, time_limit_minutes: null as number | null, shuffle_questions: false, show_answers: true, is_required: true, is_published: false })
const form = reactive<any>(blank())
const questions = ref<CQuestion[]>([])

watch(() => props.modelValue, (open) => {
  if (!open) return
  const a = props.assessment
  Object.assign(form, a ? a : blank())
  questions.value = a ? JSON.parse(JSON.stringify(a.questions)) : [newQ()]
}, { immediate: true })

function setType(q: CQuestion, t: CQuestion['question_type']) {
  q.question_type = t
  q.options = t === 'true_false'
    ? [{ option_text: 'True', is_correct: true }, { option_text: 'False', is_correct: false }]
    : [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }]
}
function markCorrect(q: CQuestion, o: any) {
  if (q.question_type === 'multiple_choice') o.is_correct = !o.is_correct
  else q.options.forEach((x) => (x.is_correct = x === o))
}

async function save() {
  const a = props.assessment
  const settings = (({ title, description, assessment_type, pass_mark, max_attempts, time_limit_minutes, shuffle_questions, show_answers, is_required, is_published }) =>
    ({ title, description, assessment_type, pass_mark, max_attempts, time_limit_minutes, shuffle_questions, show_answers, is_required, is_published }))(form)
  const res = await run(() => LmsService.saveAssessment(props.trainingId,
    { ...settings, id: a?.id, module_id: a ? a.module_id : props.moduleId }, questions.value))
  if (res) { emit('saved'); emit('update:modelValue', false) }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="820" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>{{ assessment ? 'Edit' : 'New' }} {{ moduleId ? 'quiz' : 'final exam' }}</v-card-title>
      <v-card-text class="space-y-4">
        <v-alert v-if="error" type="error" variant="tonal" density="compact">{{ error.message }}</v-alert>
        <v-text-field v-model="form.title" label="Title" variant="outlined" density="comfortable" />
        <div class="grid md:grid-cols-4 gap-3">
          <v-text-field v-model.number="form.pass_mark" type="number" min="0" max="100" label="Pass mark %" variant="outlined" density="compact" />
          <v-text-field v-model.number="form.max_attempts" type="number" min="1" label="Max attempts" hint="Blank = unlimited" persistent-hint variant="outlined" density="compact" />
          <v-text-field v-model.number="form.time_limit_minutes" type="number" min="1" label="Time limit (min)" hint="Blank = none" persistent-hint variant="outlined" density="compact" />
          <v-switch v-model="form.is_required" label="Required" color="primary" density="compact" hide-details />
          <v-switch v-model="form.shuffle_questions" label="Shuffle" color="primary" density="compact" hide-details />
          <v-switch v-model="form.show_answers" label="Show answers after" color="primary" density="compact" hide-details />
          <v-switch v-model="form.is_published" label="Published" color="primary" density="compact" hide-details />
        </div>

        <div v-for="(q, qi) in questions" :key="qi" class="border border-gray-200 rounded-xl p-4">
          <div class="flex gap-2 mb-2">
            <v-text-field v-model="q.prompt" :label="`Question ${qi + 1}`" variant="outlined" density="compact" hide-details />
            <v-select :model-value="q.question_type" :items="[{ title: 'Single choice', value: 'single_choice' }, { title: 'Multiple choice', value: 'multiple_choice' }, { title: 'True / False', value: 'true_false' }]"
              variant="outlined" density="compact" hide-details style="max-width:190px" @update:model-value="setType(q, $event)" />
            <v-text-field v-model.number="q.points" type="number" min="1" label="Pts" variant="outlined" density="compact" hide-details style="max-width:80px" />
            <v-btn icon size="small" variant="text" color="error" @click="questions.splice(qi, 1)"><i class="fa-solid fa-trash"></i></v-btn>
          </div>
          <div v-for="(o, oi) in q.options" :key="oi" class="flex items-center gap-2 mb-1">
            <v-btn icon size="x-small" :color="o.is_correct ? 'success' : undefined" variant="tonal" @click="markCorrect(q, o)">
              <i :class="['fa-solid', o.is_correct ? 'fa-check' : 'fa-circle']"></i></v-btn>
            <v-text-field v-model="o.option_text" :disabled="q.question_type === 'true_false'" label="Option" variant="outlined" density="compact" hide-details />
            <v-btn v-if="q.question_type !== 'true_false' && q.options.length > 2" icon size="x-small" variant="text" @click="q.options.splice(oi, 1)"><i class="fa-solid fa-xmark"></i></v-btn>
          </div>
          <v-btn v-if="q.question_type !== 'true_false'" size="x-small" variant="text" @click="q.options.push({ option_text: '', is_correct: false })">+ Option</v-btn>
          <v-text-field v-model="q.explanation" label="Explanation (shown after submit)" variant="outlined" density="compact" hide-details class="mt-2" />
        </div>
        <v-btn variant="tonal" @click="questions.push(newQ())"><i class="fa-solid fa-plus mr-2"></i>Add question</v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer /><v-btn @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" :disabled="!form.title.trim()" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
