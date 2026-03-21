import { db } from '@/lib/db'
import { storeHours } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { pgTimeToMinutes } from '@/lib/appointments/time'

const DEFAULT_OPEN = 9 * 60
const DEFAULT_CLOSE = 20 * 60

export type StoreDayWindow = {
  dayOfWeek: number
  openMin: number
  closeMin: number
  isOpen: boolean
}

/** Single day: defaults to 9–8pm open if no row. */
export async function getStoreWindowForDay(dayOfWeek: number): Promise<StoreDayWindow> {
  const [row] = await db.select().from(storeHours).where(eq(storeHours.dayOfWeek, dayOfWeek)).limit(1)
  if (!row) {
    return { dayOfWeek, openMin: DEFAULT_OPEN, closeMin: DEFAULT_CLOSE, isOpen: true }
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
    openMin: DEFAULT_OPEN,
    closeMin: DEFAULT_CLOSE,
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
      if (!row) return { dayOfWeek, openMin: DEFAULT_OPEN, closeMin: DEFAULT_CLOSE, isOpen: true }
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
