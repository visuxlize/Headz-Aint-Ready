import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, barbers, posTransactions } from '@/lib/db/schema'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { sendPosReceiptEmail } from '@/lib/receipts/send-pos-receipt'
import { getTodayStoreDate } from '@/lib/pos/store-date'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const itemSchema = z.object({
  serviceId: z.string().uuid(),
  name: z.string(),
  price: z.string(),
})

const bodySchema = z.object({
  mode: z.enum(['appointment', 'walk_in']),
  appointmentId: z.string().uuid().optional(),
  customerName: z.string().min(1),
  barberId: z.string().uuid(),
  items: z.array(itemSchema).min(1),
  subtotal: z.number(),
  tip: z.number().min(0),
  total: z.number(),
  paymentMethod: z.enum(['cash', 'card']),
  stripeChargeId: z.string().optional(),
  receiptEmail: z.string().email().optional(),
})

export async function POST(request: Request) {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const tipStr = d.tip.toFixed(2)
  const subStr = d.subtotal.toFixed(2)
  const totalStr = d.total.toFixed(2)
  const today = getTodayStoreDate()

  const [barberRow] = await db.select({ name: barbers.name }).from(barbers).where(eq(barbers.userId, d.barberId)).limit(1)
  const barberName = barberRow?.name ?? 'Staff'

  let receiptSentAt: Date | null = null
  if (d.receiptEmail && process.env.RESEND_API_KEY) {
    try {
      await sendPosReceiptEmail({
        to: d.receiptEmail,
        customerName: d.customerName,
        items: d.items.map((i) => ({ name: i.name, price: i.price })),
        subtotal: d.subtotal,
        tip: d.tip,
        total: d.total,
        barberName,
        date: today,
        paymentMethod: d.paymentMethod,
      })
      receiptSentAt = new Date()
    } catch (e) {
      console.error('POS receipt email failed', e)
    }
  }

  try {
    if (d.mode === 'appointment') {
      if (!d.appointmentId) {
        return NextResponse.json({ error: 'appointmentId required for appointment mode' }, { status: 400 })
      }
      const [row] = await db.select().from(appointments).where(eq(appointments.id, d.appointmentId)).limit(1)
      if (!row) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
      }
      if (row.appointmentDate !== today) {
        return NextResponse.json({ error: 'Appointment is not for today' }, { status: 400 })
      }

      await db
        .update(appointments)
        .set({
          status: 'completed',
          checkedOff: true,
          tipAmount: tipStr,
          paymentMethod: d.paymentMethod,
          paymentStatus: 'paid',
          receiptSentAt,
          stripeChargeId: d.stripeChargeId ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(appointments.id, d.appointmentId), eq(appointments.status, 'pending')))

      return NextResponse.json({ ok: true, mode: 'appointment' })
    }

    const firstServiceId = d.items[0]?.serviceId
    await db.insert(posTransactions).values({
      customerName: d.customerName,
      barberId: d.barberId,
      serviceId: firstServiceId,
      items: d.items,
      subtotal: subStr,
      tipAmount: tipStr,
      total: totalStr,
      paymentMethod: d.paymentMethod,
      paymentStatus: 'paid',
      stripeChargeId: d.stripeChargeId ?? null,
      receiptSentAt,
    })

    return NextResponse.json({ ok: true, mode: 'walk_in' })
  } catch (e) {
    console.error('pos/complete', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to record transaction' },
      { status: 500 }
    )
  }
}
