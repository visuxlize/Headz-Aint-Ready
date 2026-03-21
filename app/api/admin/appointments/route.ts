import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { appointments, barbers, services, users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { isoToNyDateAndTime } from '@/lib/appointments/time'

const createSchema = z.object({
  barberUserId: z.string().uuid(),
  serviceId: z.string().uuid(),
  clientName: z.string().min(1).max(200),
  clientPhone: z.string().max(50).optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  startAt: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  paymentMethod: z.enum(['cash', 'card']),
})

/** POST /api/admin/appointments */
export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  const [barberUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, data.barberUserId), eq(users.role, 'barber'), eq(users.isActive, true)))
    .limit(1)
  if (!barberUser) {
    return NextResponse.json({ error: 'Barber not found or inactive.' }, { status: 400 })
  }

  const [barberRow] = await db.select().from(barbers).where(eq(barbers.userId, data.barberUserId)).limit(1)
  if (!barberRow) {
    return NextResponse.json(
      { error: 'This barber is not linked to a profile yet; booking is unavailable.' },
      { status: 400 }
    )
  }

  const [svc] = await db.select().from(services).where(eq(services.id, data.serviceId)).limit(1)
  if (!svc?.isActive) {
    return NextResponse.json({ error: 'Invalid service.' }, { status: 400 })
  }

  const { date: appointmentDate, timeSlot } = isoToNyDateAndTime(data.startAt)

  const [appt] = await db
    .insert(appointments)
    .values({
      barberId: data.barberUserId,
      serviceId: data.serviceId,
      customerName: data.clientName,
      customerPhone: data.clientPhone || null,
      customerEmail: data.clientEmail || null,
      appointmentDate,
      timeSlot,
      isWalkIn: false,
      status: 'pending',
      noShowAcknowledged: true,
      notes: data.notes ?? null,
      paymentMethod: data.paymentMethod,
    })
    .returning()

  return NextResponse.json({ data: appt }, { status: 201 })
}
