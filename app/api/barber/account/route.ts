import { NextResponse } from 'next/server'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { replaceStaffAllowlistEmail } from '@/lib/staff/staff-allowlist-email'

const patchSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional().nullable(),
})

/** PATCH — barber updates own display name, email, phone. */
export async function PATCH(request: Request) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const [profile] = await db.select().from(barbers).where(eq(barbers.userId, auth.user.id)).limit(1)
  if (!profile) {
    return NextResponse.json({ error: 'Barber profile not found' }, { status: 404 })
  }

  const target = auth.dbUser
  const emailIn = parsed.data.email?.trim().toLowerCase()
  if (emailIn && emailIn !== target.email) {
    const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailIn)).limit(1)
    if (dup && dup.id !== auth.user.id) {
      return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 })
    }
  }

  const admin = createServiceRoleClient()
  if (emailIn && emailIn !== target.email) {
    const { error: authErr } = await admin.auth.admin.updateUserById(auth.user.id, {
      email: emailIn,
    })
    if (authErr) {
      return NextResponse.json({ error: authErr.message ?? 'Could not update email' }, { status: 400 })
    }
    await replaceStaffAllowlistEmail(target.email, emailIn)
  }

  const now = new Date()
  const nextFullName = parsed.data.fullName?.trim() ?? target.fullName
  const nextPhone =
    parsed.data.phone === undefined ? target.phone : parsed.data.phone?.trim() || null
  const nextEmail = emailIn ?? target.email

  await db
    .update(users)
    .set({
      email: nextEmail,
      fullName: nextFullName,
      phone: nextPhone,
      updatedAt: now,
    })
    .where(eq(users.id, auth.user.id))

  await db
    .update(barbers)
    .set({
      name: nextFullName ?? profile.name,
      email: nextEmail,
      phone: nextPhone,
      updatedAt: now,
    })
    .where(eq(barbers.id, profile.id))

  const [updated] = await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1)
  return NextResponse.json({ data: updated })
}
