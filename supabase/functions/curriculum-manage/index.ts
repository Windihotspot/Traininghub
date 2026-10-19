// POST { training_id, entity: module|lesson, op: create|update|delete|reorder, id?, data?, order?: uuid[] }
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { logAudit } from '../_shared/audit.ts'
 
const CFG: Record<string, { table: string; fields: string[] }> = {
  module: { table: 'course_modules', fields: ['title', 'description', 'is_published', 'release_at'] },
  lesson: { table: 'lessons', fields: ['module_id', 'title', 'description', 'lesson_type', 'is_preview',
    'is_published', 'is_required', 'media_asset_id', 'text_content', 'duration_seconds', 'release_at'] },
}
const pick = (src: any, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => src && k in src).map((k) => [k, src[k]]))
 
serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  const { training_id, entity, op, id, data, order } = await readJson<any>(req)
  const cfg = CFG[entity]
  if (!cfg) throw new HttpError(400, 'entity must be module or lesson')
  if (!isUuid(training_id)) throw new HttpError(400, 'training_id is required')
 
  const admin = getAdminClient()
  const { data: t } = await admin.from('trainings').select('id, organisation_id').eq('id', training_id).maybeSingle()
  if (!t) throw new HttpError(404, 'Training not found')
  await requireOrgPermission(user.id, t.organisation_id, 'course.manage')
 
  const scope = { organisation_id: t.organisation_id, training_id }
  const fields = pick(data, cfg.fields)
 
  // Cross-tenant guards for referenced ids
  if (entity === 'lesson') {
    if (fields.module_id) {
      const { data: m } = await admin.from('course_modules').select('id').eq('id', fields.module_id).eq('training_id', training_id).maybeSingle()
      if (!m) throw new HttpError(400, 'module_id does not belong to this training')
    }
    if (fields.media_asset_id) {
      const { data: a } = await admin.from('media_assets').select('id, kind').eq('id', fields.media_asset_id).eq('organisation_id', t.organisation_id).maybeSingle()
      if (!a) throw new HttpError(400, 'media_asset_id is invalid')
    }
    if (fields.lesson_type && !['video','audio','text','pdf','live_session'].includes(fields.lesson_type))
      throw new HttpError(400, 'Invalid lesson_type')
  }
 
  let result: unknown = { ok: true }
  if (op === 'create') {
    if (!fields.title?.toString().trim()) throw new HttpError(400, 'title is required')
    if (entity === 'lesson' && (!fields.module_id || !fields.lesson_type)) throw new HttpError(400, 'module_id and lesson_type are required')
    const { count } = await admin.from(cfg.table).select('id', { count: 'exact', head: true }).eq('training_id', training_id)
    const { data: row, error } = await admin.from(cfg.table).insert({ ...fields, ...scope, position: count ?? 0 }).select().single()
    if (error) throw error
    result = { [entity]: row }
  } else if (op === 'update') {
    if (!isUuid(id)) throw new HttpError(400, 'id is required')
    const { data: row, error } = await admin.from(cfg.table).update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id).eq('training_id', training_id).select().maybeSingle()
    if (error) throw error
    if (!row) throw new HttpError(404, 'Not found')
    result = { [entity]: row }
  } else if (op === 'delete') {
    if (!isUuid(id)) throw new HttpError(400, 'id is required')
    const lessonIds = entity === 'lesson' ? [id]
      : ((await admin.from('lessons').select('id').eq('module_id', id)).data ?? []).map((l) => l.id)
    if (lessonIds.length) {
      const { count } = await admin.from('lesson_progress').select('id', { count: 'exact', head: true }).in('lesson_id', lessonIds)
      if (count) throw new HttpError(409, 'Learners have progress here. Unpublish instead of deleting.')
    }
    const { error } = await admin.from(cfg.table).delete().eq('id', id).eq('training_id', training_id)
    if (error) throw error
  } else if (op === 'reorder') {
    if (!Array.isArray(order) || !order.every(isUuid)) throw new HttpError(400, 'order must be an array of ids')
    await Promise.all(order.map((oid: string, i: number) =>
      admin.from(cfg.table).update({ position: i }).eq('id', oid).eq('training_id', training_id)))
  } else throw new HttpError(400, 'op must be create, update, delete or reorder')
 
  // Keep the course duration in sync
  const { data: durs } = await admin.from('lessons').select('duration_seconds').eq('training_id', training_id).eq('is_published', true)
  await admin.from('trainings').update({ total_duration_seconds: (durs ?? []).reduce((s, l) => s + l.duration_seconds, 0) }).eq('id', training_id)
 
  await logAudit({ organisation_id: t.organisation_id, actor_id: user.id, actor_email: user.email,
    action: `${entity.toUpperCase()}_${op.toUpperCase()}`, resource_type: entity, resource_id: id ?? null,
    metadata: { training_id } }, req)
  return jsonResponse(result, op === 'create' ? 201 : 200, req)
})