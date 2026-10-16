<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useOrgContext } from '@/composables/useOrgContext'
import AccountMenu from '@/components/traininghub/AccountMenu.vue'
import OrgStats from '@/components/traininghub/OrgStats.vue'
import OrgTrainingsList from '@/components/traininghub/OrgTrainingsList.vue'
import CategoriesManager from '@/components/traininghub/CategoriesManager.vue'
import RegistrationsTable from '@/components/traininghub/RegistrationsTable.vue'
import PaymentsTable from '@/components/traininghub/PaymentsTable.vue'
import MembersManager from '@/components/traininghub/MembersManager.vue'
import AuditLogTable from '@/components/traininghub/AuditLogTable.vue'
import OrgProfileForm from '@/components/traininghub/OrgProfileForm.vue'
import ExportRegistrationsButton from '@/components/traininghub/ExportRegistrationsButton.vue'

const { orgs, activeOrgId, activeOrg, isPlatformAdmin, canAssignOwner, can, loading, error, load } = useOrgContext()
const tab = ref('trainings')

const tabs = computed(() => [
  { value: 'trainings', label: 'Trainings', icon: 'fa-chalkboard-user', show: can('training.view') },
  { value: 'registrations', label: 'Registrations', icon: 'fa-clipboard-list', show: can('registration.view') },
  { value: 'payments', label: 'Payments', icon: 'fa-credit-card', show: can('payment.view') },
  { value: 'members', label: 'Members', icon: 'fa-users', show: can('user.manage') },
  { value: 'activity', label: 'Activity', icon: 'fa-clock-rotate-left', show: can('audit.view') },
  { value: 'settings', label: 'Settings', icon: 'fa-gear', show: can('organisation.manage') },
].filter(t => t.show))

// permissions load after the org list; keep the selected tab valid
watch(tabs, (v) => { if (v.length && !v.some(t => t.value === tab.value)) tab.value = v[0].value })
onMounted(load)
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-10 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 class="text-2xl font-bold"><i class="fa-solid fa-gauge-high mr-2 text-primary"></i>Dashboard</h1>
        <div class="flex items-center gap-4">
          <v-btn v-if="isPlatformAdmin" size="small" variant="tonal" :to="{ name: 'admin-organisations' }"><i class="fa-solid fa-building-shield mr-2"></i>Platform admin</v-btn>
          <AccountMenu />
        </div>
      </div>

      <v-select v-if="orgs.length > 1" v-model="activeOrgId" :items="orgs" item-title="name" item-value="id"
        label="Organisation" variant="outlined" density="compact" hide-details class="mb-6" style="max-width: 320px" />

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error.message }}</v-alert>
      <div v-if="loading" class="text-center py-24"><v-progress-circular indeterminate color="primary" /></div>
      <v-alert v-else-if="!orgs.length" type="info" variant="tonal">You don't belong to any organisation yet. Ask an organisation owner to invite you.</v-alert>

      <template v-else-if="activeOrgId">
        <OrgStats v-if="can('registration.view')" :organisation-id="activeOrgId" class="mb-8" />

        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div class="overflow-x-auto">
            <v-btn-toggle v-model="tab" mandatory color="primary" density="comfortable" divided>
              <v-btn v-for="t in tabs" :key="t.value" :value="t.value"><i :class="['fa-solid', t.icon, 'mr-2']"></i>{{ t.label }}</v-btn>
            </v-btn-toggle>
          </div>
          <div class="flex gap-2">
            <ExportRegistrationsButton v-if="can('registration.export')" :organisation-id="activeOrgId" />
            <v-btn v-if="tab === 'trainings' && can('training.create')" color="primary" :to="{ name: 'training-new', query: { org: activeOrgId } }">
              <i class="fa-solid fa-plus mr-2"></i>New training
            </v-btn>
          </div>
        </div>

        <template v-if="tab === 'trainings'">
          <OrgTrainingsList :key="activeOrgId" :organisation-id="activeOrgId" :org-slug="activeOrg?.slug"
            :can-edit="can('training.update')" :can-publish="can('training.publish')" />
          <section v-if="can('training.update')" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
            <h3 class="font-semibold mb-3"><i class="fa-solid fa-folder-tree mr-2 text-primary"></i>Categories</h3>
            <CategoriesManager :key="activeOrgId" :organisation-id="activeOrgId" />
          </section>
        </template>
        <RegistrationsTable v-else-if="tab === 'registrations'" :key="activeOrgId" :organisation-id="activeOrgId" :can-update="can('registration.update')" />
        <PaymentsTable v-else-if="tab === 'payments'" :key="activeOrgId" :organisation-id="activeOrgId" />
        <div v-else-if="tab === 'members'" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <MembersManager :key="activeOrgId" :organisation-id="activeOrgId" :can-assign-owner="canAssignOwner" />
        </div>
        <AuditLogTable v-else-if="tab === 'activity'" :key="activeOrgId" :organisation-id="activeOrgId" />
        <div v-else-if="tab === 'settings'" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <OrgProfileForm :key="activeOrgId" :organisation-id="activeOrgId" />
        </div>
      </template>
    </div>
  </main>
</template>
