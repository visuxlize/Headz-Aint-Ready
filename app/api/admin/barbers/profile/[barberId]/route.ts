import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, staffAllowlist } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'

const patchSchema = z.object({
  isActive: z.boolean(),
})

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
  await db.update(barbers).set({ isActive: parsed.data.isActive, updatedAt: now }).where(eq(barbers.id, barberId))

  const em = row.email?.trim().toLowerCase()
  if (em) {
    if (parsed.data.isActive) {
      await db.insert(staffAllowlist).values({ email: em }).onConflictDoNothing()
    } else {
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
