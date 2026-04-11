import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/admin'

function generateTemporaryPassword(): string {
  const core = randomBytes(18).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 14)
  return `${core}Aa1!`
}

/** POST — set a one-time password; barber must change it on next login. */
export async function POST(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { userId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  if (userId === auth.user.id) {
    return NextResponse.json({ error: 'Use your profile to change your own password.' }, { status: 400 })
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!target || (target.role !== 'barber' && target.role !== 'admin')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const temporaryPassword = generateTemporaryPassword()
  const admin = createServiceRoleClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
  })
  if (error) {
    return NextResponse.json({ error: error.message ?? 'Could not set password' }, { status: 400 })
  }

  const now = new Date()
  await db
    .update(users)
    .set({ mustChangePassword: true, updatedAt: now })
    .where(eq(users.id, userId))

  return NextResponse.json({
    message: 'Temporary password set. Share it once with this team member; they must choose a new password after signing in.',
    temporaryPassword,
  })
}
