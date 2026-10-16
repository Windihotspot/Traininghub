<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useMembers } from '@/composables/useMembers'
import type { OrgRole } from '@/types/traininghub'

const props = defineProps<{ organisationId: string; canAssignOwner?: boolean }>()
const { members, loading, error, load, invite, changeRole, remove } = useMembers(() => props.organisationId)

const roles: { value: OrgRole; title: string }[] = [
  { value: 'org_owner', title: 'Owner' }, { value: 'org_admin', title: 'Admin' }, { value: 'org_staff', title: 'Staff' },
]
const form = reactive({ email: '', full_name: '', role: 'org_staff' as OrgRole })

async function onInvite() {
  const res = await invite(form.email, form.role, form.full_name || undefined)
  if (res) Object.assign(form, { email: '', full_name: '', role: 'org_staff' })
}
const onRemove = (userId: string) => { if (window.confirm('Remove this member?')) remove(userId) }

onMounted(load)
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable>{{ error.message }}</v-alert>

    <form class="grid md:grid-cols-4 gap-3 mb-6" @submit.prevent="onInvite">
      <v-text-field v-model="form.full_name" label="Full name" variant="outlined" density="comfortable" hide-details />
      <v-text-field v-model="form.email" label="Email" type="email" variant="outlined" density="comfortable" hide-details />
      <v-select v-model="form.role" :items="roles.filter(r => canAssignOwner || r.value !== 'org_owner')"
        label="Role" variant="outlined" density="comfortable" hide-details />
      <v-btn type="submit" color="primary" :loading="loading" :disabled="!form.email"><i class="fa-solid fa-user-plus mr-2"></i>Invite</v-btn>
    </form>

    <v-table>
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
      <tbody>
        <tr v-for="m in members" :key="m.id">
          <td>{{ m.profiles?.full_name ?? '—' }}</td>
          <td>{{ m.profiles?.email }}</td>
          <td style="width: 180px">
            <v-select :model-value="m.role" :items="roles" density="compact" variant="underlined" hide-details
              :disabled="loading" @update:model-value="(r: OrgRole) => changeRole(m.user_id, r)" />
          </td>
          <td class="text-right">
            <v-btn icon size="small" variant="text" color="error" :disabled="loading" @click="onRemove(m.user_id)">
              <i class="fa-solid fa-trash"></i>
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>
