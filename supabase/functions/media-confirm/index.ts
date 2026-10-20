// ===== media-confirm/index.ts =====
// POST { asset_id, duration_seconds } — called after the browser finished uploading
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
 
serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  const { asset_id, duration_seconds = 0 } = await readJson<any>(req)
  if (!isUuid(asset_id)) throw new HttpError(400, 'asset_id is required')
  const admin = getAdminClient()
  const { data: a } = await admin.from('media_assets').select('*').eq('id', asset_id).maybeSingle()
  if (!a) throw new HttpError(404, 'Asset not found')
  await requireOrgPermission(user.id, a.organisation_id, 'course.manage')
 
  const { error } = await admin.storage.from('course-media').createSignedUrl(a.storage_path, 60) // proves the object exists
  if (error) throw new HttpError(409, 'Upload not found. Please upload again.')
  const dur = Math.min(Math.max(0, Math.floor(Number(duration_seconds) || 0)), 60 * 60 * 12)
  await admin.from('media_assets').update({ status: 'ready', duration_seconds: dur }).eq('id', a.id)
  return jsonResponse({ asset_id: a.id, status: 'ready' }, 200, req)
})