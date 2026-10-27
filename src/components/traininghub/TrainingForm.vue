<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { TrainingsService, CategoriesService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { toLocalInput, toIsoOrNull } from '@/utils/format'
import AssetUploadField from './AssetUploadField.vue'
import type { Training, Category } from '@/types/traininghub'

const props = defineProps<{ organisationId: string; training?: Training | null }>()
const emit = defineEmits<{ (e: 'saved', t: Training): void }>()
const editing = computed(() => !!props.training)
const t = props.training
const form = reactive({
  title:t?.title??'', slug:t?.slug??'', category_id:(t?.category_id??null) as string|null,
  short_description:t?.short_description??'', overview:t?.overview??'', who_should_attend:t?.who_should_attend??'',
  learning_objectives:t?.learning_objectives??'', course_outline:t?.course_outline??'', requirements:t?.requirements??'',
  format:(t?.format??'live') as 'live'|'self_paced'|'blended',
  level:(t?.level??null) as 'beginner'|'intermediate'|'advanced'|'all'|null,
  language:t?.language??'en', pass_mark:t?.pass_mark??70, access_days:(t?.access_days??null) as number|null,
  sequential:t?.sequential??false, certificate_enabled:t?.certificate_enabled??false,
  start_date:t?.start_date??'', end_date:t?.end_date??'', start_time:t?.start_time?.slice(0,5)??'',
  end_time:t?.end_time?.slice(0,5)??'', timezone:t?.timezone??'Africa/Lagos', delivery_mode:t?.delivery_mode??'virtual',
  location:t?.location??'', meeting_url:t?.meeting_url??'', fee:t?.fee??0, currency:t?.currency??'NGN',
  capacity:(t?.capacity??null) as number|null, registration_open_at:toLocalInput(t?.registration_open_at),
  registration_close_at:toLocalInput(t?.registration_close_at), featured:t?.featured??false,
  cover_image:(t?.cover_image??null) as string|null, brochure_url:(t?.brochure_url??null) as string|null,
})
const categories = ref<Category[]>([])
const { loading, error, run } = useAsyncAction()
const saved = ref(false)
onMounted(async()=>{try{categories.value=await CategoriesService.list(props.organisationId)}catch{/* categories are optional */}})
const datesOk = computed(()=>!form.start_date||!form.end_date||form.end_date>=form.start_date)
const passOk = computed(()=>Number(form.pass_mark)>=0&&Number(form.pass_mark)<=100)
const feeOk = computed(()=>Number(form.fee)>=0)
const valid = computed(()=>!!form.title.trim()&&feeOk.value&&datesOk.value&&passOk.value&&(!form.capacity||Number(form.capacity)>0)&&(!form.access_days||Number(form.access_days)>0))
const s = (v?:string|null)=>(v?.trim()?v.trim():null)

async function submit(){
  if(!valid.value)return
  saved.value=false
  const payload:Partial<Training>={
    title:form.title.trim(),category_id:form.category_id,short_description:s(form.short_description),
    overview:s(form.overview),who_should_attend:s(form.who_should_attend),learning_objectives:s(form.learning_objectives),
    course_outline:s(form.course_outline),requirements:s(form.requirements),
    format:form.format,level:form.level,language:form.language.trim()||'en',pass_mark:Number(form.pass_mark),
    access_days:form.access_days?Number(form.access_days):null,sequential:form.sequential,certificate_enabled:form.certificate_enabled,
    start_date:s(form.start_date),end_date:s(form.end_date),
    start_time:s(form.start_time),end_time:s(form.end_time),timezone:form.timezone,delivery_mode:form.delivery_mode,
    location:s(form.location),meeting_url:s(form.meeting_url),fee:Number(form.fee),currency:form.currency.trim()||'NGN',
    capacity:form.capacity?Number(form.capacity):null,registration_open_at:toIsoOrNull(form.registration_open_at),
    registration_close_at:toIsoOrNull(form.registration_close_at),featured:form.featured,
    cover_image:form.cover_image,brochure_url:form.brochure_url,
  }
  if(!editing.value&&s(form.slug))payload.slug=s(form.slug)!
  const res=await run(()=>editing.value?TrainingsService.update(props.training!.id,payload):TrainingsService.create(props.organisationId,payload))
  if(res){saved.value=true;emit('saved',res)}
}
</script>

<template>
  <form class="th-form" @submit.prevent="submit">
    <div v-if="error" class="alert alert-error" role="alert">
      <span class="alert-icon">!</span>
      <p>{{ error.message }}</p>
    </div>
    <div v-if="editing && training!.status !== 'draft'" class="alert alert-warning" role="status">
      <span class="alert-icon">!</span>
      <p>This training is {{ training!.status.replace('_', ' ') }}. Changing the fee or dates affects people who already registered.</p>
    </div>

    <!-- Basics -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-circle-info"></i></span>
        <div><h2>Basics</h2><p>Start with a clear title and short introduction.</p></div>
        <b>01</b>
      </div>
      <div class="grid">
        <div class="field span-2">
          <label for="title">Training title <span>*</span></label>
          <input id="title" v-model="form.title" type="text" placeholder="e.g. Project Management Essentials" required />
        </div>
        <div class="field">
          <label for="slug">URL slug</label>
          <input id="slug" v-model="form.slug" type="text" :disabled="editing" />
          <small class="field-hint">{{ editing ? 'Fixed after creation so links keep working' : 'Leave blank to generate from the title' }}</small>
        </div>
        <div class="field">
          <label for="category">Category</label>
          <select id="category" v-model="form.category_id">
            <option :value="null">No category</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field span-2">
          <label for="short_description">Short description</label>
          <textarea id="short_description" v-model="form.short_description" rows="2" placeholder="A quick summary learners will see first"></textarea>
        </div>
      </div>
    </section>

    <!-- Format -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-graduation-cap"></i></span>
        <div><h2>Course format</h2><p>Live sessions, self-paced lessons, or a blend of both.</p></div>
        <b>02</b>
      </div>
      <div class="grid grid--four">
        <div class="field span-2">
          <label for="format">Format</label>
          <select id="format" v-model="form.format">
            <option value="live">Live (scheduled)</option>
            <option value="self_paced">Self-paced (lessons)</option>
            <option value="blended">Blended</option>
          </select>
          <small class="field-hint">{{ form.format === 'live' ? 'Live trainings have no curriculum tab' : 'Save, then add modules and lessons in the Curriculum tab' }}</small>
        </div>
        <div class="field">
          <label for="level">Level</label>
          <select id="level" v-model="form.level">
            <option :value="null">Not specified</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="all">All levels</option>
          </select>
        </div>
        <div class="field">
          <label for="language">Language</label>
          <input id="language" v-model="form.language" type="text" />
        </div>
        <template v-if="form.format !== 'live'">
          <div class="field">
            <label for="pass_mark">Course pass mark %</label>
            <input id="pass_mark" v-model.number="form.pass_mark" type="number" min="0" max="100" />
            <small v-if="!passOk" class="field-error">Must be 0 to 100</small>
          </div>
          <div class="field">
            <label for="access_days">Access days</label>
            <input id="access_days" v-model.number="form.access_days" type="number" min="1" />
            <small class="field-hint">Blank = lifetime access</small>
          </div>
          <label class="switch-field">
            <input v-model="form.sequential" type="checkbox" role="switch" />
            <span class="switch-track" aria-hidden="true"></span>
            <span>Finish lessons in order</span>
          </label>
          <label class="switch-field">
            <input v-model="form.certificate_enabled" type="checkbox" role="switch" />
            <span class="switch-track" aria-hidden="true"></span>
            <span>Issue certificate</span>
          </label>
        </template>
      </div>
    </section>

    <!-- Content -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-align-left"></i></span>
        <div><h2>Training content</h2><p>Explain what participants will learn and need.</p></div>
        <b>03</b>
      </div>
      <div class="stack">
        <div class="field"><label for="overview">Overview</label><textarea id="overview" v-model="form.overview" rows="3"></textarea></div>
        <div class="field"><label for="who">Who should attend</label><textarea id="who" v-model="form.who_should_attend" rows="2"></textarea></div>
        <div class="field"><label for="objectives">Learning objectives</label><textarea id="objectives" v-model="form.learning_objectives" rows="3"></textarea></div>
        <div class="field"><label for="outline">Course outline</label><textarea id="outline" v-model="form.course_outline" rows="3"></textarea></div>
        <div class="field"><label for="requirements">Requirements</label><textarea id="requirements" v-model="form.requirements" rows="2"></textarea></div>
      </div>
    </section>

    <!-- Schedule -->
    <section v-if="form.format !== 'self_paced'" class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-regular fa-calendar"></i></span>
        <div><h2>Schedule &amp; delivery</h2><p>Set dates, times and how the training will run.</p></div>
        <b>04</b>
      </div>
      <div class="grid grid--four">
        <div class="field"><label for="start_date">Start date</label><input id="start_date" v-model="form.start_date" type="date" /></div>
        <div class="field">
          <label for="end_date">End date</label>
          <input id="end_date" v-model="form.end_date" type="date" :class="{ 'is-invalid': !datesOk }" />
          <small v-if="!datesOk" class="field-error">End date must be on or after start date</small>
        </div>
        <div class="field"><label for="start_time">Start time</label><input id="start_time" v-model="form.start_time" type="time" /></div>
        <div class="field"><label for="end_time">End time</label><input id="end_time" v-model="form.end_time" type="time" /></div>
        <div class="field">
          <label for="delivery_mode">Delivery method</label>
          <select id="delivery_mode" v-model="form.delivery_mode">
            <option value="virtual">Virtual</option>
            <option value="physical">Physical</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div class="field span-3">
          <label for="location">Location</label>
          <input id="location" v-model="form.location" type="text" />
          <small class="field-hint">Required for physical or hybrid trainings</small>
        </div>
        <div class="field span-2"><label for="meeting_url">Meeting URL</label><input id="meeting_url" v-model="form.meeting_url" type="url" /></div>
        <div class="field span-2"><label for="timezone">Timezone</label><input id="timezone" v-model="form.timezone" type="text" /></div>
      </div>
    </section>

    <!-- Pricing -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-solid fa-tags"></i></span>
        <div><h2>Pricing &amp; registration</h2><p>Configure fees, capacity and registration dates.</p></div>
        <b>05</b>
      </div>
      <div class="grid grid--four">
        <div class="field">
          <label for="fee">Fee per participant</label>
          <input id="fee" v-model.number="form.fee" type="number" min="0" :class="{ 'is-invalid': !feeOk }" />
          <small v-if="!feeOk" class="field-error">Cannot be negative</small>
        </div>
        <div class="field"><label for="currency">Currency</label><input id="currency" v-model="form.currency" type="text" /></div>
        <div class="field">
          <label for="capacity">Capacity</label>
          <input id="capacity" v-model.number="form.capacity" type="number" min="1" />
          <small class="field-hint">Blank = unlimited</small>
        </div>
        <label class="switch-field">
          <input v-model="form.featured" type="checkbox" role="switch" />
          <span class="switch-track" aria-hidden="true"></span>
          <span>Featured training</span>
        </label>
        <div class="field span-2"><label for="reg_open">Registration opens (optional)</label><input id="reg_open" v-model="form.registration_open_at" type="datetime-local" /></div>
        <div class="field span-2"><label for="reg_close">Registration closes (optional)</label><input id="reg_close" v-model="form.registration_close_at" type="datetime-local" /></div>
      </div>
    </section>

    <!-- Media -->
    <section class="form-section">
      <div class="section-heading">
        <span class="section-icon"><i class="fa-regular fa-image"></i></span>
        <div><h2>Training media</h2><p>Add a cover image and optional course brochure.</p></div>
        <b>06</b>
      </div>
      <div class="media">
        <AssetUploadField v-model="form.cover_image" :organisation-id="organisationId" folder="covers" label="Cover image" image />
        <AssetUploadField v-model="form.brochure_url" :organisation-id="organisationId" folder="brochures" label="Brochure (PDF)" accept="application/pdf" />
      </div>
    </section>

    <!-- Actions -->
    <div class="form-actions">
      <div class="save-note">
        <span class="gold-line"></span>
        <span v-if="saved && !error" class="saved"><i class="fa-solid fa-circle-check"></i> Changes saved successfully</span>
        <span v-else>You can save this as a draft and publish it later.</span>
      </div>
      <button class="primary-button" type="submit" :disabled="!valid || loading">
        <span v-if="loading" class="spinner"></span>
        {{ loading ? 'Please wait…' : editing ? 'Save changes' : 'Create draft' }}
        <span v-if="!loading" class="button-arrow">→</span>
      </button>
    </div>
  </form>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

.th-form {
  --th-purple: #29143d;
  --th-purple-2: #432465;
  --th-purple-3: #6b4a88;
  --th-ink: #111014;
  --th-muted: #81758f;
  --th-border: #e7e1ec;
  --th-lilac: #f7f3fb;
  --th-gold: #f7c948;
  --th-green: #19875a;

  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--th-ink);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
}
.th-form *, .th-form *::before, .th-form *::after { box-sizing: border-box; }
.th-form button, .th-form input, .th-form select, .th-form textarea { font: inherit; }

