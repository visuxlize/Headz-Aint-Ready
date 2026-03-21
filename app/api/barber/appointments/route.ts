import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { appointments, services } from '@/lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { isoToNyDateAndTime } from '@/lib/appointments/time'

const createSchema = z.object({
  serviceId: z.string().uuid(),
  clientName: z.string().min(1).max(200),
  startAt: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  paymentMethod: z.enum(['cash', 'card']),
})

/**
 * GET /api/barber/appointments?date=YYYY-MM-DD
 * Mirrors `barber_appointments_view` (no customer_phone / customer_email).
 * We query `appointments` + `services` explicitly because the DB view uses auth.uid(),
 * which is unset on the server postgres connection.
 */
export async function GET(request: Request) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
  }

  const rows = await db
    .select({
      id: appointments.id,
      barberId: appointments.barberId,
      serviceId: appointments.serviceId,
      customerName: appointments.customerName,
      appointmentDate: appointments.appointmentDate,
      timeSlot: appointments.timeSlot,
      status: appointments.status,
      checkedOff: appointments.checkedOff,
      noShowFee: appointments.noShowFee,
      createdAt: appointments.createdAt,
      serviceName: services.name,
      durationMinutes: services.durationMinutes,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(and(eq(appointments.barberId, auth.user.id), eq(appointments.appointmentDate, date)))
    .orderBy(asc(appointments.timeSlot))

  return NextResponse.json({ data: rows })
}

/** POST /api/barber/appointments — create for self */
export async function POST(request: Request) {
  const auth = await requireBarberApi()
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

  const [svc] = await db.select().from(services).where(eq(services.id, data.serviceId)).limit(1)
  if (!svc?.isActive) {
    return NextResponse.json({ error: 'Invalid service.' }, { status: 400 })
  }

  const { date: appointmentDate, timeSlot } = isoToNyDateAndTime(data.startAt)

  const [appt] = await db
    .insert(appointments)
    .values({
      barberId: auth.user.id,
      serviceId: data.serviceId,
      customerName: data.clientName,
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
