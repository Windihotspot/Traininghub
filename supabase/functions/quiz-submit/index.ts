// ===== quiz-submit/index.ts =====
// POST { attempt_id, answers: [{ question_id, option_ids: [] }] } — graded server-side
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
 
serveFn(async (req) => {
  const user = await requireUser(req)
  const { attempt_id, answers = [] } = await readJson<any>(req)
  if (!isUuid(attempt_id) || !Array.isArray(answers)) throw new HttpError(400, 'attempt_id and answers are required')
  const admin = getAdminClient()
 
  const { data: att } = await admin.from('assessment_attempts').select('*').eq('id', attempt_id).eq('user_id', user.id).maybeSingle()
  if (!att) throw new HttpError(404, 'Attempt not found')
  if (att.status !== 'in_progress') throw new HttpError(409, 'Attempt already submitted')
  const { data: a } = await admin.from('assessments').select('*').eq('id', att.assessment_id).single()
  const late = a.time_limit_minutes && Date.now() > new Date(att.started_at).getTime() + a.time_limit_minutes * 60000 + 30000
  if (late) {
    await admin.from('assessment_attempts').update({ status: 'expired', passed: false, percentage: 0, submitted_at: new Date().toISOString() }).eq('id', att.id)
    throw new HttpError(410, 'Time limit exceeded')
  }
 
  const { data: qs } = await admin.from('questions').select('id,points,explanation,question_type, options:question_options(id,is_correct)').eq('assessment_id', a.id)
  const given = new Map<string, string[]>(answers.map((x: any) => [x.question_id, Array.isArray(x.option_ids) ? x.option_ids : []]))
 
  let score = 0, max = 0
  const rows: any[] = [], review: any[] = []
  for (const q of qs ?? []) {
    max += Number(q.points)
    const valid = new Set(q.options.map((o: any) => o.id))
    const picked = [...new Set(given.get(q.id) ?? [])].filter((id) => valid.has(id))
    const correct = q.options.filter((o: any) => o.is_correct).map((o: any) => o.id)
    const ok = picked.length === correct.length && picked.every((id) => correct.includes(id)) // all-or-nothing
    const pts = ok ? Number(q.points) : 0
    score += pts
    rows.push({ attempt_id: att.id, question_id: q.id, selected_option_ids: picked, is_correct: ok, points_awarded: pts })
    review.push({ question_id: q.id, is_correct: ok, ...(a.show_answers ? { correct_option_ids: correct, explanation: q.explanation } : {}) })
  }
  const pct = max ? Math.round((score / max) * 10000) / 100 : 0
  const passed = pct >= Number(a.pass_mark)
 
  await admin.from('attempt_answers').insert(rows)
  await admin.from('assessment_attempts').update({
    status: 'submitted', submitted_at: new Date().toISOString(), score, max_score: max, percentage: pct, passed,
  }).eq('id', att.id)
 
  let course_completed = false
  if (passed) {
    const { data } = await admin.rpc('try_complete_enrollment', { p_enrollment: att.enrollment_id })
    course_completed = !!data
  }
  return jsonResponse({ score, max_score: max, percentage: pct, passed, course_completed, review }, 200, req)
})