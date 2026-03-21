import { db } from '@/lib/db'
import { availability, barberDayModes, type Availability } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { getAllStoreWindows } from '@/lib/barber/store-hours'
import { getStaffAvailabilityKeys } from '@/lib/barber/staff-availability-keys'
import { pgTimeToMinutes } from '@/lib/appointments/time'
import { getEffectiveDayMode } from '@/lib/barber/resolve-effective-mode'

export type ScheduleIntervalOut = { id: string; startMinutes: number; endMinutes: number }
export type ScheduleDayOut = { dayOfWeek: number; mode: 'unavailable' | 'open' | 'custom'; intervals: ScheduleIntervalOut[] }

function preferUserRows<T extends { barberId: string }>(rows: T[], staffUserId: string): T[] {
  if (rows.length === 0) return rows
  const hasUser = rows.some((r) => r.barberId === staffUserId)
  return hasUser ? rows.filter((r) => r.barberId === staffUserId) : rows
}

export async function buildScheduleDaysForStaffUser(staffUserId: string) {
  const keys = await getStaffAvailabilityKeys(staffUserId)
  const keyIds = [keys.userId, keys.barberProfileId].filter(Boolean) as string[]

  let avRows: Availability[] = []
  const storeHours = await getAllStoreWindows()
  try {
    if (keyIds.length > 0) {
      avRows = await db.select().from(availability).where(inArray(availability.barberId, keyIds))
    }
    avRows = preferUserRows(avRows, staffUserId)
  } catch (e) {
    console.error('buildScheduleDaysForStaffUser: availability query', e)
    avRows = []
  }

  let modeRows: { barberId: string; dayOfWeek: number; mode: string }[] = []
  try {
    if (keyIds.length > 0) {
      modeRows = await db.select().from(barberDayModes).where(inArray(barberDayModes.barberId, keyIds))
    }
    modeRows = preferUserRows(modeRows, staffUserId)
  } catch {
    /* barber_day_modes missing until migration */
  }

  const modeByDay = new Map(modeRows.map((m) => [m.dayOfWeek, m]))
  const byDay = new Map<number, typeof avRows>()
  for (const r of avRows) {
    const list = byDay.get(r.dayOfWeek) ?? []
    list.push(r)
    byDay.set(r.dayOfWeek, list)
  }

  const days: ScheduleDayOut[] = []
  for (let dow = 0; dow <= 6; dow++) {
    const list = byDay.get(dow) ?? []
    const m = modeByDay.get(dow)
    const effective = getEffectiveDayMode(m, list.length)
    const intervals: ScheduleIntervalOut[] =
      effective === 'custom'
        ? list.map((x) => ({
            id: x.id,
            startMinutes: pgTimeToMinutes(String(x.startTime)),
            endMinutes: pgTimeToMinutes(String(x.endTime)),
          }))
        : []
    days.push({ dayOfWeek: dow, mode: effective, intervals })
  }

  return { storeHours, days }
}
