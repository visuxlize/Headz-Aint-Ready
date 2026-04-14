import { db } from '@/lib/db'
import { users, type User } from '@/lib/db/schema'
import { and, eq, ne } from 'drizzle-orm'

type ResolveDbUserParams = {
  authUserId: string
  authEmail: string | null | undefined
}

/**
 * Resolves staff user for a Supabase auth user.
 * Falls back to email when legacy rows have mismatched ids, then repairs admin ids.
 */
export async function resolveDbUserForAuth({ authUserId, authEmail }: ResolveDbUserParams): Promise<User | null> {
  const [direct] = await db.select().from(users).where(eq(users.id, authUserId)).limit(1)
  if (direct) return direct

  const email = authEmail?.trim().toLowerCase()
  if (!email) return null

  const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!byEmail) return null
  if (byEmail.id === authUserId) return byEmail

  // Safe self-heal for admin accounts created with a mismatched legacy id.
  if (byEmail.role === 'admin') {
    try {
      const [existingTarget] = await db.select({ id: users.id }).from(users).where(eq(users.id, authUserId)).limit(1)
      if (!existingTarget) {
        await db
          .update(users)
          .set({ id: authUserId, updatedAt: new Date() })
          .where(and(eq(users.email, email), ne(users.id, authUserId)))

        const [healed] = await db.select().from(users).where(eq(users.id, authUserId)).limit(1)
        if (healed) return healed
      }
    } catch (error) {
      console.error('resolveDbUserForAuth: admin id repair failed', error)
    }
  }

  return byEmail
}
