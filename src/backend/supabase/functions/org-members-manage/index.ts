// POST /functions/v1/org-members-manage
// body: { organisation_id, action: 'invite'|'update_role'|'remove', email?, full_name?, user_id?, role? }
import { serveFn, readJson, HttpError, isUuid, isEmail } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission, getOrgRole, getPlatformRole } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { sendEmail, templates } from '../_shared/email.ts'
import { logAudit } from '../_shared/audit.ts'

const ROLES = ['org_owner', 'org_admin', 'org_staff']

serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  const b = await readJson<any>(req)
  if (!isUuid(b.organisation_id)) throw new HttpError(400, 'organisation_id is required')
  await requireOrgPermission(user.id, b.organisation_id, 'user.manage')

  const admin = getAdminClient()
  const callerOrgRole = await getOrgRole(user.id, b.organisation_id)
  const isOwnerOrPlatform = callerOrgRole === 'org_owner' || !!(await getPlatformRole(user.id))
  const { data: org } = await admin.from('organisations').select('name').eq('id', b.organisation_id).single()
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')

  if (b.action === 'invite') {
    if (!isEmail(b.email) || !ROLES.includes(b.role)) throw new HttpError(400, 'Valid email and role are required')
    if (b.role === 'org_owner' && !isOwnerOrPlatform) throw new HttpError(403, 'Only an owner can assign the owner role')
    const email = b.email.trim().toLowerCase()

    let { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    let invited = false
    if (!profile) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: b.full_name ?? null }, redirectTo: `${appUrl}/dashboard`,
      })
      if (error) throw new HttpError(400, error.message)
      invited = true
      // profile row is created by the auth.users trigger
      profile = { id: data.user.id }
    }
    const { error } = await admin.from('organisation_members')
      .upsert({ organisation_id: b.organisation_id, user_id: profile.id, role: b.role }, { onConflict: 'organisation_id,user_id' })
    if (error) throw error
    if (!invited) await sendEmail({ to: email, ...templates.memberInvite({ org: org?.name ?? '', role: b.role, url: `${appUrl}/dashboard` }) })
    await logAudit({ organisation_id: b.organisation_id, actor_id: user.id, actor_email: user.email, action: 'MEMBER_ADDED',
      resource_type: 'user', resource_id: profile.id, metadata: { role: b.role, invited } }, req)
    return jsonResponse({ user_id: profile.id, invited }, 200, req)
  }

  if (b.action === 'update_role' || b.action === 'remove') {
    if (!isUuid(b.user_id)) throw new HttpError(400, 'user_id is required')
    const { data: target } = await admin.from('organisation_members').select('role')
      .eq('organisation_id', b.organisation_id).eq('user_id', b.user_id).maybeSingle()
    if (!target) throw new HttpError(404, 'Member not found')
    if ((target.role === 'org_owner' || b.role === 'org_owner') && !isOwnerOrPlatform) {
      throw new HttpError(403, 'Only an owner can change owner memberships')
    }
    if (target.role === 'org_owner' && (b.action === 'remove' || b.role !== 'org_owner')) {
      const { count } = await admin.from('organisation_members').select('id', { count: 'exact', head: true })
        .eq('organisation_id', b.organisation_id).eq('role', 'org_owner')
      if ((count ?? 0) <= 1) throw new HttpError(409, 'An organisation must keep at least one owner')
    }
    if (b.action === 'update_role') {
      if (!ROLES.includes(b.role)) throw new HttpError(400, 'Invalid role')
      await admin.from('organisation_members').update({ role: b.role })
        .eq('organisation_id', b.organisation_id).eq('user_id', b.user_id)
    } else {
      await admin.from('organisation_members').delete()
        .eq('organisation_id', b.organisation_id).eq('user_id', b.user_id)
    }
    await logAudit({ organisation_id: b.organisation_id, actor_id: user.id, actor_email: user.email,
      action: b.action === 'remove' ? 'MEMBER_REMOVED' : 'MEMBER_ROLE_CHANGED', resource_type: 'user',
      resource_id: b.user_id, metadata: { role: b.role ?? null } }, req)
    return jsonResponse({ ok: true }, 200, req)
  }

  throw new HttpError(400, "action must be 'invite', 'update_role' or 'remove'")
})
