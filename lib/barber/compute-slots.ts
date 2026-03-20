import { db } from '@/lib/db'
import { appointments, availability, barberTimeOff, services } from '@/lib/db/schema'
import { and, eq, gte, lte, ne } from 'drizzle-orm'
import { appointmentEndUtc, appointmentStartUtc, pgTimeToMinutes } from '@/lib/appointments/time'
import { getStoreWindowForDay } from '@/lib/barber/store-hours'

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

  if (timeOffRows.length > 0) return []

  const serviceDuration = new Map(serviceRows.map((s) => [s.id, s.durationMinutes]))

  type Window = { start: number; end: number }
  let windows: Window[]
  if (availabilityRows.length === 0) {
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
  return slots
}
