import { ref, computed, watch } from 'vue'
import { supabase } from '@/services/supabase'
import { OrganisationsService } from '@/services/traininghub'
import { useAsyncAction } from './useAsyncAction'

export interface OrgOption { id: string; name: string; slug: string; role: string }

// Resolves which organisations the signed-in user can manage (platform admins see all)
// and what the active role may do. UI gating only - RLS / edge functions are the real checks.
export function useOrgContext() {
  const orgs = ref<OrgOption[]>([])
  const activeOrgId = ref('')
  const isPlatformAdmin = ref(false)
  const perms = ref<Set<string>>(new Set())
  const { loading, error, run } = useAsyncAction()

  const activeOrg = computed(() => orgs.value.find(o => o.id === activeOrgId.value) ?? null)
  const can = (code: string) => isPlatformAdmin.value || perms.value.has(code)
  const canAssignOwner = computed(() => isPlatformAdmin.value || activeOrg.value?.role === 'org_owner')

  watch([activeOrgId, isPlatformAdmin], async () => {
    perms.value = new Set()
    const role = activeOrg.value?.role
    if (!role || isPlatformAdmin.value) return
    try { perms.value = new Set(await OrganisationsService.rolePermissions(role)) } catch { /* stays empty */ }
  })

  const load = () => run(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', user.id).maybeSingle()
    isPlatformAdmin.value = !!profile?.platform_role

    if (isPlatformAdmin.value) {
      const { data, error: e } = await supabase.from('organisations').select('id, name, slug').order('name')
      if (e) throw e
      orgs.value = (data ?? []).map(o => ({ ...o, role: 'platform' }))
    } else {
      const { data, error: e } = await supabase.from('organisation_members')
        .select('role, organisations(id, name, slug)').eq('user_id', user.id)
      if (e) throw e
      orgs.value = (data ?? []).map((m: any) => ({ ...m.organisations, role: m.role }))
    }
    if (!activeOrgId.value && orgs.value.length) activeOrgId.value = orgs.value[0].id
  })

  return { orgs, activeOrgId, activeOrg, isPlatformAdmin, canAssignOwner, can, loading, error, load }
}
