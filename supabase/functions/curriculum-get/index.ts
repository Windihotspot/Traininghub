// ===== curriculum-get/index.ts =====
// POST { training_id } — full authoring tree, including correct answers (staff only)
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
 
serveFn(async (req) => {
  const user = await requireUser(req)
  const { training_id } = await readJson<any>(req)
  if (!isUuid(training_id)) throw new HttpError(400, 'training_id is required')
  const admin = getAdminClient()
  const { data: t } = await admin.from('trainings').select('id, organisation_id').eq('id', training_id).maybeSingle()
  if (!t) throw new HttpError(404, 'Training not found')
  await requireOrgPermission(user.id, t.organisation_id, 'course.manage')
 
  const [m, l, a] = await Promise.all([
    admin.from('course_modules').select('*').eq('training_id', training_id).order('position'),
    admin.from('lessons').select('*, media:media_assets(id,kind,status,provider,external_url)').eq('training_id', training_id).order('position'),
    admin.from('assessments').select('*, questions(id,question_type,prompt,explanation,points,position, options:question_options(id,option_text,is_correct,position))')
      .eq('training_id', training_id).order('position'),
  ])
  if (m.error || l.error || a.error) throw (m.error ?? l.error ?? a.error)
  const assessments = (a.data ?? []).map((x: any) => ({
    ...x,
    questions: (x.questions ?? []).sort((p: any, q: any) => p.position - q.position)
      .map((q: any) => ({ ...q, options: q.options.sort((p: any, r: any) => p.position - r.position) })),
  }))
  return jsonResponse({ modules: m.data, lessons: l.data, assessments }, 200, req)
})