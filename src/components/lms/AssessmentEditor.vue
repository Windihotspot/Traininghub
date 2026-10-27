<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { LmsService } from '@/services/lms'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { CAssessment, CQuestion } from '@/types/lms'

const props = defineProps<{ modelValue: boolean; trainingId: string; moduleId: string | null; assessment: CAssessment | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'saved'): void }>()
const { loading, error, run } = useAsyncAction()

const QUESTION_TYPES = [
  { label: 'Single choice', value: 'single_choice' },
  { label: 'Multiple choice', value: 'multiple_choice' },
  { label: 'True / False', value: 'true_false' },
]

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
  <el-dialog :model-value="modelValue" class="th-dlg" width="820px" align-center destroy-on-close @update:model-value="emit('update:modelValue', $event)">
    <template #header>
      <div class="section-heading !mb-0">
        <span class="section-icon"><i class="fa-solid fa-clipboard-question"></i></span>
        <div>
          <h2>{{ assessment ? 'Edit' : 'New' }} {{ moduleId ? 'quiz' : 'final exam' }}</h2>
          <p>Set the rules, then add questions with their correct answers.</p>
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-5">
      <div v-if="error" class="alert alert-error" role="alert">
        <span class="alert-icon">!</span>
        <p>{{ error.message }}</p>
      </div>

      <div class="field">
        <label for="a_title">Title <span>*</span></label>
        <el-input id="a_title" v-model="form.title" placeholder="e.g. Module 1 check-in" />
      </div>

      <div class="grid grid-cols-3 gap-x-4 gap-y-5 max-md:grid-cols-1">
        <div class="field">
          <label for="a_pass">Pass mark %</label>
          <el-input id="a_pass" v-model.number="form.pass_mark" type="number" min="0" max="100" />
        </div>
        <div class="field">
          <label for="a_att">Max attempts</label>
          <el-input id="a_att" v-model.number="form.max_attempts" type="number" min="1" />
          <small class="field-hint">Blank = unlimited</small>
        </div>
        <div class="field">
          <label for="a_time">Time limit (min)</label>
          <el-input id="a_time" v-model.number="form.time_limit_minutes" type="number" min="1" />
          <small class="field-hint">Blank = none</small>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        <label class="switch-field"><el-switch v-model="form.is_required" /><span>Required</span></label>
        <label class="switch-field"><el-switch v-model="form.shuffle_questions" /><span>Shuffle</span></label>
        <label class="switch-field"><el-switch v-model="form.show_answers" /><span>Show answers</span></label>
        <label class="switch-field"><el-switch v-model="form.is_published" /><span>Published</span></label>
      </div>

      <!-- Questions -->
      <div v-for="(q, qi) in questions" :key="qi" class="q-card">
        <div class="flex items-end gap-3 mb-4 max-md:flex-wrap">
          <div class="field flex-1 min-w-[200px]">
            <label :for="`q_${qi}`">Question {{ qi + 1 }}</label>
            <el-input :id="`q_${qi}`" v-model="q.prompt" placeholder="Type the question" />
          </div>
          <div class="field w-48 max-md:flex-1">
            <label :for="`qt_${qi}`">Type</label>
            <el-select :id="`qt_${qi}`" :model-value="q.question_type" @change="(v: CQuestion['question_type']) => setType(q, v)">
              <el-option v-for="t in QUESTION_TYPES" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </div>
          <div class="field w-24">
            <label :for="`qp_${qi}`">Points</label>
            <el-input :id="`qp_${qi}`" v-model.number="q.points" type="number" min="1" />
          </div>
          <el-button text circle class="danger mb-[6px]" aria-label="Delete question" @click="questions.splice(qi, 1)"><i class="fa-solid fa-trash"></i></el-button>
        </div>

        <div class="flex flex-col gap-2">
          <div v-for="(o, oi) in q.options" :key="oi" class="flex items-center gap-2">
            <el-button circle size="small" :type="o.is_correct ? 'success' : undefined" :aria-label="o.is_correct ? 'Correct answer' : 'Mark as correct'" :aria-pressed="o.is_correct" @click="markCorrect(q, o)">
              <i :class="['fa-solid', o.is_correct ? 'fa-check' : 'fa-circle']"></i>
            </el-button>
            <el-input v-model="o.option_text" :disabled="q.question_type === 'true_false'" :placeholder="`Option ${oi + 1}`" :aria-label="`Option ${oi + 1}`" />
            <el-button v-if="q.question_type !== 'true_false' && q.options.length > 2" text circle size="small" aria-label="Remove option" @click="q.options.splice(oi, 1)"><i class="fa-solid fa-xmark"></i></el-button>
          </div>
        </div>
        <el-button v-if="q.question_type !== 'true_false'" size="small" text class="mt-2" @click="q.options.push({ option_text: '', is_correct: false })">
          <i class="fa-solid fa-plus mr-2"></i>Option
        </el-button>

        <div class="field mt-4">
          <label :for="`qe_${qi}`">Explanation (shown after submit)</label>
          <el-input :id="`qe_${qi}`" v-model="q.explanation" />
        </div>
      </div>

      <div><el-button class="ghost-button" @click="questions.push(newQ())"><i class="fa-solid fa-plus mr-2"></i>Add question</el-button></div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3 max-sm:flex-col-reverse">
        <el-button class="ghost-button" @click="emit('update:modelValue', false)">Cancel</el-button>
        <el-button class="primary-button" type="primary" :loading="loading" :disabled="!form.title.trim()" @click="save">Save assessment</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style>
/* Shared .th-dlg tokens, fields, switches, buttons and alerts come from CurriculumEditor.vue */
.th-dlg .el-dialog__body { max-height: 65vh; overflow-y: auto; padding: 4px 10px 4px 0; }
.th-dlg .q-card { padding: 20px; border: 1px solid #eae3ef; border-radius: 14px; background: #fcfaff; }
.th-dlg .danger { color: #a32e38; }
.th-dlg .el-input.is-disabled .el-input__wrapper { background: #faf8fc; }
</style>