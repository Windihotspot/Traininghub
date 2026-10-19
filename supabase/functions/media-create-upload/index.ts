// POST { organisation_id, kind, filename, mime_type, size_bytes } -> signed upload URL
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
 
const LIMITS: Record<string, { mime: RegExp; max: number }> = {
  audio:    { mime: /^audio\/(mpeg|mp4|wav|x-m4a|ogg|aac)$/, max: 300 * 1024 ** 2 },
  video:    { mime: /^video\/(mp4|quicktime|webm)$/,          max: 2 * 1024 ** 3 },
  pdf:      { mime: /^application\/pdf$/,                     max: 50 * 1024 ** 2 },
  image:    { mime: /^image\/(png|jpe?g|webp)$/,              max: 10 * 1024 ** 2 },
  document: { mime: /^application\//,                         max: 50 * 1024 ** 2 },
}
 
serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  const { organisation_id, kind, filename, mime_type, size_bytes } = await readJson<any>(req)
  if (!isUuid(organisation_id)) throw new HttpError(400, 'organisation_id is required')
  await requireOrgPermission(user.id, organisation_id, 'course.manage')
 
  const rule = LIMITS[kind]
  if (!rule) throw new HttpError(400, `kind must be one of: ${Object.keys(LIMITS).join(', ')}`)
  if (!rule.mime.test(mime_type ?? '')) throw new HttpError(415, 'Unsupported file type')
  if (!(size_bytes > 0) || size_bytes > rule.max) throw new HttpError(413, 'File too large')
 
  const admin = getAdminClient()
  const safe = String(filename ?? 'file').replace(/[^\w.\-]+/g, '_').slice(-100)
  const { data: asset, error } = await admin.from('media_assets').insert({
    organisation_id, kind, mime_type, size_bytes, uploaded_by: user.id, status: 'pending',
  }).select().single()
  if (error) throw error
 
  const path = `${organisation_id}/${asset.id}/${safe}`
  const { data: signed, error: sErr } = await admin.storage.from('course-media').createSignedUploadUrl(path)
  if (sErr) throw sErr
  await admin.from('media_assets').update({ storage_path: path }).eq('id', asset.id)
 
  // Client uploads to signed.signedUrl, then calls media-confirm (sets status=ready, duration_seconds)
  return jsonResponse({ asset_id: asset.id, path, upload: signed }, 201, req)
})