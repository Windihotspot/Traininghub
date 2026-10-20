<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { LmsService } from '@/services/lms'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { toLocalInput, toIsoOrNull } from '@/utils/format'
import MediaUploader from './MediaUploader.vue'
import AssessmentEditor from './AssessmentEditor.vue'
import type { CModule, CLesson, CAssessment, LessonType } from '@/types/lms'
import RichTextEditor from './RichTextEditor.vue'

const props = defineProps<{ trainingId: string; organisationId: string }>()
const modules = ref<CModule[]>([]); const lessons = ref<CLesson[]>([]); const assessments = ref<CAssessment[]>([])
const { loading, error, run } = useAsyncAction()
const ICON: Record<LessonType, string> = { video: 'fa-circle-play', audio: 'fa-headphones', text: 'fa-file-lines', pdf: 'fa-file-pdf', live_session: 'fa-video' }

const load = () => run(async () => {
  const d = await LmsService.curriculum(props.trainingId)
  modules.value = d.modules; lessons.value = d.lessons; assessments.value = d.assessments
})
onMounted(load)
const lessonsOf = (mid: string) => lessons.value.filter((l) => l.module_id === mid)
const quizzesOf = (mid: string | null) => assessments.value.filter((a) => a.module_id === mid)
const mins = (s: number) => (s ? `${Math.round(s / 60)} min` : '')
const act = (fn: () => Promise<unknown>) => run(async () => { await fn(); await load() })

// ---- modules
const newModule = ref('')
const addModule = () => newModule.value.trim() && act(async () => {
  await LmsService.manage(props.trainingId, 'module', 'create', { data: { title: newModule.value.trim() } }); newModule.value = ''
})
const patch = (entity: 'module' | 'lesson', id: string, data: object) => act(() => LmsService.manage(props.trainingId, entity, 'update', { id, data }))
const rename = (m: CModule) => { const t = window.prompt('Module title', m.title); if (t?.trim()) patch('module', m.id, { title: t.trim() }) }
const del = (entity: 'module' | 'lesson', id: string, label: string) =>
  window.confirm(`Delete "${label}"?`) && act(() => LmsService.manage(props.trainingId, entity, 'delete', { id }))
const move = (entity: 'module' | 'lesson', list: { id: string }[], i: number, dir: number) => {
  const j = i + dir; if (j < 0 || j >= list.length) return
  const ids = list.map((x) => x.id); [ids[i], ids[j]] = [ids[j], ids[i]]
  act(() => LmsService.manage(props.trainingId, entity, 'reorder', { order: ids }))
}

// ---- lesson dialog
const dlg = ref(false); const editingId = ref<string | null>(null)
const f = reactive({ module_id: '', title: '', description: '', lesson_type: 'video' as LessonType, is_preview: false, is_required: true,
  is_published: false, media_asset_id: null as string | null, text_content: '', duration_seconds: 0, release_at: '' })
const needsMedia = () => ['video', 'audio', 'pdf'].includes(f.lesson_type)
function openLesson(mid: string, l?: CLesson) {
  editingId.value = l?.id ?? null
  Object.assign(f, l ? { ...l, description: l.description ?? '', text_content: l.text_content ?? '', release_at: toLocalInput(l.release_at) }
    : { module_id: mid, title: '', description: '', lesson_type: 'video', is_preview: false, is_required: true, is_published: false,
        media_asset_id: null, text_content: '', duration_seconds: 0, release_at: '' })
  dlg.value = true
}
const lessonError = ref('')
async function saveLesson() {
  lessonError.value = ''
  if (f.is_published && needsMedia() && !f.media_asset_id) { lessonError.value = 'Attach media before publishing this lesson.'; return }
  if (f.is_published && f.lesson_type === 'text' && !f.text_content.trim()) { lessonError.value = 'Add content before publishing.'; return }
  const data = { module_id: f.module_id, title: f.title.trim(), description: f.description.trim() || null, lesson_type: f.lesson_type,
    is_preview: f.is_preview, is_required: f.is_required, is_published: f.is_published, media_asset_id: needsMedia() ? f.media_asset_id : null,
    text_content: f.lesson_type === 'text' ? f.text_content : null, duration_seconds: Number(f.duration_seconds) || 0, release_at: toIsoOrNull(f.release_at) }
  const ok = await run(async () => {
    await LmsService.manage(props.trainingId, 'lesson', editingId.value ? 'update' : 'create', editingId.value ? { id: editingId.value, data } : { data })
    return true
  })
  if (ok) { dlg.value = false; await load() }
}