/* Sections */
.form-section {
  padding: 27px 28px 28px;
  border: 1px solid #eae3ef;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(44, 21, 62, 0.06);
}
.section-heading { display: flex; align-items: center; gap: 13px; margin-bottom: 25px; }
.section-icon {
  display: grid; place-items: center; flex: 0 0 38px; width: 38px; height: 38px;
  border: 1px solid rgba(247, 201, 72, 0.28); border-radius: 11px;
  background: var(--th-purple); color: var(--th-gold); font-size: 14px;
}
.section-heading h2 {
  margin: 0 0 4px; color: var(--th-purple);
  font: 800 18px 'Manrope', sans-serif; letter-spacing: -0.5px;
}
.section-heading p { margin: 0; color: var(--th-muted); font-size: 12px; line-height: 1.7; }
.section-heading > b { margin-left: auto; color: #c4b7d0; font: 800 12px 'Manrope', sans-serif; letter-spacing: 0.8px; }

/* Layout */
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 21px 16px; align-items: start; }
.grid--four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.stack { display: grid; gap: 21px; }
.span-2 { grid-column: span 2; }
.span-3 { grid-column: span 3; }
.media { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }

/* Fields (same as login) */
.field { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.field label { color: #30263a; font-size: 11px; font-weight: 700; }
.field label > span { color: #b53d54; }

.field input, .field select, .field textarea {
  width: 100%; min-width: 0; padding: 12px 14px;
  border: 1px solid #e4dce9; border-radius: 8px; outline: none;
  background: #fff; color: #21172b; font-size: 12px; line-height: 1.5;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field input, .field select { height: 47px; }
.field textarea { min-height: 47px; resize: vertical; }
.field input::placeholder, .field textarea::placeholder { color: #b0a6b8; }
.field input:focus, .field select:focus, .field textarea:focus {
  border-color: #8a67a6; box-shadow: 0 0 0 3px rgba(100, 62, 133, 0.1);
}
.field input:disabled { background: #faf8fc; color: #998da3; cursor: not-allowed; }
.field .is-invalid { border-color: #d98a94; }

.field select {
  appearance: none; padding-right: 38px; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%238c8096' stroke-width='1.6'%3E%3Cpath d='m1 1.5 5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
}

.field-hint { color: #998da3; font-size: 10px; line-height: 1.55; }
.field-error { color: #a32e38; font-size: 10px; line-height: 1.55; }

/* Switch */
.switch-field {
  display: flex; align-items: center; gap: 11px; min-height: 47px; padding: 0 14px;
  border: 1px solid #e4dce9; border-radius: 8px; background: #fcfaff;
  color: #30263a; font-size: 12px; font-weight: 600; cursor: pointer;
}
.switch-field input { position: absolute; opacity: 0; pointer-events: none; }
.switch-track {
  position: relative; flex: 0 0 34px; width: 34px; height: 20px;
  border-radius: 20px; background: #d9d0e0; transition: background 0.2s;
}
.switch-track::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
  border-radius: 50%; background: #fff; transition: transform 0.2s;
}
.switch-field input:checked + .switch-track { background: var(--th-purple); }
.switch-field input:checked + .switch-track::after { transform: translateX(14px); background: var(--th-gold); }
.switch-field input:focus-visible + .switch-track { box-shadow: 0 0 0 3px rgba(100, 62, 133, 0.2); }

/* Actions */
.form-actions {
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  padding: 21px 24px; border: 1px solid #eae3ef; border-radius: 16px;
  background: linear-gradient(120deg, #fff, #fbf8fe);
}
.save-note { display: flex; align-items: center; gap: 12px; color: var(--th-muted); font-size: 12px; line-height: 1.6; }
.gold-line { width: 27px; height: 2px; flex-shrink: 0; background: var(--th-gold); }
.saved { display: inline-flex; align-items: center; gap: 7px; color: var(--th-green); font-weight: 700; }

.primary-button {
  min-height: 47px; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  padding: 13px 20px; border: 0; border-radius: 8px;
  background: var(--th-purple); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.primary-button:hover:not(:disabled) { transform: translateY(-1px); background: var(--th-purple-2); }
.primary-button:disabled { cursor: not-allowed; opacity: 0.55; }
.button-arrow { font-size: 18px; }
.spinner {
  width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff; border-radius: 50%; animation: th-form-spin 0.7s linear infinite;
}
@keyframes th-form-spin { to { transform: rotate(360deg); } }

/* Alerts */
.alert { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border: 1px solid; border-radius: 9px; }
.alert p { margin: 1px 0 0; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.alert-icon { width: 19px; height: 19px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; font-size: 11px; font-weight: 800; }
.alert-error { border-color: #f0d2d2; background: #fff7f7; color: #a32e38; }
.alert-error .alert-icon { background: #ffe6e6; }
.alert-warning { border-color: #f3e2b3; background: #fffbef; color: #8a6410; }
.alert-warning .alert-icon { background: #fbefc9; }

/* Responsive */
@media (max-width: 900px) {
  .grid--four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .span-3 { grid-column: span 1; }
}
@media (max-width: 600px) {
  .form-section { padding: 21px 17px; }
  .section-heading { align-items: flex-start; gap: 10px; margin-bottom: 20px; }
  .section-heading > b { font-size: 10px; }
  .grid, .grid--four, .media { grid-template-columns: minmax(0, 1fr); }
  .span-2, .span-3 { grid-column: auto; }
  .form-actions { align-items: stretch; flex-direction: column; padding: 18px; }
  .primary-button { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .th-form *, .th-form *::before, .th-form *::after {
    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important;
  }
}
</style>