import { Resend } from 'resend'

type LineItem = { name: string; price: string }

export async function sendPosReceiptEmail(opts: {
  to: string
  customerName: string
  items: LineItem[]
  subtotal: number
  tip: number
  total: number
  barberName: string
  date: string
  paymentMethod: string
}) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'Headz <onboarding@resend.dev>'
  if (!key) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const resend = new Resend(key)
  const rows = opts.items.map((i) => `<tr><td>${escapeHtml(i.name)}</td><td style="text-align:right">$${Number.parseFloat(i.price).toFixed(2)}</td></tr>`).join('')

  const html = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h1 style="color:#b91c1c;font-size:20px">Headz Ain&apos;t Ready</h1>
  <p>Thanks, <strong>${escapeHtml(opts.customerName)}</strong>!</p>
  <p style="color:#666;font-size:14px">${escapeHtml(opts.date)} · ${escapeHtml(opts.barberName)} · ${escapeHtml(opts.paymentMethod)}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${rows}
    <tr><td colspan="2"><hr style="border:none;border-top:1px solid #eee" /></td></tr>
    <tr><td>Subtotal</td><td style="text-align:right">$${opts.subtotal.toFixed(2)}</td></tr>
    <tr><td>Tip</td><td style="text-align:right">$${opts.tip.toFixed(2)}</td></tr>
    <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>$${opts.total.toFixed(2)}</strong></td></tr>
  </table>
  <p style="font-size:12px;color:#888">Jackson Heights · Questions? Reply to this email.</p>
</body></html>`

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `Receipt — Headz Ain't Ready ($${opts.total.toFixed(2)})`,
    html,
  })
  if (error) throw new Error(error.message)
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
