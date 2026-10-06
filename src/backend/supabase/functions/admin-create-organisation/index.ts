// POST /functions/v1/admin-create-organisation   (platform admins only)
// body: { name, slug?, description?, contact_email?, owner_email, owner_name? }
import { serveFn, readJson, HttpError, isEmail } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requirePlatformAdmin } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { logAudit } from '../_shared/audit.ts'

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  await requirePlatformAdmin(user.id)

  const b = await readJson<any>(req)
  if (!b.name?.trim() || !isEmail(b.owner_email)) throw new HttpError(400, 'name and a valid owner_email are required')
  const slug = slugify(b.slug || b.name)
  if (!slug) throw new HttpError(400, 'Invalid slug')

  const admin = getAdminClient()
  const { data: org, error } = await admin.from('organisations').insert({
    name: b.name.trim(), slug, description: b.description ?? null, contact_email: b.contact_email ?? b.owner_email,
  }).select().single()
  if (error) throw new HttpError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Slug already in use' : error.message)

  const ownerEmail = b.owner_email.trim().toLowerCase()
  let { data: profile } = await admin.from('profiles').select('id').eq('email', ownerEmail).maybeSingle()
  if (!profile) {
    const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
    const { data, error: invErr } = await admin.auth.admin.inviteUserByEmail(ownerEmail, {
      data: { full_name: b.owner_name ?? null }, redirectTo: `${appUrl}/dashboard` })
    if (invErr) { await admin.from('organisations').delete().eq('id', org.id); throw new HttpError(400, invErr.message) }
    profile = { id: data.user.id }
  }
  await admin.from('organisation_members').insert({ organisation_id: org.id, user_id: profile.id, role: 'org_owner' })

  await logAudit({ organisation_id: org.id, actor_id: user.id, actor_email: user.email, action: 'ORGANISATION_CREATED',
    resource_type: 'organisation', resource_id: org.id, metadata: { owner_email: ownerEmail } }, req)

  return jsonResponse({ organisation: org, owner_user_id: profile.id }, 201, req)
})
