import { addMinutes, format, isAfter, isSameDay, parse } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { SQUIRE } from '@/lib/squire-config'

export function generateTimeSlots(date: Date): string[] {
  const tz = SQUIRE.timezone
  const zonedNow = toZonedTime(new Date(), tz)
  const zonedDay = toZonedTime(date, tz)
  const dow = zonedDay.getDay()

  const { open, close } = dow === 0 ? SQUIRE.hours.sunday : SQUIRE.hours.weekday

  const base = new Date(zonedDay.getFullYear(), zonedDay.getMonth(), zonedDay.getDate())
  const openTime = parse(open, 'HH:mm', base)
  const closeTime = parse(close, 'HH:mm', base)

  const minBookable = addMinutes(zonedNow, SQUIRE.minAdvanceMinutes)

  const slots: string[] = []
  let cursor = openTime
  while (isAfter(closeTime, cursor)) {
    const isToday = isSameDay(zonedDay, zonedNow)
    const tooSoon = isToday && !isAfter(cursor, minBookable)
    if (!tooSoon) {
      slots.push(format(cursor, 'h:mm a'))
    }
    cursor = addMinutes(cursor, SQUIRE.bookingIntervalMinutes)
  }
  return slots
}

export function getMinBookableDate(): Date {
  return addMinutes(new Date(), SQUIRE.minAdvanceMinutes)
}

export function getMaxBookableDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + SQUIRE.maxAdvanceDays)
  return d
}
