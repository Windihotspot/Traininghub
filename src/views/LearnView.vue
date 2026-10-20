<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LmsService } from '@/services/lms'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AccountMenu from '@/components/traininghub/AccountMenu.vue'
import QuizRunner from '@/components/lms/QuizRunner.vue'
import type { LCourse, LLessonDetail, LLesson, LAssessment } from '@/types/lms'

import DOMPurify from 'dompurify'
const clean = (h: string) => DOMPurify.sanitize(h, { ADD_ATTR: ['target'] })

const trainingId = String(useRoute().params.trainingId)
const course = ref<LCourse | null>(null); const detail = ref<LLessonDetail | null>(null)
const activeId = ref<string | null>(null); const quiz = ref<LAssessment | null>(null)
const finished = ref(false)
const { loading, error, run } = useAsyncAction()
const lessonAction = useAsyncAction()
const ICON: Record<string, string> = { video: 'fa-circle-play', audio: 'fa-headphones', text: 'fa-file-lines', pdf: 'fa-file-pdf', live_session: 'fa-video' }
const flat = () => course.value?.modules.flatMap((m) => m.lessons) ?? []
const passed = (id: string) => course.value?.attempts.some((a) => a.assessment_id === id && a.passed) ?? false

const loadCourse = () => run(async () => { course.value = await LmsService.course(trainingId) })
onMounted(async () => {
  await loadCourse()
  const next = flat().find((l) => !l.locked && l.progress?.status !== 'completed') ?? flat().find((l) => !l.locked)
  if (next) open(next)
})

let last = 0
async function open(l: LLesson) {
  if (l.locked) return
  quiz.value = null; activeId.value = l.id; detail.value = null; last = 0
  const d = await lessonAction.run(() => LmsService.lesson(l.id))
  if (d) detail.value = d
}
const openQuiz = (a: LAssessment) => { quiz.value = a; activeId.value = null; detail.value = null }

