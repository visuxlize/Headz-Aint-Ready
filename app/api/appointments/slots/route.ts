import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, barberAvailability, barberTimeOff } from '@/lib/db/schema'
import { and, eq, gte, lte } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().min(15).max(120),
})

const OPEN_HOUR = 9   // 9am EST – store open
const CLOSE_HOUR = 20 // 8pm EST – store close
const STORE_OPEN_MINUTES = OPEN_HOUR * 60
const STORE_CLOSE_MINUTES = CLOSE_HOUR * 60
const SLOT_MINUTES = 30

/** GET /api/appointments/slots?barberId=&date=&durationMinutes=
 * Returns available start times within store hours, respecting barber availability and time off.
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

    const dayOfWeek = new Date(date + 'T12:00:00').getDay() // 0=Sun .. 6=Sat

    const [timeOffRows, availabilityRows, existing] = await Promise.all([
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
        .from(barberAvailability)
        .where(
          and(
            eq(barberAvailability.barberId, barberId),
            eq(barberAvailability.dayOfWeek, dayOfWeek)
          )
        ),
      db
        .select({ startAt: appointments.startAt, endAt: appointments.endAt })
        .from(appointments)
        .where(
          and(
            eq(appointments.barberId, barberId),
            gte(appointments.startAt, new Date(`${date}T00:00:00-05:00`)),
            lte(appointments.startAt, new Date(`${date}T23:59:59-05:00`)),
            eq(appointments.status, 'confirmed')
          )
        ),
    ])

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
          start: Math.max(STORE_OPEN_MINUTES, r.startMinutes),
          end: Math.min(STORE_CLOSE_MINUTES, r.endMinutes),
        }))
        .filter((w) => w.end > w.start)
        .sort((a, b) => a.start - b.start)
      if (windows.length === 0) return NextResponse.json({ slots: [] })
    }

    const dayStart = new Date(`${date}T00:00:00-05:00`)
    const baseMs = dayStart.getTime()
    const slots: string[] = []

    for (const w of windows) {
      for (let minutes = w.start; minutes <= w.end - durationMinutes; minutes += SLOT_MINUTES) {
        const start = new Date(baseMs + minutes * 60 * 1000)
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
        const overlaps = existing.some(
          (a) => start < new Date(a.endAt) && end > new Date(a.startAt)
        )
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
