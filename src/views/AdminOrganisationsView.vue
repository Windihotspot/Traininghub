<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'
import { OrganisationsService, type OrganisationRow } from '@/services/traininghub/organisations.service'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatDate } from '@/utils/format'
import AccountMenu from '@/components/traininghub/AccountMenu.vue'
import OrgStats from '@/components/traininghub/OrgStats.vue'
import CreateOrganisationForm from '@/components/traininghub/CreateOrganisationForm.vue'

const router = useRouter()
const allowed = ref(false)
const orgs = ref<OrganisationRow[]>([])
const createdMsg = ref('')
const statsKey = ref(0)
const { error, run } = useAsyncAction()

const loadOrgs = () => run(async () => { orgs.value = await OrganisationsService.listAll() })
function onCreated(o: { name: string }) {
  createdMsg.value = `${o.name} created. The owner has been invited.`
  statsKey.value++
  loadOrgs()
}

// UI gate only - admin-create-organisation re-checks platform admin server-side.
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = user
    ? await supabase.from('profiles').select('platform_role').eq('id', user.id).maybeSingle()
    : { data: null }
  if (!data?.platform_role) return router.replace({ name: 'dashboard' })
  allowed.value = true
  loadOrgs()
})
</script>

<template>
  <main v-if="allowed" class="min-h-screen bg-gray-50 py-10 px-4">
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold"><i class="fa-solid fa-building-shield mr-2 text-primary"></i>Platform admin</h1>
        <div class="flex items-center gap-4">
          <v-btn size="small" variant="text" :to="{ name: 'dashboard' }">Dashboard</v-btn>
          <AccountMenu />
        </div>
      </div>

      <OrgStats :key="statsKey" class="mb-8" />

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8" data-aos="fade-up">
        <h2 class="text-lg font-semibold mb-4">Onboard organisation</h2>
        <v-alert v-if="createdMsg" type="success" variant="tonal" class="mb-4" closable @click:close="createdMsg = ''">{{ createdMsg }}</v-alert>
        <CreateOrganisationForm @created="onCreated" />
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error.message }}</v-alert>
      <div class="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <v-table>
          <thead><tr><th>Name</th><th>Slug</th><th>Contact</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            <tr v-for="o in orgs" :key="o.id">
              <td class="font-medium">{{ o.name }}</td>
              <td>{{ o.slug }}</td>
              <td>{{ o.contact_email ?? '—' }}</td>
              <td><v-chip size="x-small" :color="o.is_active ? 'green' : 'grey'" variant="tonal">{{ o.is_active ? 'active' : 'inactive' }}</v-chip></td>
              <td>{{ formatDate(o.created_at) }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </div>
  </main>
</template>
