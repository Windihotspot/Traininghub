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
const valid = computed(()=>!!form.title.trim()&&Number(form.fee)>=0&&datesOk.value&&passOk.value&&(!form.capacity||Number(form.capacity)>0)&&(!form.access_days||Number(form.access_days)>0))
const req = (v:string)=>!!v?.trim()||'Required'
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
    <v-alert v-if="error" type="error" variant="tonal">{{error.message}}</v-alert>
    <v-alert v-if="editing&&training!.status!=='draft'" type="warning" variant="tonal" density="compact">This training is {{training!.status.replace('_',' ')}}. Changing the fee or dates affects people who already registered.</v-alert>

    <section class="th-form__section">
      <div class="th-form__heading"><span class="th-form__icon"><i class="fa-solid fa-circle-info"></i></span><div><h2>Basics</h2><p>Start with a clear title and short introduction.</p></div><b>01</b></div>
      <div class="th-grid">
        <v-text-field v-model="form.title" label="Training title" placeholder="e.g. Project Management Essentials" :rules="[req]" variant="outlined" density="comfortable" class="span-2"/>
        <v-text-field v-model="form.slug" label="URL slug" :disabled="editing" variant="outlined" density="comfortable" :hint="editing?'Fixed after creation so links keep working':'Leave blank to generate from the title'" persistent-hint/>
        <v-select v-model="form.category_id" :items="categories" item-title="name" item-value="id" label="Category" clearable variant="outlined" density="comfortable"/>
        <v-textarea v-model="form.short_description" label="Short description" placeholder="A quick summary learners will see first" rows="2" auto-grow variant="outlined" density="comfortable" class="span-2"/>
      </div>
    </section>

    <section class="th-form__section">
      <div class="th-form__heading"><span class="th-form__icon"><i class="fa-solid fa-graduation-cap"></i></span><div><h2>Course format</h2><p>Live sessions, self-paced lessons, or a blend of both.</p></div><b>02</b></div>
      <div class="th-grid th-grid--four">
        <v-select v-model="form.format" :items="[{title:'Live (scheduled)',value:'live'},{title:'Self-paced (lessons)',value:'self_paced'},{title:'Blended',value:'blended'}]" label="Format" variant="outlined" density="comfortable" class="span-2"
          :hint="form.format==='live'?'Live trainings have no curriculum tab':'Save, then add modules and lessons in the Curriculum tab'" persistent-hint/>
        <v-select v-model="form.level" :items="[{title:'Beginner',value:'beginner'},{title:'Intermediate',value:'intermediate'},{title:'Advanced',value:'advanced'},{title:'All levels',value:'all'}]" label="Level" clearable variant="outlined" density="comfortable"/>
        <v-text-field v-model="form.language" label="Language" variant="outlined" density="comfortable"/>
        <template v-if="form.format!=='live'">
          <v-text-field v-model.number="form.pass_mark" type="number" min="0" max="100" label="Course pass mark %" variant="outlined" density="comfortable" :error-messages="passOk?[]:['Must be 0 to 100']"/>
          <v-text-field v-model.number="form.access_days" type="number" min="1" label="Access days" hint="Blank = lifetime access" persistent-hint variant="outlined" density="comfortable"/>
          <div class="th-featured"><v-switch v-model="form.sequential" label="Finish lessons in order" color="primary" hide-details/></div>
          <div class="th-featured"><v-switch v-model="form.certificate_enabled" label="Issue certificate" color="primary" hide-details/></div>
        </template>
      </div>
    </section>

    <section class="th-form__section">
      <div class="th-form__heading"><span class="th-form__icon"><i class="fa-solid fa-align-left"></i></span><div><h2>Training content</h2><p>Explain what participants will learn and need.</p></div><b>03</b></div>
      <div class="th-stack">
        <v-textarea v-model="form.overview" label="Overview" rows="3" auto-grow variant="outlined" density="comfortable"/>
        <v-textarea v-model="form.who_should_attend" label="Who should attend" rows="2" auto-grow variant="outlined" density="comfortable"/>
        <v-textarea v-model="form.learning_objectives" label="Learning objectives" rows="3" auto-grow variant="outlined" density="comfortable"/>
        <v-textarea v-model="form.course_outline" label="Course outline" rows="3" auto-grow variant="outlined" density="comfortable"/>
        <v-textarea v-model="form.requirements" label="Requirements" rows="2" auto-grow variant="outlined" density="comfortable"/>
      </div>
    </section>

    <section v-if="form.format!=='self_paced'" class="th-form__section">
      <div class="th-form__heading"><span class="th-form__icon"><i class="fa-regular fa-calendar"></i></span><div><h2>Schedule &amp; delivery</h2><p>Set dates, times and how the training will run.</p></div><b>04</b></div>
      <div class="th-grid th-grid--four">
        <v-text-field v-model="form.start_date" type="date" label="Start date" variant="outlined" density="comfortable"/>
        <v-text-field v-model="form.end_date" type="date" label="End date" variant="outlined" density="comfortable" :error-messages="datesOk?[]:['End date must be on or after start date']"/>
        <v-text-field v-model="form.start_time" type="time" label="Start time" variant="outlined" density="comfortable"/>
        <v-text-field v-model="form.end_time" type="time" label="End time" variant="outlined" density="comfortable"/>
        <v-select v-model="form.delivery_mode" :items="['virtual','physical','hybrid']" label="Delivery method" variant="outlined" density="comfortable"/>
        <v-text-field v-model="form.location" label="Location" hint="Required for physical or hybrid trainings" persistent-hint variant="outlined" density="comfortable" class="span-3"/>
        <v-text-field v-model="form.meeting_url" label="Meeting URL" variant="outlined" density="comfortable" class="span-2"/>
        <v-text-field v-model="form.timezone" label="Timezone" variant="outlined" density="comfortable" class="span-2"/>
      </div>
    </section>

    <section class="th-form__section">
      <div class="th-form__heading"><span class="th-form__icon"><i class="fa-solid fa-tags"></i></span><div><h2>Pricing &amp; registration</h2><p>Configure fees, capacity and registration dates.</p></div><b>05</b></div>
      <div class="th-grid th-grid--four">
        <v-text-field v-model.number="form.fee" type="number" min="0" label="Fee per participant" variant="outlined" density="comfortable" :rules="[(v:number)=>Number(v)>=0||'Cannot be negative']"/>
        <v-text-field v-model="form.currency" label="Currency" variant="outlined" density="comfortable"/>
        <v-text-field v-model.number="form.capacity" type="number" min="1" label="Capacity" hint="Blank = unlimited" persistent-hint variant="outlined" density="comfortable"/>
        <div class="th-featured"><v-switch v-model="form.featured" label="Featured training" color="primary" hide-details/></div>
        <v-text-field v-model="form.registration_open_at" type="datetime-local" label="Registration opens (optional)" variant="outlined" density="comfortable" class="span-2"/>
        <v-text-field v-model="form.registration_close_at" type="datetime-local" label="Registration closes (optional)" variant="outlined" density="comfortable" class="span-2"/>
      </div>
    </section>

    <section class="th-form__section">
      <div class="th-form__heading"><span class="th-form__icon"><i class="fa-regular fa-image"></i></span><div><h2>Training media</h2><p>Add a cover image and optional course brochure.</p></div><b>06</b></div>
      <div class="th-media"><AssetUploadField v-model="form.cover_image" :organisation-id="organisationId" folder="covers" label="Cover image" image/><AssetUploadField v-model="form.brochure_url" :organisation-id="organisationId" folder="brochures" label="Brochure (PDF)" accept="application/pdf"/></div>
    </section>

    <div class="th-form__actions">
      <div class="th-save-note">
        <span v-if="saved&&!error" class="th-saved"><i class="fa-solid fa-circle-check"></i> Changes saved successfully</span>
        <span v-else>You can save this as a draft and publish it later.</span>
      </div>
      <v-btn type="submit" color="primary" size="large" :loading="loading" :disabled="!valid" class="th-save-button"><i class="fa-solid fa-floppy-disk mr-2"></i>{{editing?'Save changes':'Create draft'}}<i class="fa-solid fa-arrow-right ml-2"></i></v-btn>
    </div>
  </form>
