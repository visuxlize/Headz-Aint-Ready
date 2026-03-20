import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { services } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.coerce.number().int().optional(),
})

/** PATCH — update service (no hard delete) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
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
  const d = parsed.data

  const [current] = await db.select().from(services).where(eq(services.id, id)).limit(1)
  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const price =
    d.price != null ? Number.parseFloat(d.price).toFixed(2) : undefined

  const [updated] = await db
    .update(services)
    .set({
      ...(d.name != null ? { name: d.name.trim() } : {}),
      ...(d.description !== undefined ? { description: d.description?.trim() || null } : {}),
      ...(price != null ? { price } : {}),
      ...(d.durationMinutes != null ? { durationMinutes: d.durationMinutes } : {}),
      ...(d.isActive != null ? { isActive: d.isActive } : {}),
      ...(d.displayOrder != null ? { displayOrder: d.displayOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(services.id, id))
    .returning()

  return NextResponse.json({ data: updated })
}
