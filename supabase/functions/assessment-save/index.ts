// ===== assessment-save/index.ts =====
// POST { training_id, assessment: {id?, ...settings}, questions: [{question_type, prompt, points, explanation, options:[{option_text,is_correct}]}] }
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
 
serveFn(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  const { training_id, assessment = {}, questions = [] } = await readJson<any>(req)
  if (!isUuid(training_id)) throw new HttpError(400, 'training_id is required')
  const admin = getAdminClient()
  const { data: t } = await admin.from('trainings').select('id, organisation_id').eq('id', training_id).maybeSingle()
  if (!t) throw new HttpError(404, 'Training not found')
  await requireOrgPermission(user.id, t.organisation_id, 'assessment.manage')
 
  if (!assessment.title?.trim()) throw new HttpError(400, 'title is required')
  if (assessment.is_published && !questions.length) throw new HttpError(422, 'Add at least one question before publishing')
  for (const [i, q] of questions.entries()) {
    const opts = q.options ?? []
    const correct = opts.filter((o: any) => o.is_correct).length
    if (!q.prompt?.trim()) throw new HttpError(422, `Question ${i + 1}: prompt is required`)
    if (opts.length < 2) throw new HttpError(422, `Question ${i + 1}: needs at least 2 options`)
    if (q.question_type === 'multiple_choice' ? correct < 1 : correct !== 1)
      throw new HttpError(422, `Question ${i + 1}: invalid number of correct options`)
  }
 
  const settings = (({ title, description, assessment_type, pass_mark, max_attempts, time_limit_minutes,
    shuffle_questions, show_answers, is_required, is_published, module_id, position }) =>
    ({ title, description, assessment_type, pass_mark, max_attempts, time_limit_minutes,
       shuffle_questions, show_answers, is_required, is_published, module_id, position }))(assessment)
  const clean = Object.fromEntries(Object.entries(settings).filter(([, v]) => v !== undefined))
 
  let assessmentId = assessment.id
  if (assessmentId) {
    const { count } = await admin.from('assessment_attempts').select('id', { count: 'exact', head: true }).eq('assessment_id', assessmentId)
    if (count) throw new HttpError(409, 'Learners have attempted this assessment. Create a new one instead of editing.')
    const { error } = await admin.from('assessments').update({ ...clean, updated_at: new Date().toISOString() })
      .eq('id', assessmentId).eq('training_id', training_id)
    if (error) throw error
    await admin.from('questions').delete().eq('assessment_id', assessmentId)
  } else {
    const { data, error } = await admin.from('assessments')
      .insert({ ...clean, training_id, organisation_id: t.organisation_id }).select('id').single()
    if (error) throw error
    assessmentId = data.id
  }
 
  for (const [i, q] of questions.entries()) {
    const { data: qr, error } = await admin.from('questions').insert({
      organisation_id: t.organisation_id, assessment_id: assessmentId, position: i,
      question_type: q.question_type, prompt: q.prompt, explanation: q.explanation ?? null, points: q.points ?? 1,
    }).select('id').single()
    if (error) throw error
    const { error: oErr } = await admin.from('question_options').insert(
      q.options.map((o: any, j: number) => ({ question_id: qr.id, option_text: o.option_text, is_correct: !!o.is_correct, position: j })))
    if (oErr) throw oErr
  }
  return jsonResponse({ assessment_id: assessmentId }, 200, req)
})