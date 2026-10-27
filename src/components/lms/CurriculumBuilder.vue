<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { LmsService } from '@/services/lms'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { toLocalInput, toIsoOrNull } from '@/utils/format'
import MediaUploader from './MediaUploader.vue'
import AssessmentEditor from './AssessmentEditor.vue'
import RichTextEditor from './RichTextEditor.vue'
import type { CModule, CLesson, CAssessment, LessonType } from '@/types/lms'

const props = defineProps<{ trainingId: string; organisationId: string }>()
const modules = ref<CModule[]>([]); const lessons = ref<CLesson[]>([]); const assessments = ref<CAssessment[]>([])
const { loading, error, run } = useAsyncAction()
const ICON: Record<LessonType, string> = { video: 'fa-circle-play', audio: 'fa-headphones', text: 'fa-file-lines', pdf: 'fa-file-pdf', live_session: 'fa-video' }
const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'video', label: 'Video' }, { value: 'audio', label: 'Audio' }, { value: 'text', label: 'Text' },
  { value: 'pdf', label: 'PDF' }, { value: 'live_session', label: 'Live session' },
]

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
const rename = (m: CModule) =>
  ElMessageBox.prompt('', 'Rename module', { inputValue: m.title, confirmButtonText: 'Save', cancelButtonText: 'Cancel', customClass: 'th-dlg' })
    .then(({ value }) => { if (value?.trim()) patch('module', m.id, { title: value.trim() }) }).catch(() => {})
