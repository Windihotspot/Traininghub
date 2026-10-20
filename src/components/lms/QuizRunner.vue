<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { LmsService } from '@/services/lms'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { QuizStart, QuizResult } from '@/types/lms'

const props = defineProps<{ assessmentId: string; title: string }>()
const emit = defineEmits<{ (e: 'done', r: QuizResult): void }>()
const quiz = ref<QuizStart | null>(null); const result = ref<QuizResult | null>(null)
const picked = reactive<Record<string, string[]>>({})
const left = ref(0); let timer: number | undefined
const { loading, error, run } = useAsyncAction()
const mmss = computed(() => `${Math.floor(left.value / 60)}:${String(left.value % 60).padStart(2, '0')}`)
const review = (qid: string) => result.value?.review.find((r) => r.question_id === qid)

async function start() {
  const q = await run(() => LmsService.quizStart(props.assessmentId))
  if (!q) return
  quiz.value = q; result.value = null
  Object.keys(picked).forEach((k) => delete picked[k])
  if (q.time_limit_minutes) {
    const end = new Date(q.started_at).getTime() + q.time_limit_minutes * 60000
    timer = window.setInterval(() => { left.value = Math.max(0, Math.round((end - Date.now()) / 1000)); if (!left.value) submit() }, 1000)
  }
}
function choose(q: { id: string; question_type: string }, id: string) {
  const cur = picked[q.id] ?? []
  picked[q.id] = q.question_type === 'multiple_choice' ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]
}
async function submit() {
  if (!quiz.value || result.value) return
  clearInterval(timer)
  const r = await run(() => LmsService.quizSubmit(quiz.value!.attempt_id, quiz.value!.questions.map((q) => ({ question_id: q.id, option_ids: picked[q.id] ?? [] }))))
  if (r) { result.value = r; emit('done', r) }
}
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error.message }}</v-alert>
    <div v-if="!quiz" class="text-center py-10">
      <h2 class="text-xl font-semibold mb-4">{{ title }}</h2>
      <v-btn color="primary" size="large" :loading="loading" @click="start">Start</v-btn>
    </div>
    <template v-else>
      <div class="flex justify-between mb-4"><h2 class="text-xl font-semibold">{{ title }}</h2>
        <span v-if="quiz.time_limit_minutes && !result" class="font-mono"><i class="fa-regular fa-clock mr-1"></i>{{ mmss }}</span></div>

      <v-alert v-if="result" :type="result.passed ? 'success' : 'error'" variant="tonal" class="mb-4">
        {{ result.percentage }}% ({{ result.score }}/{{ result.max_score }}) — {{ result.passed ? 'Passed' : `Not passed (need ${quiz.pass_mark}%)` }}
        <div v-if="result.course_completed"><b>Course completed!</b></div>
      </v-alert>

      <div v-for="(q, i) in quiz.questions" :key="q.id" class="border border-gray-100 rounded-xl p-4 mb-3 bg-white">
        <p class="font-medium mb-2">{{ i + 1 }}. {{ q.prompt }}</p>
        <div v-for="o in q.options" :key="o.id" class="flex items-center gap-2 py-1">
          <v-btn size="x-small" icon :disabled="!!result" :variant="(picked[q.id] ?? []).includes(o.id) ? 'flat' : 'tonal'" :color="(picked[q.id] ?? []).includes(o.id) ? 'primary' : undefined" @click="choose(q, o.id)">
            <i :class="['fa-solid', q.question_type === 'multiple_choice' ? 'fa-square-check' : 'fa-circle-dot']"></i></v-btn>
          <span :class="review(q.id)?.correct_option_ids?.includes(o.id) ? 'text-green-600 font-medium' : ''">{{ o.option_text }}</span>
        </div>
        <p v-if="review(q.id)" class="text-sm mt-2" :class="review(q.id)!.is_correct ? 'text-green-600' : 'text-red-500'">
          {{ review(q.id)!.is_correct ? 'Correct' : 'Incorrect' }}<span v-if="review(q.id)!.explanation" class="text-gray-600"> — {{ review(q.id)!.explanation }}</span></p>
      </div>
      <v-btn v-if="!result" color="primary" :loading="loading" @click="submit">Submit</v-btn>
      <v-btn v-else variant="tonal" @click="quiz = null">Close</v-btn>
    </template>
  </div>
</template>
