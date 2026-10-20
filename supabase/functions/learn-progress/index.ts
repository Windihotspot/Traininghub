// ===== learn-progress/index.ts =====
// POST { lesson_id, position_seconds, completed? } — call every ~15s while playing + on finish
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { requireEnrollment } from '../_shared/learner.ts'

serveFn(async (req) => {
  const user = await requireUser(req)
  const { lesson_id, position_seconds = 0, completed = false } = await readJson<any>(req)
  if (!isUuid(lesson_id)) throw new HttpError(400, 'lesson_id is required')
  const admin = getAdminClient()
  const { data: lesson } = await admin
    .from('lessons')
    .select('id,training_id,lesson_type,duration_seconds, media:media_assets(provider)')
    .eq('id', lesson_id)
    .eq('is_published', true)
    .maybeSingle()
  if (!lesson) throw new HttpError(404, 'Lesson not found')
  const e = await requireEnrollment(user, lesson.training_id)

  let finish = !!completed
  // Anti-skip: timed media must be watched/listened to ~90%
  if (
    finish &&
    ['video', 'audio'].includes(lesson.lesson_type) &&
    lesson.media?.provider === 'storage' &&
    lesson.duration_seconds > 0 &&
    position_seconds < lesson.duration_seconds * 0.9
  )
    finish = false

  const { data: existing } = await admin
    .from('lesson_progress')
    .select('status')
    .eq('enrollment_id', e.id)
    .eq('lesson_id', lesson_id)
    .maybeSingle()
  const status = existing?.status === 'completed' || finish ? 'completed' : 'in_progress'
  const { error } = await admin.from('lesson_progress').upsert(
    {
      enrollment_id: e.id,
      lesson_id,
      status,
      last_position_seconds: Math.max(0, Math.floor(position_seconds)),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'enrollment_id,lesson_id' }
  )
  if (error) throw error

  await admin.rpc('recalc_enrollment_progress', { p_enrollment: e.id })
  const { data: course_completed } = await admin.rpc('try_complete_enrollment', {
    p_enrollment: e.id
  })
  return jsonResponse({ status, course_completed: !!course_completed }, 200, req)
})
