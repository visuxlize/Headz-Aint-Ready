import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { appointments, posTransactions } from '@/lib/db/schema'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { getTodayStoreDate } from '@/lib/pos/store-date'

const itemSchema = z.object({
  serviceId: z.string().uuid(),
  name: z.string(),
  price: z.string(),
})

const bodySchema = z.object({
  barberId: z.string().uuid(),
  customerName: z.string().min(1),
  appointmentId: z.string().uuid().optional(),
  items: z.array(itemSchema).min(1),
  subtotal: z.number(),
  tipAmount: z.number().min(0),
  total: z.number(),
  paymentMethod: z.enum(['card', 'cash']),
})

/** POST — create a pending POS row before Square Terminal checkout or cash recording */
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
  const today = getTodayStoreDate()
  const subStr = d.subtotal.toFixed(2)
  const tipStr = d.tipAmount.toFixed(2)
  const totalStr = d.total.toFixed(2)
  const firstServiceId = d.items[0]?.serviceId

  if (d.appointmentId) {
    const [row] = await db.select().from(appointments).where(eq(appointments.id, d.appointmentId)).limit(1)
    if (!row) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    if (row.appointmentDate !== today) {
      return NextResponse.json({ error: 'Appointment is not for today' }, { status: 400 })
    }
    if (row.barberId !== d.barberId) {
      return NextResponse.json({ error: 'Barber does not match appointment' }, { status: 400 })
    }
  }

  try {
    const [inserted] = await db
      .insert(posTransactions)
      .values({
        customerName: d.customerName,
        barberId: d.barberId,
        appointmentId: d.appointmentId ?? null,
        serviceId: firstServiceId ?? null,
        items: d.items,
        subtotal: subStr,
        tipAmount: tipStr,
        total: totalStr,
        paymentMethod: d.paymentMethod,
        paymentStatus: 'pending',
      })
      .returning({ id: posTransactions.id })

    if (!inserted) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ id: inserted.id })
  } catch (e) {
    console.error('pos/create-transaction', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
