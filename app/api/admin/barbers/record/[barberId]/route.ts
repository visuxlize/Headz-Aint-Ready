import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'

const patchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    avatarUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
    showOnHomepage: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' })

/** PATCH — update public-facing barber profile (any barber row: linked or placeholder). */
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

  const [row] = await db.select().from(barbers).where(eq(barbers.id, barberId)).limit(1)
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const patch = parsed.data
  const now = new Date()

  const nextAvatar =
    patch.avatarUrl === undefined ? row.avatarUrl : patch.avatarUrl === '' ? null : patch.avatarUrl

  await db
    .update(barbers)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.avatarUrl !== undefined ? { avatarUrl: nextAvatar } : {}),
      ...(patch.showOnHomepage !== undefined ? { showOnHomepage: patch.showOnHomepage } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      updatedAt: now,
    })
    .where(eq(barbers.id, barberId))

  if (patch.name !== undefined && row.userId) {
    await db
      .update(users)
      .set({
        fullName: patch.name.trim(),
        updatedAt: now,
      })
      .where(eq(users.id, row.userId))
  }

  const [updated] = await db.select().from(barbers).where(eq(barbers.id, barberId)).limit(1)
  return NextResponse.json({ data: updated })
}
