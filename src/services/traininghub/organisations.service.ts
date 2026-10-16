import ApiService from '@/services/api'
import { supabase } from '@/services/supabase'
import type { OrgMember, OrgRole, CreateOrganisationPayload, AuditRow } from '@/types/traininghub'

export interface OrganisationRow {
  id: string; name: string; slug: string; description: string | null; logo_url: string | null
  website: string | null; contact_email: string | null; contact_phone: string | null
  is_active: boolean; created_at: string
}
export type OrganisationProfileInput = Pick<OrganisationRow, 'name' | 'description' | 'logo_url' | 'website' | 'contact_email' | 'contact_phone'>

export const OrganisationsService = {
  create: (payload: CreateOrganisationPayload) =>
    ApiService.post<{ organisation: { id: string; name: string; slug: string }; owner_user_id: string }>(
      '/admin-create-organisation', payload),

  async listAll(): Promise<OrganisationRow[]> {
    const { data, error } = await supabase.from('organisations').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as OrganisationRow[]
  },

  async get(id: string): Promise<OrganisationRow | null> {
    const { data, error } = await supabase.from('organisations').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as OrganisationRow | null
  },

  // RLS + column grants: only these columns are writable, and only with organisation.manage
  async updateProfile(id: string, input: OrganisationProfileInput) {
    const { data, error } = await supabase.from('organisations').update(input).eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error("You don't have permission to edit this organisation.")
  },

  async rolePermissions(role: string): Promise<string[]> {
    const { data, error } = await supabase.from('role_permissions').select('permission_code').eq('role', role)
    if (error) throw error
    return (data ?? []).map((r: any) => r.permission_code as string)
  },

  async listMembers(organisationId: string): Promise<OrgMember[]> {
    const { data, error } = await supabase.from('organisation_members')
      .select('id, user_id, role, profiles(full_name, email)').eq('organisation_id', organisationId)
    if (error) throw error
    return (data ?? []) as unknown as OrgMember[]
  },

  invite: (organisation_id: string, email: string, role: OrgRole, full_name?: string) =>
    ApiService.post<{ user_id: string; invited: boolean }>('/org-members-manage',
      { organisation_id, action: 'invite', email, role, full_name }),

  updateRole: (organisation_id: string, user_id: string, role: OrgRole) =>
    ApiService.post('/org-members-manage', { organisation_id, action: 'update_role', user_id, role }),

  remove: (organisation_id: string, user_id: string) =>
    ApiService.post('/org-members-manage', { organisation_id, action: 'remove', user_id }),

  async listAudit(organisationId: string): Promise<AuditRow[]> {
    const { data, error } = await supabase.from('audit_logs').select('*')
      .eq('organisation_id', organisationId).order('created_at', { ascending: false }).limit(200)
    if (error) throw error
    return (data ?? []) as AuditRow[]
  },

  async orgStats(organisationId: string) {
    const { data, error } = await supabase.rpc('org_dashboard_stats', { p_org: organisationId })
    if (error) throw error
    return data as Record<string, number>
  },

  async platformStats() {
    const { data, error } = await supabase.rpc('platform_dashboard_stats')
    if (error) throw error
    return data as Record<string, number>
  },
}
