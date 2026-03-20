import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, availability, barberTimeOff, barbers, services, users } from '@/lib/db/schema'
import { and, eq, gte, lte } from 'drizzle-orm'
import { z } from 'zod'
import { appointmentEndUtc, appointmentStartUtc, pgTimeToMinutes } from '@/lib/appointments/time'

const querySchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().min(15).max(120),
})

const OPEN_HOUR = 9
const CLOSE_HOUR = 20
const STORE_OPEN_MINUTES = OPEN_HOUR * 60
const STORE_CLOSE_MINUTES = CLOSE_HOUR * 60
const SLOT_MINUTES = 30

/** GET /api/appointments/slots?barberId=&date=&durationMinutes=
 * barberId is the barbers table id (public profile).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      barberId: searchParams.get('barberId'),
      date: searchParams.get('date'),
      durationMinutes: searchParams.get('durationMinutes'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 })
    }
    const { barberId, date, durationMinutes } = parsed.data

    const [barberRow] = await db.select().from(barbers).where(eq(barbers.id, barberId)).limit(1)
    if (!barberRow?.userId) {
      return NextResponse.json({ slots: [] })
    }
    const [barberUser] = await db.select().from(users).where(eq(users.id, barberRow.userId)).limit(1)
    if (!barberUser?.isActive) {
      return NextResponse.json({ slots: [] })
    }
    const barberUserId = barberRow.userId

    const dayOfWeek = new Date(date + 'T12:00:00').getDay()

    const [timeOffRows, availabilityRows, existingAppts, serviceRows] = await Promise.all([
      db
        .select()
        .from(barberTimeOff)
        .where(
          and(
            eq(barberTimeOff.barberId, barberId),
            lte(barberTimeOff.startDate, date),
            gte(barberTimeOff.endDate, date)
          )
        ),
      db
        .select()
        .from(availability)
        .where(
          and(
            eq(availability.barberId, barberUserId),
            eq(availability.dayOfWeek, dayOfWeek),
            eq(availability.isActive, true)
          )
        ),
      db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.barberId, barberUserId),
            eq(appointments.appointmentDate, date),
            eq(appointments.status, 'pending')
          )
        ),
      db.select().from(services),
    ])

    const serviceDuration = new Map(serviceRows.map((s) => [s.id, s.durationMinutes]))

    if (timeOffRows.length > 0) {
      return NextResponse.json({ slots: [] })
    }

    type Window = { start: number; end: number }
    let windows: Window[]
    if (availabilityRows.length === 0) {
      windows = [{ start: STORE_OPEN_MINUTES, end: STORE_CLOSE_MINUTES }]
    } else {
      windows = availabilityRows
        .map((r) => ({
          start: Math.max(STORE_OPEN_MINUTES, pgTimeToMinutes(String(r.startTime))),
          end: Math.min(STORE_CLOSE_MINUTES, pgTimeToMinutes(String(r.endTime))),
        }))
        .filter((w) => w.end > w.start)
        .sort((a, b) => a.start - b.start)
      if (windows.length === 0) return NextResponse.json({ slots: [] })
    }

    const dayStart = new Date(`${date}T00:00:00-05:00`)
    const baseMs = dayStart.getTime()
    const slots: string[] = []

    const existingBounds = existingAppts.map((a) => {
      const dur = serviceDuration.get(a.serviceId) ?? durationMinutes
      return {
        start: appointmentStartUtc(a).getTime(),
        end: appointmentEndUtc(a, dur).getTime(),
      }
    })

    for (const w of windows) {
      for (let minutes = w.start; minutes <= w.end - durationMinutes; minutes += SLOT_MINUTES) {
        const start = new Date(baseMs + minutes * 60 * 1000)
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
        const overlaps = existingBounds.some((b) => start.getTime() < b.end && end.getTime() > b.start)
        if (!overlaps) slots.push(start.toISOString())
      }
    }

    slots.sort()
    return NextResponse.json({ slots })
  } catch (e) {
    console.error('GET /api/appointments/slots', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
