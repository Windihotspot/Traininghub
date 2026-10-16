// _shared/audit.ts
import { getAdminClient } from './supabaseAdmin.ts'

export interface AuditEntry {
  organisation_id?: string | null
  actor_id?: string | null
  actor_email?: string | null
  action: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry, req?: Request) {
  try {
    await getAdminClient().from('audit_logs').insert({
      ...entry,
      metadata: entry.metadata ?? {},
      ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    })
  } catch (e) {
    console.error('audit log failed', e) // never break the request because of auditing
  }
}
