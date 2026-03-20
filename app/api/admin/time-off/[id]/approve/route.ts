import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, barbers, services, timeOffRequests, barberTimeOff, users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'
import { appointmentEndUtc, appointmentStartUtc } from '@/lib/appointments/time'
import { hasOverlappingAppointment } from '@/lib/appointments/appointment-overlap'

const bodySchema = z.object({
  conflictResolution: z.enum(['keep', 'cancel_all', 'reassign']).optional(),
  reassignments: z.record(z.string().uuid(), z.string().uuid()).optional(),
})

async function loadConflicts(barberUserId: string, requestedDate: string) {
  return db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      timeSlot: appointments.timeSlot,
      customerName: appointments.customerName,
      serviceName: services.name,
      serviceId: appointments.serviceId,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.barberId, barberUserId),
        eq(appointments.appointmentDate, requestedDate),
        eq(appointments.status, 'pending')
      )
    )
}

async function ensureBarberTimeOffBlock(barberProfileId: string, dateStr: string) {
  const [existing] = await db
    .select({ id: barberTimeOff.id })
    .from(barberTimeOff)
    .where(
      and(
        eq(barberTimeOff.barberId, barberProfileId),
        eq(barberTimeOff.startDate, dateStr),
        eq(barberTimeOff.endDate, dateStr)
      )
    )
    .limit(1)

  if (existing) return

  await db.insert(barberTimeOff).values({
    barberId: barberProfileId,
    startDate: dateStr,
    endDate: dateStr,
    type: 'time_off',
    notes: 'Approved time off request',
  })
}

/** POST — approve time off request */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: unknown = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const { conflictResolution, reassignments } = parsed.data

  const [reqRow] = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id)).limit(1)
  if (!reqRow) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  if (reqRow.status !== 'pending') {
    return NextResponse.json({ error: 'Request is not pending' }, { status: 400 })
  }

  const [profile] = await db.select().from(barbers).where(eq(barbers.userId, reqRow.barberId)).limit(1)
  if (!profile) {
    return NextResponse.json({ error: 'Barber profile missing for this user' }, { status: 400 })
  }

  const conflicts = await loadConflicts(reqRow.barberId, reqRow.requestedDate)

  if (conflicts.length > 0 && !conflictResolution) {
    return NextResponse.json(
      {
        error: 'conflicts',
        conflicts,
        message: 'This barber has pending appointments on that date. Choose how to proceed.',
      },
      { status: 409 }
    )
  }

  if (conflicts.length > 0 && conflictResolution) {
    if (conflictResolution === 'keep') {
      // no appointment changes
    } else if (conflictResolution === 'cancel_all') {
      const now = new Date()
      for (const c of conflicts) {
        await db
          .update(appointments)
          .set({ status: 'cancelled', updatedAt: now })
          .where(eq(appointments.id, c.id))
      }
    } else if (conflictResolution === 'reassign') {
      if (!reassignments || Object.keys(reassignments).length !== conflicts.length) {
        return NextResponse.json(
          { error: 'Provide reassignments for each conflicting appointment' },
          { status: 400 }
        )
      }
      for (const c of conflicts) {
        const newProfileId = reassignments[c.id]
        if (!newProfileId) {
          return NextResponse.json({ error: `Missing reassignment for appointment ${c.id}` }, { status: 400 })
        }
        if (newProfileId === profile.id) {
          return NextResponse.json({ error: 'Pick a different barber than the requester' }, { status: 400 })
        }
        const [newBarber] = await db.select().from(barbers).where(eq(barbers.id, newProfileId)).limit(1)
        if (!newBarber?.userId) {
          return NextResponse.json({ error: 'Target barber has no linked account' }, { status: 400 })
        }
        const [u] = await db.select().from(users).where(eq(users.id, newBarber.userId)).limit(1)
        if (!u?.isActive) {
          return NextResponse.json({ error: 'Target barber is inactive' }, { status: 400 })
        }

        const [svc] = await db.select().from(services).where(eq(services.id, c.serviceId)).limit(1)
        const dur = svc?.durationMinutes ?? 30
        const startMs = appointmentStartUtc({
          appointmentDate: c.appointmentDate,
          timeSlot: c.timeSlot,
        }).getTime()
        const endMs = appointmentEndUtc(
          { appointmentDate: c.appointmentDate, timeSlot: c.timeSlot },
          dur
        ).getTime()

        const overlap = await hasOverlappingAppointment(db, {
          barberUserId: newBarber.userId,
          appointmentDate: c.appointmentDate,
          startMs,
          endMs,
          excludeAppointmentId: c.id,
        })
        if (overlap) {
          return NextResponse.json(
            {
              error: `Target barber already has an overlapping booking at ${c.timeSlot?.slice(0, 5) ?? ''}`,
            },
            { status: 400 }
          )
        }

        await db
          .update(appointments)
          .set({ barberId: newBarber.userId, updatedAt: new Date() })
          .where(eq(appointments.id, c.id))
      }
    }
  }

  const now = new Date()
  await db
    .update(timeOffRequests)
    .set({
      status: 'approved',
      reviewedBy: auth.user.id,
      reviewedAt: now,
      denialReason: null,
    })
    .where(eq(timeOffRequests.id, id))

  await ensureBarberTimeOffBlock(profile.id, reqRow.requestedDate)

  const [updated] = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id)).limit(1)

  return NextResponse.json({ data: updated })
}
