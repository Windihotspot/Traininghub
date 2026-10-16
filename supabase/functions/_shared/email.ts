// _shared/email.ts  -- Resend (https://resend.com). Swap the fetch for any provider.
// Env: RESEND_API_KEY, EMAIL_FROM (e.g. "TrainingHub <no-reply@yourdomain.com>")
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export const money = (amount: number | string, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(Number(amount))

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') ?? 'TrainingHub <no-reply@example.com>'
  if (!key) {
    console.log(`[email skipped - no RESEND_API_KEY] to=${opts.to} subject=${opts.subject}`)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    })
    if (!res.ok) console.error('email failed', res.status, await res.text())
  } catch (e) {
    console.error('email error', e)
  }
}

const wrap = (body: string) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">${body}
<p style="color:#6b7280;font-size:12px;margin-top:32px">Sent via TrainingHub</p></div>`

export const templates = {
  registrationCreated: (d: { name: string; training: string; reference: string; total: string; payUrl?: string | null }) => ({
    subject: `Registration received: ${d.training}`,
    html: wrap(`<h2>Hi ${esc(d.name)},</h2>
      <p>We received your registration <b>${esc(d.reference)}</b> for <b>${esc(d.training)}</b>.</p>
      <p>Amount due: <b>${esc(d.total)}</b></p>
      ${d.payUrl ? `<p><a href="${esc(d.payUrl)}">Complete payment</a></p>` : ''}`),
  }),
  paymentSuccessful: (d: { name: string; training: string; reference: string; total: string; dates: string }) => ({
    subject: `Payment confirmed: ${d.training}`,
    html: wrap(`<h2>Hi ${esc(d.name)},</h2>
      <p>Your payment of <b>${esc(d.total)}</b> was confirmed. Your place is secured.</p>
      <p><b>${esc(d.training)}</b><br/>${esc(d.dates)}<br/>Reference: ${esc(d.reference)}</p>`),
  }),
  paymentFailed: (d: { name: string; training: string; reference: string }) => ({
    subject: `Payment unsuccessful: ${d.training}`,
    html: wrap(`<h2>Hi ${esc(d.name)},</h2>
      <p>Your payment for <b>${esc(d.training)}</b> (${esc(d.reference)}) was not successful. You can retry from the registration page.</p>`),
  }),
  memberInvite: (d: { org: string; role: string; url: string }) => ({
    subject: `You've been added to ${d.org} on TrainingHub`,
    html: wrap(`<p>You now have the <b>${esc(d.role)}</b> role at <b>${esc(d.org)}</b>.</p><p><a href="${esc(d.url)}">Open TrainingHub</a></p>`),
  }),
}
