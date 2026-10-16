// _shared/auth.ts
import { getAdminClient, getAuthenticatedUser } from './supabaseAdmin.ts'
import { HttpError } from './handler.ts'

export async function requireUser(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) throw new HttpError(401, 'Unauthorized')
  return user
}

/** Tenant security: the org comes from the request, but access is derived from the user. */
export async function requireOrgPermission(userId: string, orgId: string, permission: string) {
  const { data, error } = await getAdminClient().rpc('user_has_org_permission', {
    p_user: userId, p_org: orgId, p_perm: permission,
  })
  if (error) throw error
  if (!data) throw new HttpError(403, 'Forbidden')
}

export async function getPlatformRole(userId: string): Promise<string | null> {
  const { data } = await getAdminClient()
    .from('profiles').select('platform_role').eq('id', userId).maybeSingle()
  return data?.platform_role ?? null
}

export async function requirePlatformAdmin(userId: string) {
  if (!(await getPlatformRole(userId))) throw new HttpError(403, 'Forbidden')
}

export async function getOrgRole(userId: string, orgId: string): Promise<string | null> {
  const { data } = await getAdminClient()
    .from('organisation_members').select('role')
    .eq('user_id', userId).eq('organisation_id', orgId).maybeSingle()
  return data?.role ?? null
}
