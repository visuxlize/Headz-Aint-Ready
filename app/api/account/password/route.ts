import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

async function requireStaffUser(userId: string) {
  const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'barber')) {
    return null
  }
  return dbUser
}

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

/** POST — change password while logged in (barber or admin). Verifies current password via sign-in. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const staff = await requireStaffUser(user.id)
  if (!staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signErr) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
  }

  const { error: updErr } = await supabase.auth.updateUser({ password: newPassword })
  if (updErr) {
    return NextResponse.json({ error: updErr.message ?? 'Could not update password' }, { status: 400 })
  }

  const now = new Date()
  await db
    .update(users)
    .set({ mustChangePassword: false, updatedAt: now })
    .where(eq(users.id, user.id))

  return NextResponse.json({ ok: true })
}
