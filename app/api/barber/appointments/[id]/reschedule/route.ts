import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, barbers, services } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { isoToNyDateAndTime } from '@/lib/appointments/time'
import { computeBarberSlotIsoStrings } from '@/lib/barber/compute-slots'

const bodySchema = z.object({
  startAt: z.string().datetime(),
})

/** PATCH — reschedule to a new slot (validated against availability + store hours + no overlap) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const [existing] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.barberId, auth.user.id)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const [service] = await db.select().from(services).where(eq(services.id, existing.serviceId)).limit(1)
  const durationMinutes = service?.durationMinutes ?? 30

  const [profile] = await db.select().from(barbers).where(eq(barbers.userId, auth.user.id)).limit(1)
  if (!profile) {
    return NextResponse.json({ error: 'Barber profile not linked' }, { status: 400 })
  }

  const { date: newDate, timeSlot } = isoToNyDateAndTime(parsed.data.startAt)

  const slots = await computeBarberSlotIsoStrings({
    barberProfileId: profile.id,
    barberUserId: auth.user.id,
    date: newDate,
    durationMinutes,
    excludeAppointmentId: id,
  })

  const wantMs = new Date(parsed.data.startAt).getTime()
  const allowed = slots.some((s) => Math.abs(new Date(s).getTime() - wantMs) < 2000)
  if (!allowed) {
    return NextResponse.json({ error: 'That time is not available.' }, { status: 400 })
  }

  const [updated] = await db
    .update(appointments)
    .set({
      appointmentDate: newDate,
      timeSlot,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id))
    .returning()

  return NextResponse.json({ data: updated })
}
