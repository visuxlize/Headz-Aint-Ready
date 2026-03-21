import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * `blocked_times.barber_id` must be the barber staff id (`users.id` where role = barber).
 * Accepts either that id or a `barbers.id` (roster profile row).
 */
export async function resolveBarberUserIdForBlock(input: string): Promise<string | null> {
  const [asUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, input), eq(users.role, 'barber')))
    .limit(1)
  if (asUser) return asUser.id

  const [prof] = await db
    .select({ userId: barbers.userId })
    .from(barbers)
    .where(eq(barbers.id, input))
    .limit(1)
  if (!prof?.userId) return null

  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, prof.userId), eq(users.role, 'barber')))
    .limit(1)
  return u?.id ?? null
}
