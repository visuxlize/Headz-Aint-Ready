import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, staffAllowlist, users } from '@/lib/db/schema'
import { asc, eq, or } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { generateTemporaryPassword } from '@/lib/staff/generate-temporary-password'
import { z } from 'zod'

const inviteAdminSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
})

/** POST — create admin user (Supabase createUser + users + staff_allowlist; temp password, must change on first login). */
export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = inviteAdminSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const fullName = parsed.data.fullName.trim()
  const emailLower = parsed.data.email.trim().toLowerCase()

  const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailLower)).limit(1)
  if (dup) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
  }

  const admin = createServiceRoleClient()
  const temporaryPassword = generateTemporaryPassword()

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: emailLower,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? 'Could not create auth user'
    const status = msg.toLowerCase().includes('already') ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }

  const userId = created.user.id

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: emailLower,
        fullName,
        role: 'admin',
        isActive: true,
        mustChangePassword: true,
      })
      await tx.insert(staffAllowlist).values({ email: emailLower }).onConflictDoNothing()
    })
  } catch (e) {
    console.error('POST /api/admin/staff db error', e)
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch (delErr) {
      console.error('Rollback: deleteUser failed', delErr)
    }
    return NextResponse.json({ error: 'Could not save admin account. Try again.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: { id: userId, email: emailLower },
      temporaryPassword,
      message: 'Account created. Share the temporary password securely; they must choose a new password after signing in.',
    },
    { status: 201 }
  )
}

/** GET — all admin + barber accounts (linked users) with barber profile when present. */
export async function GET() {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const staffUsers = await db
    .select({
      user: users,
      barberId: barbers.id,
      barberName: barbers.name,
    })
    .from(users)
    .leftJoin(barbers, eq(barbers.userId, users.id))
    .where(or(eq(users.role, 'admin'), eq(users.role, 'barber')))
    .orderBy(asc(users.role), asc(users.email))

  const data = staffUsers.map(({ user: u, barberId, barberName }) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    barberProfileId: barberId,
    displayName: barberName ?? u.fullName ?? u.email,
  }))

  return NextResponse.json({ data })
}