</template>

<style scoped>
.th-form{--purple:#29143d;--purple2:#432465;--muted:#81758f;--border:#e7e1ec;--lilac:#f7f3fb;display:flex;flex-direction:column;gap:22px;color:#21172b;font-family:'DM Sans',sans-serif}
.th-form__section{padding:27px 28px 28px;border:1px solid var(--border);border-radius:17px;background:#fff;box-shadow:0 8px 24px #2c153208}
.th-form__heading{display:flex;align-items:center;gap:13px;margin-bottom:25px}.th-form__icon{display:grid;place-items:center;flex:0 0 43px;width:43px;height:43px;border:1px solid #eee4f5;border-radius:12px;background:var(--lilac);color:var(--purple2)}
.th-form__heading h2{margin:0 0 4px;color:var(--purple);font:800 17px Manrope,sans-serif;letter-spacing:-.3px}.th-form__heading p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.th-form__heading>b{margin-left:auto;color:#c4b7d0;font:800 12px Manrope,sans-serif;letter-spacing:.8px}
.th-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 16px}.th-grid--four{grid-template-columns:repeat(4,minmax(0,1fr))}.th-stack{display:grid;gap:15px}.span-2{grid-column:span 2}.span-3{grid-column:span 3}
.th-featured{display:flex;align-items:center;min-height:56px;padding:0 12px;border:1px solid #e8e1ed;border-radius:8px;background:#fcfaff}.th-media{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.th-form__actions{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:21px 24px;border:1px solid #eae3ef;border-radius:15px;background:linear-gradient(120deg,#fff,#fbf8fe)}.th-save-note{color:var(--muted);font-size:12px;line-height:1.6}.th-saved{display:inline-flex;align-items:center;gap:7px;color:#19875a;font-weight:700}.th-save-button{min-height:46px;padding-inline:20px;border-radius:9px!important;font-weight:700;letter-spacing:0!important}
@media(max-width:900px){.th-grid--four{grid-template-columns:repeat(2,minmax(0,1fr))}.span-3{grid-column:span 1}}
@media(max-width:600px){.th-form__section{padding:21px 17px}.th-form__heading{align-items:flex-start;gap:10px;margin-bottom:20px}.th-form__icon{flex-basis:38px;width:38px;height:38px}.th-form__heading>b{font-size:10px}.th-grid,.th-grid--four,.th-media{grid-template-columns:minmax(0,1fr)}.span-2,.span-3{grid-column:auto}.th-form__actions{align-items:stretch;flex-direction:column;padding:18px}.th-save-button{width:100%}}
</style>