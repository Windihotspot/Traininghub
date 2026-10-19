// ===== learn-get-course/index.ts =====
// POST { training_id } -> curriculum + progress + locks + assessments
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { requireEnrollment, computeLocks } from '../_shared/learner.ts'
 
serveFn(async (req) => {
  const user = await requireUser(req)
  const { training_id } = await readJson<any>(req)
  if (!isUuid(training_id)) throw new HttpError(400, 'training_id is required')
  const enrollment = await requireEnrollment(user, training_id)
  const admin = getAdminClient()
 
  const [{ data: t }, { data: modules }, { data: lessons }, { data: progress }, { data: assessments }, { data: attempts }] =
    await Promise.all([
      admin.from('trainings').select('id,title,sequential,certificate_enabled,total_duration_seconds').eq('id', training_id).single(),
      admin.from('course_modules').select('id,title,description,position,release_at').eq('training_id', training_id).eq('is_published', true).order('position'),
      admin.from('lessons').select('id,module_id,title,lesson_type,position,duration_seconds,is_preview,is_required,release_at').eq('training_id', training_id).eq('is_published', true).order('position'),
      admin.from('lesson_progress').select('lesson_id,status,last_position_seconds').eq('enrollment_id', enrollment.id),
      admin.from('assessments').select('id,module_id,title,assessment_type,pass_mark,max_attempts,time_limit_minutes,is_required').eq('training_id', training_id).eq('is_published', true).order('position'),
      admin.from('assessment_attempts').select('assessment_id,status,percentage,passed').eq('enrollment_id', enrollment.id),
    ])
 
  const modPos = new Map((modules ?? []).map((m) => [m.id, m.position]))
  const ordered = (lessons ?? []).filter((l) => modPos.has(l.module_id))
    .sort((a, b) => modPos.get(a.module_id)! - modPos.get(b.module_id)! || a.position - b.position)
  const prog = new Map((progress ?? []).map((p) => [p.lesson_id, p]))
  const done = new Set((progress ?? []).filter((p) => p.status === 'completed').map((p) => p.lesson_id))
  const locks = computeLocks(ordered, modules ?? [], done, t!.sequential)
 
  return jsonResponse({
    training: t,
    enrollment: { id: enrollment.id, status: enrollment.status, progress_percent: enrollment.progress_percent, expires_at: enrollment.expires_at },
    modules: (modules ?? []).map((m) => ({
      ...m,
      lessons: ordered.filter((l) => l.module_id === m.id).map((l) => ({
        ...l, locked: locks.get(l.id) ?? null,
        progress: prog.get(l.id) ?? null,
      })),
      assessments: (assessments ?? []).filter((a) => a.module_id === m.id),
    })),
    final_assessments: (assessments ?? []).filter((a) => !a.module_id),
    attempts: attempts ?? [],
  }, 200, req)
})