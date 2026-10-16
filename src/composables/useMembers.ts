import { ref } from 'vue'
import { OrganisationsService } from '@/services/traininghub'
import { useAsyncAction } from './useAsyncAction'
import type { OrgMember, OrgRole } from '@/types/traininghub'

export function useMembers(orgId: () => string) {
  const members = ref<OrgMember[]>([])
  const { loading, error, run } = useAsyncAction()

  const load = () => run(async () => { members.value = await OrganisationsService.listMembers(orgId()) })
  const invite = (email: string, role: OrgRole, name?: string) =>
    run(async () => { const r = await OrganisationsService.invite(orgId(), email, role, name); await load(); return r })
  const changeRole = (userId: string, role: OrgRole) =>
    run(async () => { await OrganisationsService.updateRole(orgId(), userId, role); await load() })
  const remove = (userId: string) =>
    run(async () => { await OrganisationsService.remove(orgId(), userId); await load() })

  return { members, loading, error, load, invite, changeRole, remove }
}
