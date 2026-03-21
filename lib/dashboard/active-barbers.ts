import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'

export type ActiveBarberColumn = {
  /** Stable column key: staff user id when linked, else barbers.id */
  id: string
  barberProfileId: string
  /** Appointments + blocks use auth user id; null = roster-only (no bookings yet) */
  staffUserId: string | null
  name: string
  initials: string
  avatarUrl: string | null
}

function initialsFrom(name: string | null | undefined): string {
  const n = name?.trim()
  if (!n) return '?'
  const parts = n.split(/\s+/)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

/**
 * All active barbers on the roster (`barbers.is_active`), ordered for the calendar.
 * Linked barbers use `staffUserId` for appointment matching; placeholders still get a column.
 */
export async function getBarbersForCalendar(): Promise<ActiveBarberColumn[]> {
  const rows = await db
    .select({
      barber: barbers,
      user: users,
    })
    .from(barbers)
    .leftJoin(users, eq(barbers.userId, users.id))
    .where(eq(barbers.isActive, true))
    .orderBy(asc(barbers.sortOrder), asc(barbers.name))

  return rows.map(({ barber: b, user: u }) => {
    const name = b.name
    const staffUserId = u?.id ?? null
    const displayName = u?.fullName?.trim() ? u.fullName : name
    return {
      id: staffUserId ?? b.id,
      barberProfileId: b.id,
      staffUserId,
      name: displayName,
      initials: initialsFrom(displayName),
      avatarUrl: b.avatarUrl ?? u?.avatarUrl ?? null,
    }
  })
}

/** @deprecated use getBarbersForCalendar */
export async function getActiveBarbersForCalendar(): Promise<ActiveBarberColumn[]> {
  return getBarbersForCalendar()
}
