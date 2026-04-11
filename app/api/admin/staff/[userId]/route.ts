import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { replaceStaffAllowlistEmail } from '@/lib/staff/staff-allowlist-email'

const patchSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(40).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' })

/** PATCH — admin updates another staff member’s name, email, phone. */
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { userId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

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

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (target.role !== 'admin' && target.role !== 'barber') {
    return NextResponse.json({ error: 'Not a staff account' }, { status: 400 })
  }

  if (parsed.data.isActive !== undefined && parsed.data.isActive === false && userId === auth.user.id) {
    return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 })
  }

  const emailIn = parsed.data.email?.trim().toLowerCase()
  if (emailIn && emailIn !== target.email) {
    const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailIn)).limit(1)
    if (dup && dup.id !== userId) {
      return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 })
    }
  }

  const admin = createServiceRoleClient()
  const now = new Date()

  if (emailIn && emailIn !== target.email) {
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      email: emailIn,
    })
    if (authErr) {
      return NextResponse.json({ error: authErr.message ?? 'Could not update login email' }, { status: 400 })
    }
    await replaceStaffAllowlistEmail(target.email, emailIn)
  }

  const nextFullName = parsed.data.fullName?.trim() ?? target.fullName
  const nextPhone =
    parsed.data.phone === undefined ? target.phone : parsed.data.phone?.trim() || null
  const nextEmail = emailIn ?? target.email
  const nextActive = parsed.data.isActive !== undefined ? parsed.data.isActive : target.isActive

  await db
    .update(users)
    .set({
      email: nextEmail,
      fullName: nextFullName,
      phone: nextPhone,
      ...(parsed.data.isActive !== undefined ? { isActive: nextActive } : {}),
      updatedAt: now,
    })
    .where(eq(users.id, userId))

  if (target.role === 'barber') {
    const [b] = await db.select().from(barbers).where(eq(barbers.userId, userId)).limit(1)
    if (b) {
      await db
        .update(barbers)
        .set({
          name: nextFullName ?? b.name,
          email: nextEmail,
          phone: nextPhone,
          ...(parsed.data.isActive !== undefined ? { isActive: nextActive } : {}),
          updatedAt: now,
        })
        .where(eq(barbers.id, b.id))
    }
  }

  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return NextResponse.json({ data: updated })
}
