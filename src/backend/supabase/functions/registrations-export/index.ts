// GET /functions/v1/registrations-export?organisation_id=...&training_id=&payment_status=&registration_status=&company=&from=&to=
// Returns a CSV (one row per participant). Excel opens CSV natively; for real .xlsx
// build it client-side with SheetJS from /rest data if you prefer.
import { serveFn, HttpError, isUuid } from '../_shared/handler.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { requireUser, requireOrgPermission } from '../_shared/auth.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
import { logAudit } from '../_shared/audit.ts'

const csvCell = (v: unknown) => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s            // block CSV/Excel formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

serveFn(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed')
  const user = await requireUser(req)
  const q = new URL(req.url).searchParams
  const orgId = q.get('organisation_id')
  if (!isUuid(orgId)) throw new HttpError(400, 'organisation_id is required')
  await requireOrgPermission(user.id, orgId, 'registration.export')

  let query = getAdminClient().from('registration_participants').select(`
      attended,
      participants(first_name,last_name,email,phone,job_title,company_name),
      registrations!inner(reference,registration_type,company_name,status,total_amount,currency,created_at,training_id,
        trainings!inner(title,start_date,end_date),
        payments(status,reference,paid_at))`)
    .eq('organisation_id', orgId)
    .limit(10000)

  if (isUuid(q.get('training_id'))) query = query.eq('registrations.training_id', q.get('training_id')!)
  if (q.get('registration_status')) query = query.eq('registrations.status', q.get('registration_status')!)
  if (q.get('company')) query = query.ilike('registrations.company_name', `%${q.get('company')}%`)
  if (q.get('from')) query = query.gte('registrations.created_at', q.get('from')!)
  if (q.get('to')) query = query.lte('registrations.created_at', q.get('to')!)

  const { data, error } = await query
  if (error) throw error

  const payFilter = q.get('payment_status')
  const rows = (data ?? []).filter((r: any) => {
    if (!payFilter) return true
    const pays = r.registrations?.payments ?? []
    return pays.some((p: any) => p.status === payFilter)
  })

  const header = ['Registration', 'Training', 'Start', 'End', 'First name', 'Last name', 'Email', 'Phone',
    'Job title', 'Company', 'Type', 'Registration status', 'Payment status', 'Amount (registration total)',
    'Currency', 'Paid at', 'Registered at', 'Attended']
  const lines = [header.map(csvCell).join(',')]
  for (const r of rows as any[]) {
    const reg = r.registrations, p = r.participants
    const pay = (reg.payments ?? []).find((x: any) => x.status === 'paid') ?? reg.payments?.[0]
    lines.push([
      reg.reference, reg.trainings?.title, reg.trainings?.start_date, reg.trainings?.end_date,
      p?.first_name, p?.last_name, p?.email, p?.phone, p?.job_title, p?.company_name ?? reg.company_name,
      reg.registration_type, reg.status, pay?.status, reg.total_amount, reg.currency, pay?.paid_at,
      reg.created_at, r.attended ? 'yes' : 'no',
    ].map(csvCell).join(','))
  }

  await logAudit({ organisation_id: orgId, actor_id: user.id, actor_email: user.email,
    action: 'REGISTRATIONS_EXPORTED', resource_type: 'registration', metadata: { rows: rows.length, filters: Object.fromEntries(q) } }, req)

  return new Response('\uFEFF' + lines.join('\n'), {
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
})
