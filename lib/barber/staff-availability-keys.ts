import { db } from '@/lib/db'
import { barbers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** Staff user id + optional barbers.id when linked — availability rows may use either in older DBs. */
export type StaffAvailabilityKeys = { userId: string; barberProfileId: string | null }

export async function getStaffAvailabilityKeys(userId: string): Promise<StaffAvailabilityKeys> {
  const [b] = await db.select({ id: barbers.id }).from(barbers).where(eq(barbers.userId, userId)).limit(1)
  return { userId, barberProfileId: b?.id ?? null }
}

export function allAvailabilityKeyIds(keys: StaffAvailabilityKeys): string[] {
  return [keys.userId, keys.barberProfileId].filter(Boolean) as string[]
}
