// _shared/notifications.ts
import { getAdminClient } from './supabaseAdmin.ts'
import { sendEmail, templates, money } from './email.ts'

export async function notifyPaymentSuccess(registrationId: string) {
  const admin = getAdminClient()
  const { data: reg } = await admin
    .from('registrations')
    .select('reference, contact_name, contact_email, total_amount, currency, trainings(title, start_date, end_date)')
    .eq('id', registrationId).single()
  if (!reg) return
  const t = (reg as any).trainings
  const dates = t?.start_date
    ? (t.end_date && t.end_date !== t.start_date ? `${t.start_date} to ${t.end_date}` : t.start_date)
    : ''
  const mail = templates.paymentSuccessful({
    name: reg.contact_name, training: t?.title ?? 'your training', reference: reg.reference,
    total: money(reg.total_amount, reg.currency), dates,
  })
  await sendEmail({ to: reg.contact_email as string, ...mail })
}

export async function notifyPaymentFailed(registrationId: string) {
  const admin = getAdminClient()
  const { data: reg } = await admin
    .from('registrations')
    .select('reference, contact_name, contact_email, trainings(title)')
    .eq('id', registrationId).single()
  if (!reg) return
  const mail = templates.paymentFailed({
    name: reg.contact_name, training: (reg as any).trainings?.title ?? 'your training', reference: reg.reference,
  })
  await sendEmail({ to: reg.contact_email as string, ...mail })
}
