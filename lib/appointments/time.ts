import { format } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export const STORE_TZ = 'America/New_York'

/** Persisted ISO instant → NY calendar date + time-of-day for `date` + `time_slot` columns */
export function isoToNyDateAndTime(iso: string): { date: string; timeSlot: string } {
  const d = new Date(iso)
  const z = toZonedTime(d, STORE_TZ)
  return {
    date: format(z, 'yyyy-MM-dd'),
    timeSlot: format(z, 'HH:mm:ss'),
  }
}

/** NY wall-clock date + time → UTC instant */
export function nyDateAndTimeToUtc(dateStr: string, timeSlot: string): Date {
  const t = normalizeTimeSlot(timeSlot)
  return fromZonedTime(`${dateStr} ${t}`, STORE_TZ)
}

export function normalizeTimeSlot(timeSlot: unknown): string {
  if (typeof timeSlot === 'string') {
    const s = timeSlot.trim()
    if (s.length >= 8) return s.slice(0, 8)
    const parts = s.split(':')
    if (parts.length >= 2) {
      const h = parts[0]?.padStart(2, '0') ?? '00'
      const m = parts[1]?.padStart(2, '0') ?? '00'
      const sec = (parts[2] ?? '00').padStart(2, '0')
      return `${h}:${m}:${sec.slice(0, 2)}`
    }
    return '09:00:00'
  }
  return '09:00:00'
}

export function appointmentStartUtc(appointment: {
  appointmentDate: string
  timeSlot: unknown
}): Date {
  return nyDateAndTimeToUtc(appointment.appointmentDate, normalizeTimeSlot(appointment.timeSlot))
}

export function appointmentEndUtc(
  appointment: { appointmentDate: string; timeSlot: unknown },
  durationMinutes: number
): Date {
  const start = appointmentStartUtc(appointment)
  return new Date(start.getTime() + durationMinutes * 60 * 1000)
}

/** Postgres `time` / string → minutes from midnight */
export function pgTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

export function minutesToPgTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

/** Today's calendar date in store timezone (for comparing `date` columns). */
export function nyTodayDateString(): string {
  return format(toZonedTime(new Date(), STORE_TZ), 'yyyy-MM-dd')
}
