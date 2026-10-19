// ===== _shared/learner.ts =====
import { getAdminClient } from './supabaseAdmin.ts'
import { HttpError } from './handler.ts'
 
/** Learner access: derived from the user's participant record, never from the request. */
export async function requireEnrollment(user: { id: string; email?: string }, trainingId: string) {
  const admin = getAdminClient()
  // Claim participant rows created at registration time (email is citext)
  if (user.email) {
    await admin.from('participants').update({ user_id: user.id })
      .eq('email', user.email).is('user_id', null)
  }
  const { data: parts } = await admin.from('participants').select('id').eq('user_id', user.id)
  const ids = (parts ?? []).map((p) => p.id)
  if (!ids.length) throw new HttpError(403, 'Not enrolled')
  const { data: e } = await admin.from('enrollments').select('*')
    .eq('training_id', trainingId).in('participant_id', ids).maybeSingle()
  if (!e || e.status === 'revoked') throw new HttpError(403, 'Not enrolled')
  if (e.expires_at && new Date(e.expires_at) < new Date()) throw new HttpError(403, 'Access expired')
  return e
}
 
/** Which lessons are locked for this learner (drip dates + sequential mode). */
export function computeLocks(lessons: any[], modules: any[], done: Set<string>, sequential: boolean) {
  const now = Date.now()
  const modRelease = new Map(modules.map((m) => [m.id, m.release_at]))
  const locked = new Map<string, string>()
  let blocked = false
  for (const l of lessons) { // lessons must be ordered by module position, then lesson position
    const rel = l.release_at ?? modRelease.get(l.module_id)
    if (rel && new Date(rel).getTime() > now) locked.set(l.id, 'scheduled')
    else if (sequential && blocked) locked.set(l.id, 'sequential')
    if (sequential && l.is_required && !done.has(l.id)) blocked = true
  }
  return locked
}