const del = (entity: 'module' | 'lesson', id: string, label: string) =>
  ElMessageBox.confirm(`Delete "${label}"? This cannot be undone.`, `Delete ${entity}`, { type: 'warning', confirmButtonText: 'Delete', cancelButtonText: 'Cancel', customClass: 'th-dlg' })
    .then(() => act(() => LmsService.manage(props.trainingId, entity, 'delete', { id }))).catch(() => {})
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
  lessonError.value = ''
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
  <div class="th-curr flex flex-col gap-5">
    <div v-if="error" class="alert alert-error" role="alert">
      <span class="alert-icon">!</span>
      <p>{{ error.message }}</p>
    </div>

    <!-- Add module -->
    <form class="form-section" @submit.prevent="addModule">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-layer-group"></i></span>
        <div><h2>Curriculum</h2><p>Group lessons and quizzes into modules, in the order learners take them.</p></div>
      </div>
      <div class="flex items-end gap-3 max-sm:flex-col max-sm:items-stretch">
        <div class="field flex-1">
          <label for="new_module">New module title</label>
          <el-input id="new_module" v-model="newModule" placeholder="e.g. Getting started" />
        </div>
        <el-button class="primary-button" type="primary" native-type="submit" :disabled="!newModule.trim()">
          <i class="fa-solid fa-plus mr-2"></i>Add module
        </el-button>
      </div>
    </form>

    <p v-if="!modules.length && !loading" class="empty">No modules yet. Add your first module above.</p>

    <!-- Modules -->
    <section v-for="(m, mi) in modules" :key="m.id" class="form-section module">
      <div class="module-head">
        <span class="section-icon section-icon--num">{{ mi + 1 }}</span>
        <h2 class="flex-1 min-w-0 truncate">{{ m.title }}</h2>
        <div class="flex items-center gap-1 flex-wrap justify-end">
          <el-button text circle size="small" aria-label="Rename module" @click="rename(m)"><i class="fa-solid fa-pen"></i></el-button>
          <el-button text circle size="small" aria-label="Move module up" :disabled="mi === 0" @click="move('module', modules, mi, -1)"><i class="fa-solid fa-arrow-up"></i></el-button>
          <el-button text circle size="small" aria-label="Move module down" :disabled="mi === modules.length - 1" @click="move('module', modules, mi, 1)"><i class="fa-solid fa-arrow-down"></i></el-button>
          <label class="switch-field switch-field--sm">
            <el-switch :model-value="m.is_published" @change="(v: string | number | boolean) => patch('module', m.id, { is_published: !!v })" />
            <span>Published</span>
          </label>
          <el-button text circle size="small" class="danger" aria-label="Delete module" @click="del('module', m.id, m.title)"><i class="fa-solid fa-trash"></i></el-button>
        </div>
      </div>

      <div v-for="(l, li) in lessonsOf(m.id)" :key="l.id" class="row">
        <i :class="['fa-solid', ICON[l.lesson_type], 'row-icon']"></i>
        <div class="flex-1 min-w-0 flex items-center flex-wrap gap-x-2 gap-y-1">
          <span class="row-title">{{ l.title }}</span>
          <span v-if="l.duration_seconds" class="row-meta">{{ mins(l.duration_seconds) }}</span>
          <el-tag v-if="l.is_preview" size="small" effect="plain">Preview</el-tag>
          <el-tag v-if="!l.is_required" size="small" effect="plain" type="info">Optional</el-tag>
          <el-tag v-if="l.release_at" size="small" effect="plain" type="warning">Scheduled</el-tag>
        </div>
        <div class="flex items-center gap-1">
          <el-button text circle size="small" aria-label="Edit lesson" @click="openLesson(m.id, l)"><i class="fa-solid fa-pen"></i></el-button>
          <el-button text circle size="small" aria-label="Move lesson up" :disabled="li === 0" @click="move('lesson', lessonsOf(m.id), li, -1)"><i class="fa-solid fa-arrow-up"></i></el-button>
          <el-button text circle size="small" aria-label="Move lesson down" :disabled="li === lessonsOf(m.id).length - 1" @click="move('lesson', lessonsOf(m.id), li, 1)"><i class="fa-solid fa-arrow-down"></i></el-button>
          <el-switch :model-value="l.is_published" aria-label="Published" @change="(v: string | number | boolean) => patch('lesson', l.id, { is_published: !!v })" />
          <el-button text circle size="small" class="danger" aria-label="Delete lesson" @click="del('lesson', l.id, l.title)"><i class="fa-solid fa-trash"></i></el-button>
        </div>
      </div>

      <div v-for="a in quizzesOf(m.id)" :key="a.id" class="row">
        <i class="fa-solid fa-clipboard-question row-icon row-icon--quiz"></i>
        <div class="flex-1 min-w-0 flex items-center flex-wrap gap-x-2 gap-y-1">
          <span class="row-title">{{ a.title }}</span>
          <span class="row-meta">{{ a.questions.length }} questions, pass {{ a.pass_mark }}%</span>
          <el-tag size="small" effect="plain" :type="a.is_published ? 'success' : 'info'">{{ a.is_published ? 'Published' : 'Draft' }}</el-tag>
        </div>
        <el-button text circle size="small" aria-label="Edit quiz" @click="openAssessment(m.id, a)"><i class="fa-solid fa-pen"></i></el-button>
      </div>

      <div class="row row--actions">
        <el-button size="small" text @click="openLesson(m.id)"><i class="fa-solid fa-plus mr-2"></i>Lesson</el-button>
        <el-button size="small" text @click="openAssessment(m.id, null)"><i class="fa-solid fa-plus mr-2"></i>Quiz</el-button>
      </div>
    </section>

    <!-- Final exam -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-award"></i></span>
        <div><h2>Final exam</h2><p>An assessment learners take after finishing the modules.</p></div>
      </div>
      <div v-for="a in quizzesOf(null)" :key="a.id" class="row row--flush">
        <i class="fa-solid fa-clipboard-question row-icon row-icon--quiz"></i>
        <div class="flex-1 min-w-0 flex items-center flex-wrap gap-x-2">
          <span class="row-title">{{ a.title }}</span>
          <span class="row-meta">{{ a.questions.length }} questions, pass {{ a.pass_mark }}%</span>
        </div>
        <el-button text circle size="small" aria-label="Edit final exam" @click="openAssessment(null, a)"><i class="fa-solid fa-pen"></i></el-button>
      </div>
      <el-button size="small" text @click="openAssessment(null, null)"><i class="fa-solid fa-plus mr-2"></i>Final exam</el-button>
    </section>

    <!-- Lesson dialog -->
    <el-dialog v-model="dlg" class="th-dlg p-4" width="680px" align-center destroy-on-close>
      <template #header>
        <div class="section-heading !mb-0">
          <span class="section-icon"><i class="fa-solid fa-book-open"></i></span>
          <div><h2>{{ editingId ? 'Edit lesson' : 'New lesson' }}</h2><p>Choose a type, attach content and decide when it goes live.</p></div>
        </div>
      </template>

      <div class="flex flex-col gap-5">
        <div v-if="lessonError" class="alert alert-warning" role="alert">
          <span class="alert-icon">!</span>
          <p>{{ lessonError }}</p>
        </div>

        <div class="grid grid-cols-2 gap-x-4 gap-y-5 max-sm:grid-cols-1">
          <div class="field col-span-2 max-sm:col-span-1">
            <label for="l_title">Title <span>*</span></label>
            <el-input id="l_title" v-model="f.title" placeholder="e.g. Introduction to budgeting" />
          </div>
          <div class="field col-span-2 max-sm:col-span-1">
            <label for="l_type">Type</label>
            <el-select id="l_type" v-model="f.lesson_type" @change="f.media_asset_id = null">
              <el-option v-for="t in LESSON_TYPES" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </div>
        </div>

        <MediaUploader v-if="needsMedia()" :key="f.lesson_type" :organisation-id="organisationId" :kind="f.lesson_type as 'video' | 'audio' | 'pdf'" :current="f.media_asset_id"
          @uploaded="(r) => { f.media_asset_id = r.asset_id; if (r.duration) f.duration_seconds = r.duration }" />
        <RichTextEditor v-if="f.lesson_type === 'text'" v-model="f.text_content" />

        <div class="field">
          <label for="l_desc">Description (optional)</label>
          <el-input id="l_desc" v-model="f.description" type="textarea" :autosize="{ minRows: 2 }" />
        </div>

        <div class="grid grid-cols-2 gap-x-4 gap-y-5 max-sm:grid-cols-1">
          <div class="field">
            <label for="l_dur">Duration (seconds)</label>
            <el-input id="l_dur" v-model.number="f.duration_seconds" type="number" min="0" />
          </div>
          <div class="field">
            <label for="l_rel">Release at (optional)</label>
            <el-input id="l_rel" v-model="f.release_at" type="datetime-local" />
            <small class="field-hint">Drip content on a set date</small>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          <label class="switch-field"><el-switch v-model="f.is_preview" /><span>Free preview</span></label>
          <label class="switch-field"><el-switch v-model="f.is_required" /><span>Required</span></label>
          <label class="switch-field"><el-switch v-model="f.is_published" /><span>Published</span></label>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3 max-sm:flex-col-reverse">
          <el-button class="ghost-button" @click="dlg = false">Cancel</el-button>
          <el-button class="primary-button" type="primary" :loading="loading" :disabled="!f.title.trim()" @click="saveLesson">
            {{ editingId ? 'Save changes' : 'Add lesson' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <AssessmentEditor v-model="aDlg" :training-id="trainingId" :module-id="aModule" :assessment="aSel" @saved="load" />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

:is(.th-curr, .th-dlg) {
  --th-purple: #29143d;
  --th-purple-2: #432465;
  --th-purple-3: #6b4a88;
  --th-ink: #111014;
  --th-muted: #81758f;
  --th-border: #e7e1ec;
  --th-lilac: #f7f3fb;
  --th-gold: #f7c948;
  --th-green: #19875a;

  /* Element Plus theme */
  --el-color-primary: #29143d;
  --el-color-primary-light-3: #6b4a88;
  --el-color-primary-light-5: #a38bb8;
  --el-color-primary-light-7: #d9d0e0;
  --el-color-primary-light-8: #e7e1ec;
  --el-color-primary-light-9: #f7f3fb;
  --el-color-primary-dark-2: #432465;
  --el-border-radius-base: 8px;
  --el-font-family: 'DM Sans', sans-serif;

  color: var(--th-ink);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
}
:is(.th-curr, .th-dlg) *, :is(.th-curr, .th-dlg) *::before, :is(.th-curr, .th-dlg) *::after { box-sizing: border-box; }
.th-dlg { border-radius: 20px; padding: 8px 10px; }

/* Sections */
.th-curr .form-section {
  padding: 27px 28px 28px;
  border: 1px solid #eae3ef; border-radius: 20px; background: #fff;
  box-shadow: 0 20px 60px rgba(44, 21, 62, 0.06);
}
:is(.th-curr, .th-dlg) .section-heading { display: flex; align-items: center; gap: 13px; margin-bottom: 25px; }
:is(.th-curr, .th-dlg) .section-icon {
  display: grid; place-items: center; flex: 0 0 38px; width: 38px; height: 38px;
  border: 1px solid rgba(247, 201, 72, 0.28); border-radius: 11px;
  background: var(--th-purple); color: var(--th-gold); font-size: 14px;
}
.th-curr .section-icon--num { font: 800 14px 'Manrope', sans-serif; }
:is(.th-curr, .th-dlg) h2 { margin: 0 0 4px; color: var(--th-purple); font: 800 18px 'Manrope', sans-serif; letter-spacing: -0.5px; }
:is(.th-curr, .th-dlg) .section-heading p { margin: 0; color: var(--th-muted); font-size: 12px; line-height: 1.7; }
.th-curr .empty { margin: 0; padding: 18px; border: 1px dashed #d9d0e0; border-radius: 12px; color: var(--th-muted); text-align: center; font-size: 12px; }

/* Module */
.th-curr .module { padding: 0; overflow: hidden; }
.th-curr .module-head {
  display: flex; align-items: center; gap: 13px; padding: 18px 20px;
  background: linear-gradient(120deg, #fff, #fbf8fe);
}
.th-curr .module-head h2 { margin: 0; }
.th-curr .row {
  display: flex; align-items: center; gap: 12px; padding: 11px 20px;
  border-top: 1px solid var(--th-border); font-size: 12px;
}
.th-curr .row--flush { padding: 8px 0; border-top: 0; }
.th-curr .row--actions { padding: 8px 14px; background: #fcfaff; }
.th-curr .row-icon { width: 20px; text-align: center; color: var(--th-purple-3); }
.th-curr .row-icon--quiz { color: #c08a12; }
.th-curr .row-title { color: #30263a; font-weight: 600; }
.th-curr .row-meta { color: #998da3; font-size: 11px; }
.th-curr .danger { color: #a32e38; }

/* Fields */
:is(.th-curr, .th-dlg) .field { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
:is(.th-curr, .th-dlg) .field label { color: #30263a; font-size: 11px; font-weight: 700; }
:is(.th-curr, .th-dlg) .field label > span { color: #b53d54; }
:is(.th-curr, .th-dlg) .field-hint { color: #998da3; font-size: 10px; line-height: 1.55; }

:is(.th-curr, .th-dlg) .el-input__wrapper,
:is(.th-curr, .th-dlg) .el-select__wrapper,
:is(.th-curr, .th-dlg) .el-textarea__inner {
  min-height: 47px; padding: 0 14px; border-radius: 8px;
  box-shadow: 0 0 0 1px #e4dce9 inset; background: #fff;
  font-size: 12px; transition: box-shadow 0.2s;
}
:is(.th-curr, .th-dlg) .el-textarea__inner { padding: 12px 14px; line-height: 1.5; }
:is(.th-curr, .th-dlg) .el-input__wrapper.is-focus,
:is(.th-curr, .th-dlg) .el-select__wrapper.is-focused,
:is(.th-curr, .th-dlg) .el-textarea__inner:focus {
  box-shadow: 0 0 0 1px #8a67a6 inset, 0 0 0 4px rgba(100, 62, 133, 0.1);
}
:is(.th-curr, .th-dlg) .el-input__inner::placeholder { color: #b0a6b8; }

/* Switch field */
:is(.th-curr, .th-dlg) .switch-field {
  display: flex; align-items: center; gap: 11px; min-height: 47px; padding: 0 14px;
  border: 1px solid #e4dce9; border-radius: 8px; background: #fcfaff;
  color: #30263a; font-size: 12px; font-weight: 600; cursor: pointer;
}
.th-curr .switch-field--sm { min-height: 34px; padding: 0 10px; gap: 8px; font-size: 11px; }
:is(.th-curr, .th-dlg) .el-switch.is-checked .el-switch__action { background: var(--th-gold); }

/* Buttons */
:is(.th-curr, .th-dlg) .primary-button.el-button {
  min-height: 47px; padding: 13px 20px; border: 0; border-radius: 8px;
  background: var(--th-purple); color: #fff; font-size: 12px; font-weight: 700;
  transition: background 0.2s, transform 0.2s;
}
:is(.th-curr, .th-dlg) .primary-button.el-button:hover:not(.is-disabled) { transform: translateY(-1px); background: var(--th-purple-2); }
:is(.th-curr, .th-dlg) .primary-button.el-button.is-disabled { opacity: 0.55; }
:is(.th-curr, .th-dlg) .ghost-button.el-button { min-height: 47px; padding: 13px 20px; border-radius: 8px; border-color: #e4dce9; color: #30263a; font-size: 12px; font-weight: 700; }
:is(.th-curr, .th-dlg) .el-button.is-text:not(.is-disabled):hover { background: var(--th-lilac); color: var(--th-purple); }

/* Alerts */
:is(.th-curr, .th-dlg) .alert { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border: 1px solid; border-radius: 9px; }
:is(.th-curr, .th-dlg) .alert p { margin: 1px 0 0; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
:is(.th-curr, .th-dlg) .alert-icon { width: 19px; height: 19px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; font-size: 11px; font-weight: 800; }
:is(.th-curr, .th-dlg) .alert-error { border-color: #f0d2d2; background: #fff7f7; color: #a32e38; }
:is(.th-curr, .th-dlg) .alert-error .alert-icon { background: #ffe6e6; }
:is(.th-curr, .th-dlg) .alert-warning { border-color: #f3e2b3; background: #fffbef; color: #8a6410; }
:is(.th-curr, .th-dlg) .alert-warning .alert-icon { background: #fbefc9; }

@media (max-width: 600px) {
  .th-curr .form-section { padding: 21px 17px; }
  .th-curr .module { padding: 0; }
  .th-curr .module-head { flex-wrap: wrap; padding: 16px 17px; }
  .th-curr .row { flex-wrap: wrap; padding: 11px 17px; }
}
@media (prefers-reduced-motion: reduce) {
  :is(.th-curr, .th-dlg) *, :is(.th-curr, .th-dlg) *::before, :is(.th-curr, .th-dlg) *::after {
    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important;
  }
}
</style>