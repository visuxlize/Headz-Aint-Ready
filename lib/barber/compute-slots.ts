import { db } from '@/lib/db'
import {
  appointments,
  availability,
  barberDayModes,
  barberTimeOff,
  blockedTimes,
  services,
  type BlockedTime,
} from '@/lib/db/schema'
import { and, eq, gte, lte, ne } from 'drizzle-orm'
import { appointmentEndUtc, appointmentStartUtc, pgTimeToMinutes } from '@/lib/appointments/time'
import { getStoreWindowForDay } from '@/lib/barber/store-hours'
import { getEffectiveDayMode } from '@/lib/barber/resolve-effective-mode'

const SLOT_MINUTES = 30

export async function computeBarberSlotIsoStrings(params: {
  barberProfileId: string
  barberUserId: string
  date: string
  durationMinutes: number
  excludeAppointmentId?: string | null
}): Promise<string[]> {
  const { barberProfileId, barberUserId, date, durationMinutes, excludeAppointmentId } = params
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

  const store = await getStoreWindowForDay(dayOfWeek)
  if (!store.isOpen) return []

  const storeOpenMin = store.openMin
  const storeCloseMin = store.closeMin

  const apptConditions = [
    eq(appointments.barberId, barberUserId),
    eq(appointments.appointmentDate, date),
    eq(appointments.status, 'pending'),
  ]
  if (excludeAppointmentId) {
    apptConditions.push(ne(appointments.id, excludeAppointmentId))
  }

  let blockedRows: BlockedTime[] = []
  try {
    blockedRows = await db
      .select()
      .from(blockedTimes)
      .where(and(eq(blockedTimes.barberId, barberUserId), eq(blockedTimes.date, date)))
  } catch (e) {
    console.error('blocked_times read failed (slots):', e)
  }

  const [timeOffRows, availabilityRows, existingAppts, serviceRows] = await Promise.all([
    db
      .select()
      .from(barberTimeOff)
      .where(
        and(
          eq(barberTimeOff.barberId, barberProfileId),
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
    db.select().from(appointments).where(and(...apptConditions)),
    db.select().from(services),
  ])

  let modeRows: { mode: string }[] = []
  try {
    modeRows = await db
      .select()
      .from(barberDayModes)
      .where(and(eq(barberDayModes.barberId, barberUserId), eq(barberDayModes.dayOfWeek, dayOfWeek)))
  } catch {
    /* table may not exist until migration */
  }

  if (timeOffRows.length > 0) return []

  const serviceDuration = new Map(serviceRows.map((s) => [s.id, s.durationMinutes]))

  const effective = getEffectiveDayMode(modeRows[0], availabilityRows.length)
  if (effective === 'unavailable') return []

  type Window = { start: number; end: number }
  let windows: Window[]
  if (effective === 'open') {
    windows = [{ start: storeOpenMin, end: storeCloseMin }]
  } else {
    windows = availabilityRows
      .map((r) => ({
        start: Math.max(storeOpenMin, pgTimeToMinutes(String(r.startTime))),
        end: Math.min(storeCloseMin, pgTimeToMinutes(String(r.endTime))),
      }))
      .filter((w) => w.end > w.start)
      .sort((a, b) => a.start - b.start)
    if (windows.length === 0) return []
  }

  const dayStart = new Date(`${date}T00:00:00-05:00`)
  const baseMs = dayStart.getTime()
  const slots: string[] = []

  const existingBounds = [
    ...existingAppts.map((a) => {
      const dur = serviceDuration.get(a.serviceId) ?? durationMinutes
      return {
        start: appointmentStartUtc(a).getTime(),
        end: appointmentEndUtc(a, dur).getTime(),
      }
    }),
    ...blockedRows.map((b) => ({
      start: appointmentStartUtc({
        appointmentDate: b.date,
        timeSlot: String(b.startTime),
      }).getTime(),
      end: appointmentStartUtc({
        appointmentDate: b.date,
        timeSlot: String(b.endTime),
      }).getTime(),
    })),
  ]

  for (const w of windows) {
    for (let minutes = w.start; minutes <= w.end - durationMinutes; minutes += SLOT_MINUTES) {
      const start = new Date(baseMs + minutes * 60 * 1000)
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
      const overlaps = existingBounds.some((b) => start.getTime() < b.end && end.getTime() > b.start)
      if (!overlaps) slots.push(start.toISOString())
    }
  }

  slots.sort()
  return slots
}
