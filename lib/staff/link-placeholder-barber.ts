import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'

/**
 * If a barber roster row exists with this invite email and no linked user yet,
 * create `public.users` and attach `barbers.user_id` after the person signs up.
 */
export async function linkPlaceholderBarberIfNeeded(userId: string, email: string): Promise<boolean> {
  const em = email.trim().toLowerCase()
  if (!em) return false

  const [row] = await db
    .select()
    .from(barbers)
    .where(and(isNull(barbers.userId), sql`lower(${barbers.email}) = ${em}`))
    .limit(1)

  if (!row) return false

  const now = new Date()
  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({
        id: userId,
        email: em,
        fullName: row.name,
        role: 'barber',
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: em,
          fullName: row.name,
          role: 'barber',
          isActive: true,
          updatedAt: now,
        },
      })

    await tx.update(barbers).set({ userId, updatedAt: now }).where(eq(barbers.id, row.id))
  })

  return true
}
