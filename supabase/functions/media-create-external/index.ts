// ===== media-create-external/index.ts =====
// POST { organisation_id, kind, provider, external_url, duration_seconds? } — YouTube/Vimeo/Bunny/etc. embeds
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
 
serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  const b = await readJson<any>(req)
  if (!isUuid(b.organisation_id)) throw new HttpError(400, 'organisation_id is required')
  await requireOrgPermission(user.id, b.organisation_id, 'course.manage')
  if (!['video', 'audio'].includes(b.kind)) throw new HttpError(400, 'kind must be video or audio')
  if (!['youtube', 'vimeo', 'mux', 'bunny', 'cloudflare', 'external'].includes(b.provider)) throw new HttpError(400, 'Unsupported provider')
  if (typeof b.external_url !== 'string' || !/^https:\/\/[^\s]+$/.test(b.external_url)) throw new HttpError(400, 'A valid https URL is required')
 
  const { data, error } = await getAdminClient().from('media_assets').insert({
    organisation_id: b.organisation_id, kind: b.kind, provider: b.provider, external_url: b.external_url,
    duration_seconds: Math.max(0, Math.floor(Number(b.duration_seconds) || 0)), status: 'ready', uploaded_by: user.id,
  }).select('id').single()
  if (error) throw error
  return jsonResponse({ asset_id: data.id }, 201, req) // use the provider's EMBED url (e.g. youtube.com/embed/ID)
})