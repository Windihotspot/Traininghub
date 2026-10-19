// ===== quiz-start/index.ts =====
// POST { assessment_id } -> attempt + questions WITHOUT is_correct
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { requireEnrollment } from '../_shared/learner.ts'
 
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1])
 
serveFn(async (req) => {
  const user = await requireUser(req)
  const { assessment_id } = await readJson<any>(req)
  if (!isUuid(assessment_id)) throw new HttpError(400, 'assessment_id is required')
  const admin = getAdminClient()
  const { data: a } = await admin.from('assessments').select('*').eq('id', assessment_id).eq('is_published', true).maybeSingle()
  if (!a) throw new HttpError(404, 'Assessment not found')
  const e = await requireEnrollment(user, a.training_id)
  if (e.status === 'completed') throw new HttpError(409, 'Course already completed')
 
  const { data: prior } = await admin.from('assessment_attempts').select('*').eq('assessment_id', a.id).eq('enrollment_id', e.id).order('attempt_no')
  let attempt = (prior ?? []).find((p) => p.status === 'in_progress')
  const expired = (at: any) => a.time_limit_minutes && Date.now() > new Date(at.started_at).getTime() + a.time_limit_minutes * 60000 + 30000
 
  if (attempt && expired(attempt)) { // abandoned & timed out: close it and fall through to a new one
    await admin.from('assessment_attempts').update({ status: 'expired', passed: false, percentage: 0, submitted_at: new Date().toISOString() }).eq('id', attempt.id)
    attempt = undefined
  }
  if (!attempt) {
    const used = (prior ?? []).length
    if (a.max_attempts && used >= a.max_attempts) throw new HttpError(409, 'No attempts remaining')
    const { data, error } = await admin.from('assessment_attempts').insert({
      organisation_id: a.organisation_id, assessment_id: a.id, enrollment_id: e.id, user_id: user.id, attempt_no: used + 1,
    }).select().single()
    if (error) throw error
    attempt = data
  }
 
  const { data: qs } = await admin.from('questions').select('id,question_type,prompt,points,position, options:question_options(id,option_text,position)')
    .eq('assessment_id', a.id).order('position')
  let questions = (qs ?? []).map((q) => ({ ...q, options: shuffle(q.options) }))
  if (a.shuffle_questions) questions = shuffle(questions)
 
  return jsonResponse({
    attempt_id: attempt.id, attempt_no: attempt.attempt_no, started_at: attempt.started_at,
    time_limit_minutes: a.time_limit_minutes, pass_mark: a.pass_mark, questions,
  }, 200, req)
})
 