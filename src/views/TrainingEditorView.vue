<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TrainingsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AccountMenu from '@/components/traininghub/AccountMenu.vue'
import TrainingForm from '@/components/traininghub/TrainingForm.vue'
import TrainingStatusActions from '@/components/traininghub/TrainingStatusActions.vue'
import DiscountsManager from '@/components/traininghub/DiscountsManager.vue'
import CurriculumBuilder from '@/components/lms/CurriculumBuilder.vue'
import type { Training } from '@/types/traininghub'

const route = useRoute()
const router = useRouter()
const training = ref<Training | null>(null)
const ready = ref(false)
const tab = ref<'details' | 'curriculum'>('details')
const { loading, error, run } = useAsyncAction()
const trainingId = computed(() => route.params.id ? String(route.params.id) : '')
const organisationId = computed(() => training.value?.organisation_id ?? String(route.query.org ?? ''))
const hasCurriculum = computed(() => !!training.value && training.value.format !== 'live')

onMounted(() => run(async () => {
  if (trainingId.value) training.value = await TrainingsService.getById(trainingId.value)
  ready.value = true
}))

function onSaved(t: Training) {
  const wasNew = !training.value
  training.value = t
  if (wasNew) router.replace({ name: 'training-edit', params: { id: t.id } })
}
function onTrainingUpdated(t: Training) {
  training.value = { ...training.value!, ...t }
}
</script>

<template>
  <main class="th-editor">
    <div class="th-editor__container">
      <header class="th-editor__topbar">
        <RouterLink :to="{ name: 'dashboard' }" class="th-back"><i class="fa-solid fa-arrow-left"></i> Back to dashboard</RouterLink>
        <AccountMenu />
      </header>

      <div v-if="loading || !ready" class="th-state">
        <v-progress-circular indeterminate color="primary" />
        <p>Loading training details…</p>
      </div>
      <v-alert v-else-if="error" type="error" variant="tonal">{{ error.message }}</v-alert>
      <v-alert v-else-if="trainingId && !training" type="warning" variant="tonal">Training not found, or you don't have access.</v-alert>
      <v-alert v-else-if="!organisationId" type="warning" variant="tonal">No organisation selected. Start from the dashboard.</v-alert>

      <template v-else>
        <section class="th-hero">
          <div>
            <span class="th-eyebrow"><i></i> TRAINING WORKSPACE</span>
            <h1>{{ training ? 'Edit training' : 'Create a training' }}</h1>
            <p>{{ training ? 'Keep your programme details, schedule and registration settings up to date.' : 'Build your programme details and save it as a draft when you’re ready.' }}</p>
          </div>
          <div class="th-hero__icon"><i :class="training ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-graduation-cap'"></i></div>
        </section>

        <section v-if="training" class="th-status">
          <div><span class="th-label">CURRENT STATUS</span><strong>{{ training.status.replace('_', ' ') }}</strong></div>
          <TrainingStatusActions :training="training" @updated="onTrainingUpdated" />
        </section>

        <v-tabs v-if="hasCurriculum" v-model="tab" color="primary" class="th-tabs m-4">
          <v-tab value="details"><i class="fa-solid fa-circle-info mr-2"></i>Details</v-tab>
          <v-tab value="curriculum"><i class="fa-solid fa-list-check mr-2"></i>Curriculum</v-tab>
        </v-tabs>

        <div v-show="tab === 'details' || !hasCurriculum">
          <TrainingForm :key="training?.id ?? 'new'" :organisation-id="organisationId" :training="training" @saved="onSaved" />

          <section v-if="training" class="th-discounts">
            <div class="th-section-heading">
              <span class="th-icon"><i class="fa-solid fa-percent"></i></span>
              <div><h2>Group discounts</h2><p>Reward group registrations with a discount.</p></div>
            </div>
            <DiscountsManager :organisation-id="organisationId" :training-id="training.id" />
          </section>
        </div>

        <section v-if="hasCurriculum && tab === 'curriculum'" class="th-discounts">
          <div class="th-section-heading">
            <span class="th-icon"><i class="fa-solid fa-layer-group"></i></span>
            <div><h2>Curriculum</h2><p>Modules, lessons, audio and video, and assessments.</p></div>
          </div>
          <CurriculumBuilder :training-id="training!.id" :organisation-id="training!.organisation_id" />
        </section>
      </template>
      <footer class="th-footer">TrainHub <span>·</span> Professional training, connected.</footer>
    </div>
  </main>
</template>

<style scoped>
.th-editor{--purple:#29143d;--purple2:#432465;--muted:#81758f;--border:#e7e1ec;--lilac:#f7f3fb;--gold:#f7c948;min-height:100vh;padding:30px 24px 20px;background:#faf8fc;color:#21172b;font-family:'DM Sans',sans-serif}
.th-editor__container{width:100%;max-width:1060px;margin:auto}.th-editor__topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:32px}
.th-back{display:inline-flex;align-items:center;gap:9px;color:var(--muted);text-decoration:none;font-size:13px;font-weight:600}.th-back:hover{color:var(--purple2)}
.th-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px;padding:30px 32px;border:1px solid #eae3ef;border-radius:18px;background:linear-gradient(120deg,#fff,#fbf8fe);box-shadow:0 12px 32px #2c15320a}
.th-eyebrow,.th-label{display:inline-flex;align-items:center;gap:8px;color:#8d79a0;font-size:10px;font-weight:800;letter-spacing:1.1px}.th-eyebrow i{width:7px;height:7px;border-radius:50%;background:var(--gold)}
.th-hero h1{margin:13px 0 8px;color:var(--purple);font-family:Manrope,sans-serif;font-size:clamp(28px,4vw,36px);font-weight:800;line-height:1.2;letter-spacing:-1px}.th-hero p{max-width:620px;margin:0;color:var(--muted);font-size:13px;line-height:1.8}
.th-hero__icon{display:grid;place-items:center;flex:0 0 66px;width:66px;height:66px;border:1px solid #eee4f5;border-radius:18px;background:var(--lilac);color:var(--purple2);font-size:25px}
.th-status,.th-discounts{margin-bottom:24px;padding:24px;border:1px solid var(--border);border-radius:16px;background:#fff;box-shadow:0 8px 24px #2c153208}
.th-status{display:flex;align-items:center;justify-content:space-between;gap:20px}.th-status>div{display:flex;flex-direction:column;align-items:flex-start;gap:7px}.th-status strong{color:var(--purple);font:800 16px Manrope,sans-serif;text-transform:capitalize}
.th-section-heading{display:flex;align-items:center;gap:13px;margin-bottom:22px}.th-icon{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border-radius:12px;background:var(--lilac);color:var(--purple2)}
.th-section-heading h2{margin:0 0 4px;color:var(--purple);font:800 18px Manrope,sans-serif}.th-section-heading p{margin:0;color:var(--muted);font-size:12px}
.th-tabs{margin-bottom:20px;border-bottom:1px solid var(--border)}
.th-state{display:flex;min-height:280px;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:var(--muted);font-size:13px}.th-footer{padding:26px 0 8px;color:#a095aa;font-size:11px;text-align:center}.th-footer span{padding:0 5px;color:var(--gold)}
@media(max-width:600px){.th-editor{padding:18px 14px}.th-editor__topbar{margin-bottom:22px}.th-hero{padding:23px 20px}.th-hero__icon{display:none}.th-status{align-items:flex-start;flex-direction:column}.th-status,.th-discounts{padding:19px}}
</style>