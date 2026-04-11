import { startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export const NY_TZ = 'America/New_York'

/** Start of calendar day in America/New_York, as a UTC `Date` for DB comparisons. */
export function startOfNyDayUtc(ref: Date = new Date()): Date {
  const zoned = toZonedTime(ref, NY_TZ)
  const sod = startOfDay(zoned)
  return fromZonedTime(sod, NY_TZ)
}
