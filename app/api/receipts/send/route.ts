import { NextResponse } from 'next/server'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { sendPosReceiptEmail } from '@/lib/receipts/send-pos-receipt'
import { z } from 'zod'

const schema = z.object({
  to: z.string().email(),
  customerName: z.string().min(1),
  items: z.array(z.object({ name: z.string(), price: z.string() })),
  subtotal: z.number(),
  tip: z.number(),
  total: z.number(),
  barber: z.string().min(1),
  date: z.string().min(1),
  paymentMethod: z.string().min(1),
})

export async function POST(request: Request) {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await sendPosReceiptEmail({
      to: parsed.data.to,
      customerName: parsed.data.customerName,
      items: parsed.data.items,
      subtotal: parsed.data.subtotal,
      tip: parsed.data.tip,
      total: parsed.data.total,
      barberName: parsed.data.barber,
      date: parsed.data.date,
      paymentMethod: parsed.data.paymentMethod,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('receipt send', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to send receipt' },
      { status: 500 }
    )
  }
}
