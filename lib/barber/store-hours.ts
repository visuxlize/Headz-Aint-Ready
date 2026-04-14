import { db } from '@/lib/db'
import { storeHours } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { pgTimeToMinutes } from '@/lib/appointments/time'

const DEFAULT_OPEN_WEEKDAY = 9 * 60 + 30
const DEFAULT_CLOSE_WEEKDAY = 19 * 60
const DEFAULT_OPEN_SUNDAY = 10 * 60
const DEFAULT_CLOSE_SUNDAY = 18 * 60

export type StoreDayWindow = {
  dayOfWeek: number
  openMin: number
  closeMin: number
  isOpen: boolean
}

/** Single day fallback: Mon-Sat 9:30am-7pm, Sun 10am-6pm when no row exists. */
export async function getStoreWindowForDay(dayOfWeek: number): Promise<StoreDayWindow> {
  const [row] = await db.select().from(storeHours).where(eq(storeHours.dayOfWeek, dayOfWeek)).limit(1)
  if (!row) {
    const isSunday = dayOfWeek === 0
    return {
      dayOfWeek,
      openMin: isSunday ? DEFAULT_OPEN_SUNDAY : DEFAULT_OPEN_WEEKDAY,
      closeMin: isSunday ? DEFAULT_CLOSE_SUNDAY : DEFAULT_CLOSE_WEEKDAY,
      isOpen: true,
    }
  }
  return {
    dayOfWeek,
    openMin: pgTimeToMinutes(String(row.openTime)),
    closeMin: pgTimeToMinutes(String(row.closeTime)),
    isOpen: row.isOpen,
  }
}

function defaultWeek(): StoreDayWindow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openMin: dayOfWeek === 0 ? DEFAULT_OPEN_SUNDAY : DEFAULT_OPEN_WEEKDAY,
    closeMin: dayOfWeek === 0 ? DEFAULT_CLOSE_SUNDAY : DEFAULT_CLOSE_WEEKDAY,
    isOpen: true,
  }))
}

/** All 7 days (0=Sun … 6=Sat). */
export async function getAllStoreWindows(): Promise<StoreDayWindow[]> {
  try {
    const rows = await db.select().from(storeHours)
    const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]))
    return Array.from({ length: 7 }, (_, dayOfWeek) => {
      const row = byDay.get(dayOfWeek)
      if (!row) {
        return {
          dayOfWeek,
          openMin: dayOfWeek === 0 ? DEFAULT_OPEN_SUNDAY : DEFAULT_OPEN_WEEKDAY,
          closeMin: dayOfWeek === 0 ? DEFAULT_CLOSE_SUNDAY : DEFAULT_CLOSE_WEEKDAY,
          isOpen: true,
        }
      }
      return {
        dayOfWeek,
        openMin: pgTimeToMinutes(String(row.openTime)),
        closeMin: pgTimeToMinutes(String(row.closeTime)),
        isOpen: row.isOpen,
      }
    })
  } catch (e) {
    console.error('getAllStoreWindows: falling back to defaults', e)
    return defaultWeek()
  }
}
