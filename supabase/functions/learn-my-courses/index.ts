// ===== learn-my-courses/index.ts =====
import { serveFn } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
 
serveFn(async (req) => {
  const user = await requireUser(req)
  const admin = getAdminClient()
  if (user.email) await admin.from('participants').update({ user_id: user.id }).eq('email', user.email).is('user_id', null)
  const { data: parts } = await admin.from('participants').select('id').eq('user_id', user.id)
  const ids = (parts ?? []).map((p) => p.id)
  if (!ids.length) return jsonResponse({ courses: [] }, 200, req)
  const { data } = await admin.from('enrollments')
    .select('id, training_id, status, progress_percent, trainings!inner(title, cover_image, format)')
    .in('participant_id', ids).neq('status', 'revoked').order('enrolled_at', { ascending: false })
  const courses = (data ?? []).filter((e: any) => e.trainings.format !== 'live').map((e: any) => ({
    enrollment_id: e.id, training_id: e.training_id, status: e.status, progress_percent: e.progress_percent,
    title: e.trainings.title, cover_image: e.trainings.cover_image,
  }))
  return jsonResponse({ courses }, 200, req)
})