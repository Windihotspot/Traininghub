// POST /functions/v1/trainings-set-status
// body: { training_id, action: publish|unpublish|open_registration|close_registration|complete|archive }
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { logAudit } from '../_shared/audit.ts'

const transitions: Record<string, { from: string[]; to: string }> = {
  publish:            { from: ['draft'], to: 'published' },
  unpublish:          { from: ['published', 'registration_open'], to: 'draft' },
  open_registration:  { from: ['published', 'registration_closed'], to: 'registration_open' },
  close_registration: { from: ['registration_open'], to: 'registration_closed' },
  complete:           { from: ['published', 'registration_open', 'registration_closed'], to: 'completed' },
  archive:            { from: ['draft', 'published', 'registration_closed', 'completed'], to: 'archived' },
}

serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  const { training_id, action } = await readJson<any>(req)
  if (!isUuid(training_id)) throw new HttpError(400, 'training_id is required')
  const rule = transitions[action]
  if (!rule) throw new HttpError(400, `action must be one of: ${Object.keys(transitions).join(', ')}`)

  const admin = getAdminClient()
  const { data: t } = await admin.from('trainings').select('*').eq('id', training_id).maybeSingle()
  if (!t) throw new HttpError(404, 'Training not found')

  await requireOrgPermission(user.id, t.organisation_id, 'training.publish') // tenant check
  if (!rule.from.includes(t.status)) throw new HttpError(409, `Cannot ${action} a training that is ${t.status}`)

  if (['publish', 'open_registration'].includes(action)) {
    const missing: string[] = []
    if (!t.title?.trim()) missing.push('title')
    if (t.fee == null) missing.push('fee')

    if (t.format !== 'self_paced') { // live and blended need a schedule
      if (!t.start_date) missing.push('start_date')
      if (!t.end_date) missing.push('end_date')
      if (!t.start_time) missing.push('start_time')
      if (['physical', 'hybrid'].includes(t.delivery_mode) && !t.location) missing.push('location')
    }

    if (t.format !== 'live') { // self-paced and blended need published content
      const { count } = await admin.from('lessons').select('id', { count: 'exact', head: true })
        .eq('training_id', t.id).eq('is_published', true)
      if (!count) missing.push('at least one published lesson')
    }

    if (missing.length) throw new HttpError(422, 'Training is incomplete', { missing })
  }

  if (action === 'unpublish') {
    const { count } = await admin.from('registrations').select('id', { count: 'exact', head: true })
      .eq('training_id', t.id).neq('status', 'cancelled')
    if (count) throw new HttpError(409, 'Cannot unpublish a training that already has registrations')
  }

  const { data: updated, error } = await admin.from('trainings')
    .update({ status: rule.to, updated_by: user.id }).eq('id', t.id).select().single()
  if (error) throw error

  await logAudit({ organisation_id: t.organisation_id, actor_id: user.id, actor_email: user.email,
    action: `TRAINING_${action.toUpperCase()}`, resource_type: 'training', resource_id: t.id,
    metadata: { from: t.status, to: rule.to } }, req)

  return jsonResponse({ training: updated }, 200, req)
})