function send(pos: number, completed = false) {
  if (!activeId.value) return
  LmsService.progress(activeId.value, pos, completed).then((r) => {
    if (completed) { if (r.course_completed) finished.value = true; loadCourse() }
  }).catch(() => {})
}
const onTime = (e: Event) => { if (Date.now() - last < 15000) return; last = Date.now(); send((e.target as HTMLMediaElement).currentTime) }
const onLoaded = (e: Event) => { (e.target as HTMLMediaElement).currentTime = detail.value?.resume_seconds ?? 0 }
const onEnded = (e: Event) => send((e.target as HTMLMediaElement).duration, true)
const onPause = (e: Event) => send((e.target as HTMLMediaElement).currentTime)
const onQuizDone = (r: { course_completed: boolean }) => { if (r.course_completed) finished.value = true; loadCourse() }
import '@/components/lms/RichTextEditor.vue'
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-6 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-4">
        <router-link :to="{ name: 'my-learning' }" class="text-sm text-gray-500 hover:underline"><i class="fa-solid fa-arrow-left mr-1"></i>My learning</router-link>
        <AccountMenu />
      </div>
      <div v-if="loading && !course" class="text-center py-24"><v-progress-circular indeterminate color="primary" /></div>
      <v-alert v-else-if="error" type="error" variant="tonal">{{ error.message }}</v-alert>

      <div v-else-if="course" class="grid lg:grid-cols-[1fr_340px] gap-6">
        <section>
          <v-alert v-if="finished" type="success" variant="tonal" class="mb-4">Congratulations, you have completed this course.
            <span v-if="course.training.certificate_enabled"> Your certificate is being issued.</span></v-alert>
          <v-alert v-if="lessonAction.error.value" type="error" variant="tonal" class="mb-4">{{ lessonAction.error.value.message }}</v-alert>

          <QuizRunner v-if="quiz" :key="quiz.id" :assessment-id="quiz.id" :title="quiz.title" @done="onQuizDone" />

          <div v-else-if="detail" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h1 class="text-xl font-bold mb-3">{{ detail.lesson.title }}</h1>
            <template v-if="detail.playback">
              <video v-if="detail.playback.type === 'video' && !detail.playback.provider" :key="detail.playback.url" class="w-full rounded-xl bg-black" controls controlsList="nodownload"
                :src="detail.playback.url" crossorigin="anonymous" @loadedmetadata="onLoaded" @timeupdate="onTime" @pause="onPause" @ended="onEnded">
                <track v-for="c in detail.playback.captions" :key="c.lang" kind="subtitles" :srclang="c.lang" :label="c.label" :src="c.url" />
              </video>
              <audio v-else-if="detail.playback.type === 'audio' && !detail.playback.provider" :key="detail.playback.url" class="w-full" controls controlsList="nodownload"
                :src="detail.playback.url" @loadedmetadata="onLoaded" @timeupdate="onTime" @pause="onPause" @ended="onEnded" />
              <iframe v-else-if="detail.playback.provider" :src="detail.playback.url" class="w-full aspect-video rounded-xl" allowfullscreen />
              <a v-else-if="detail.playback.type === 'pdf'" :href="detail.playback.url" target="_blank" rel="noopener"><v-btn color="primary"><i class="fa-solid fa-file-pdf mr-2"></i>Open PDF</v-btn></a>
            </template>
            <div v-if="detail.lesson.text_content" class="lesson-html leading-relaxed" v-html="clean(detail.lesson.text_content)" />
            <p v-if="detail.lesson.description" class="text-gray-600 mt-3">{{ detail.lesson.description }}</p>
            <details v-if="detail.transcript" class="mt-4"><summary class="cursor-pointer text-sm font-medium">Transcript</summary>
              <p class="whitespace-pre-wrap text-sm text-gray-600 mt-2">{{ detail.transcript }}</p></details>
            <v-btn v-if="['text', 'pdf', 'live_session'].includes(detail.lesson.lesson_type) || detail.playback?.provider" class="mt-4" color="primary" variant="tonal" @click="send(0, true)">
              <i class="fa-solid fa-check mr-2"></i>Mark as complete</v-btn>
          </div>
          <p v-else class="text-gray-500 py-16 text-center">Pick a lesson to begin.</p>
        </section>

        <aside class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-fit">
          <h2 class="font-semibold">{{ course.training.title }}</h2>
          <v-progress-linear :model-value="course.enrollment.progress_percent" color="primary" height="8" rounded class="my-2" />
          <p class="text-xs text-gray-500 mb-3">{{ course.enrollment.progress_percent }}% complete</p>
          <div v-for="m in course.modules" :key="m.id" class="mb-3">
            <p class="text-sm font-semibold mb-1">{{ m.title }}</p>
            <button v-for="l in m.lessons" :key="l.id" class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50"
              :class="[activeId === l.id ? 'bg-primary/10' : '', l.locked ? 'opacity-50 cursor-not-allowed' : '']" @click="open(l)">
              <i :class="['fa-solid', l.progress?.status === 'completed' ? 'fa-circle-check text-green-500' : l.locked ? 'fa-lock' : ICON[l.lesson_type]]"></i>
              <span class="flex-1">{{ l.title }}</span></button>
            <button v-for="a in m.assessments" :key="a.id" class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50" @click="openQuiz(a)">
              <i :class="['fa-solid', passed(a.id) ? 'fa-circle-check text-green-500' : 'fa-clipboard-question text-amber-500']"></i><span class="flex-1">{{ a.title }}</span></button>
          </div>
          <button v-for="a in course.final_assessments" :key="a.id" class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50" @click="openQuiz(a)">
            <i :class="['fa-solid', passed(a.id) ? 'fa-circle-check text-green-500' : 'fa-graduation-cap text-primary']"></i><span class="flex-1">{{ a.title }}</span></button>
        </aside>
      </div>
    </div>
  </main>
</template>