// ---- assessment dialog
const aDlg = ref(false); const aSel = ref<CAssessment | null>(null); const aModule = ref<string | null>(null)
const openAssessment = (mid: string | null, a: CAssessment | null) => { aModule.value = mid; aSel.value = a; aDlg.value = true }
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error.message }}</v-alert>
    <form class="flex gap-2 mb-5" @submit.prevent="addModule">
      <v-text-field v-model="newModule" label="New module title" variant="outlined" density="compact" hide-details />
      <v-btn type="submit" color="primary" ><i class="fa-solid fa-plus mr-2"></i>Module</v-btn>
    </form>

    <div v-for="(m, mi) in modules" :key="m.id" class="border border-gray-100 rounded-2xl mb-4 bg-white shadow-sm">
      <div class="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-t-2xl">
        <b class="flex-1">{{ mi + 1 }}. {{ m.title }}</b>
        <v-btn icon size="x-small" variant="text" @click="rename(m)"><i class="fa-solid fa-pen"></i></v-btn>
        <v-btn icon size="x-small" variant="text" :disabled="mi === 0" @click="move('module', modules, mi, -1)"><i class="fa-solid fa-arrow-up"></i></v-btn>
        <v-btn icon size="x-small" variant="text" :disabled="mi === modules.length - 1" @click="move('module', modules, mi, 1)"><i class="fa-solid fa-arrow-down"></i></v-btn>
        <v-switch :model-value="m.is_published" label="Published" color="primary" density="compact" hide-details @update:model-value="patch('module', m.id, { is_published: !!$event })" />
        <v-btn icon size="x-small" variant="text" color="error" @click="del('module', m.id, m.title)"><i class="fa-solid fa-trash"></i></v-btn>
      </div>

      <div v-for="(l, li) in lessonsOf(m.id)" :key="l.id" class="flex items-center gap-2 px-4 py-2 border-t border-gray-100 text-sm">
        <i :class="['fa-solid', ICON[l.lesson_type], 'text-primary w-5']"></i>
        <span class="flex-1">{{ l.title }}
          <span class="text-gray-400 ml-1">{{ mins(l.duration_seconds) }}</span>
          <v-chip v-if="l.is_preview" size="x-small" class="ml-2">Preview</v-chip>
          <v-chip v-if="!l.is_required" size="x-small" class="ml-1">Optional</v-chip>
          <v-chip v-if="l.release_at" size="x-small" class="ml-1">Scheduled</v-chip></span>
        <v-btn icon size="x-small" variant="text" @click="openLesson(m.id, l)"><i class="fa-solid fa-pen"></i></v-btn>
        <v-btn icon size="x-small" variant="text" :disabled="li === 0" @click="move('lesson', lessonsOf(m.id), li, -1)"><i class="fa-solid fa-arrow-up"></i></v-btn>
        <v-btn icon size="x-small" variant="text" :disabled="li === lessonsOf(m.id).length - 1" @click="move('lesson', lessonsOf(m.id), li, 1)"><i class="fa-solid fa-arrow-down"></i></v-btn>
        <v-switch :model-value="l.is_published" color="primary" density="compact" hide-details @update:model-value="patch('lesson', l.id, { is_published: !!$event })" />
        <v-btn icon size="x-small" variant="text" color="error" @click="del('lesson', l.id, l.title)"><i class="fa-solid fa-trash"></i></v-btn>
      </div>

      <div v-for="a in quizzesOf(m.id)" :key="a.id" class="flex items-center gap-2 px-4 py-2 border-t border-gray-100 text-sm">
        <i class="fa-solid fa-clipboard-question text-amber-500 w-5"></i>
        <span class="flex-1">{{ a.title }} <span class="text-gray-400">· {{ a.questions.length }} questions · pass {{ a.pass_mark }}%</span>
          <v-chip size="x-small" class="ml-2" :color="a.is_published ? 'success' : undefined">{{ a.is_published ? 'Published' : 'Draft' }}</v-chip></span>
        <v-btn icon size="x-small" variant="text" @click="openAssessment(m.id, a)"><i class="fa-solid fa-pen"></i></v-btn>
      </div>

      <div class="px-4 py-2 border-t border-gray-100">
        <v-btn size="small" variant="text" @click="openLesson(m.id)"><i class="fa-solid fa-plus mr-2"></i>Lesson</v-btn>
        <v-btn size="small" variant="text" @click="openAssessment(m.id, null)"><i class="fa-solid fa-plus mr-2"></i>Quiz</v-btn>
      </div>
    </div>

    <div class="border border-gray-100 rounded-2xl bg-white shadow-sm p-4">
      <b>Final exam</b>
      <div v-for="a in quizzesOf(null)" :key="a.id" class="flex items-center gap-2 py-2 text-sm">
        <span class="flex-1">{{ a.title }} · {{ a.questions.length }} questions · pass {{ a.pass_mark }}%</span>
        <v-btn icon size="x-small" variant="text" @click="openAssessment(null, a)"><i class="fa-solid fa-pen"></i></v-btn>
      </div>
      <v-btn size="small" variant="text" @click="openAssessment(null, null)"><i class="fa-solid fa-plus mr-2"></i>Final exam</v-btn>
    </div>

    <v-dialog v-model="dlg" max-width="680" scrollable>
      <v-card>
        <v-card-title>{{ editingId ? 'Edit' : 'New' }} lesson</v-card-title>
        <v-card-text class="space-y-3">
          <v-alert v-if="lessonError" type="warning" variant="tonal" density="compact">{{ lessonError }}</v-alert>
          <v-text-field v-model="f.title" label="Title" variant="outlined" density="comfortable" />
          <v-select v-model="f.lesson_type" :items="['video', 'audio', 'text', 'pdf', 'live_session']" label="Type" variant="outlined" density="comfortable" @update:model-value="f.media_asset_id = null" />
          <MediaUploader v-if="needsMedia()" :key="f.lesson_type" :organisation-id="organisationId" :kind="f.lesson_type as 'video' | 'audio' | 'pdf'" :current="f.media_asset_id"
            @uploaded="(r) => { f.media_asset_id = r.asset_id; if (r.duration) f.duration_seconds = r.duration }" />
          <RichTextEditor v-if="f.lesson_type === 'text'" v-model="f.text_content" />
          <v-textarea v-model="f.description" label="Description (optional)" rows="2" auto-grow variant="outlined" density="comfortable" />
          <div class="grid grid-cols-2 gap-3">
            <v-text-field v-model.number="f.duration_seconds" type="number" min="0" label="Duration (seconds)" variant="outlined" density="compact" />
            <v-text-field v-model="f.release_at" type="datetime-local" label="Release at (drip, optional)" variant="outlined" density="compact" />
          </div>
          <div class="flex flex-wrap gap-4">
            <v-switch v-model="f.is_preview" label="Free preview" color="primary" density="compact" hide-details />
            <v-switch v-model="f.is_required" label="Required" color="primary" density="compact" hide-details />
            <v-switch v-model="f.is_published" label="Published" color="primary" density="compact" hide-details />
          </div>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="dlg = false">Cancel</v-btn>
          <v-btn color="primary" :loading="loading" :disabled="!f.title.trim()" @click="saveLesson">Save</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <AssessmentEditor v-model="aDlg" :training-id="trainingId" :module-id="aModule" :assessment="aSel" @saved="load" />
  </div>
</template>
