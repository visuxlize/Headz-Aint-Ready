import { db } from '@/lib/db'
import { staffAllowlist } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** When a staff email changes, keep `staff_allowlist` in sync (login gate). */
export async function replaceStaffAllowlistEmail(oldEmail: string | null | undefined, newEmail: string) {
  const n = newEmail.trim().toLowerCase()
  const o = oldEmail?.trim().toLowerCase()
  if (o && o !== n) {
    await db.delete(staffAllowlist).where(eq(staffAllowlist.email, o))
  }
  await db.insert(staffAllowlist).values({ email: n }).onConflictDoNothing()
}
