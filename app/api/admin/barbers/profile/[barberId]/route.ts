import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, staffAllowlist } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'

const patchSchema = z
  .object({
    isActive: z.boolean().optional(),
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(40).optional().nullable(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' })

/** PATCH roster-only barber row (no linked auth user yet). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ barberId: string }> }
) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { barberId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(barberId)) {
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

  const [row] = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.id, barberId), isNull(barbers.userId)))
    .limit(1)
  if (!row) {
    return NextResponse.json({ error: 'Not found or already linked to an account' }, { status: 404 })
  }

  const now = new Date()
  const patch = parsed.data
  const oldEmail = row.email?.trim().toLowerCase()

  if (patch.email !== undefined) {
    const next = patch.email.trim().toLowerCase()
    const [dup] = await db
      .select({ id: barbers.id })
      .from(barbers)
      .where(eq(barbers.email, next))
      .limit(1)
    if (dup && dup.id !== barberId) {
      return NextResponse.json({ error: 'That email is already on the roster.' }, { status: 409 })
    }
  }

  await db
    .update(barbers)
    .set({
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone?.trim() || null } : {}),
      updatedAt: now,
    })
    .where(eq(barbers.id, barberId))

  const [fresh] = await db.select().from(barbers).where(eq(barbers.id, barberId)).limit(1)
  const em = fresh?.email?.trim().toLowerCase()

  if (patch.isActive !== undefined || patch.email !== undefined) {
    if (patch.email !== undefined && oldEmail && em && oldEmail !== em) {
      await db.delete(staffAllowlist).where(eq(staffAllowlist.email, oldEmail))
    }
    if (fresh?.isActive && em) {
      await db.insert(staffAllowlist).values({ email: em }).onConflictDoNothing()
    } else if (em) {
      await db.delete(staffAllowlist).where(eq(staffAllowlist.email, em))
    }
  }

  const [updated] = await db.select().from(barbers).where(eq(barbers.id, barberId)).limit(1)
  return NextResponse.json({ data: updated })
}

/** DELETE — remove roster-only row (no linked auth account). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ barberId: string }> }
) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { barberId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(barberId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const [row] = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.id, barberId), isNull(barbers.userId)))
    .limit(1)
  if (!row) {
    return NextResponse.json(
      { error: 'Not found or has a linked account — use Remove on the linked profile instead.' },
      { status: 404 }
    )
  }

  const em = row.email?.trim().toLowerCase()
  if (em) {
    await db.delete(staffAllowlist).where(eq(staffAllowlist.email, em))
  }
  await db.delete(barbers).where(eq(barbers.id, barberId))

  return NextResponse.json({ ok: true })
}
