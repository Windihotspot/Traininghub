// ===== learn-lesson/index.ts =====
// POST { lesson_id } -> lesson content + short-lived signed media URL
import { serveFn, readJson, HttpError, isUuid } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { requireEnrollment, computeLocks } from '../_shared/learner.ts'
 
serveFn(async (req) => {
  const user = await requireUser(req)
  const { lesson_id } = await readJson<any>(req)
  if (!isUuid(lesson_id)) throw new HttpError(400, 'lesson_id is required')
  const admin = getAdminClient()
 
  const { data: lesson } = await admin.from('lessons').select('*, media:media_assets(*)').eq('id', lesson_id).eq('is_published', true).maybeSingle()
  if (!lesson) throw new HttpError(404, 'Lesson not found')
 
  let resume = 0
  if (!lesson.is_preview) { // free previews skip enrolment (user must still be signed in)
    const enrollment = await requireEnrollment(user, lesson.training_id)
    const [{ data: t }, { data: modules }, { data: lessons }, { data: prog }] = await Promise.all([
      admin.from('trainings').select('sequential').eq('id', lesson.training_id).single(),
      admin.from('course_modules').select('id,position,release_at').eq('training_id', lesson.training_id).eq('is_published', true).order('position'),
      admin.from('lessons').select('id,module_id,position,is_required,release_at').eq('training_id', lesson.training_id).eq('is_published', true),
      admin.from('lesson_progress').select('lesson_id,status,last_position_seconds').eq('enrollment_id', enrollment.id),
    ])
    const mp = new Map((modules ?? []).map((m) => [m.id, m.position]))
    const ordered = (lessons ?? []).filter((l) => mp.has(l.module_id))
      .sort((a, b) => mp.get(a.module_id)! - mp.get(b.module_id)! || a.position - b.position)
    const done = new Set((prog ?? []).filter((p) => p.status === 'completed').map((p) => p.lesson_id))
    const reason = computeLocks(ordered, modules ?? [], done, t!.sequential).get(lesson.id)
    if (reason) throw new HttpError(403, `Lesson locked (${reason})`)
    resume = prog?.find((p) => p.lesson_id === lesson.id)?.last_position_seconds ?? 0
  }
 
  let playback: any = null
  const m = lesson.media
  if (m?.status === 'ready') {
    if (m.provider === 'storage' && m.storage_path) {
      const { data } = await admin.storage.from('course-media').createSignedUrl(m.storage_path, 60 * 60 * 2)
      const captions = await Promise.all((m.captions ?? []).map(async (c: any) => ({
        ...c, url: (await admin.storage.from('course-media').createSignedUrl(c.path, 7200)).data?.signedUrl })))
      playback = { type: m.kind, url: data?.signedUrl, mime_type: m.mime_type, captions }
    } else playback = { type: m.kind, provider: m.provider, external_id: m.external_id, url: m.external_url }
    // For stronger protection use signed/tokenised HLS from Mux/Bunny/Cloudflare Stream.
  }
  const { data: resources } = await admin.from('lesson_resources').select('id,title,media_asset_id').eq('lesson_id', lesson_id).order('position')
 
  delete lesson.media
  return jsonResponse({ lesson, playback, transcript: m?.transcript ?? null, resources: resources ?? [], resume_seconds: resume }, 200, req)
})