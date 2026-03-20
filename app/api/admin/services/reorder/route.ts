import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { services } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'

const bodySchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
})

/** POST — set display_order from array order (0..n) */
export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const { orderedIds } = parsed.data

  const existing = await db.select({ id: services.id }).from(services).where(inArray(services.id, orderedIds))
  if (existing.length !== orderedIds.length) {
    return NextResponse.json({ error: 'Unknown service id in list' }, { status: 400 })
  }

  const now = new Date()
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(services)
      .set({ displayOrder: i, updatedAt: now })
      .where(eq(services.id, orderedIds[i]))
  }

  const list = await db.select().from(services).where(inArray(services.id, orderedIds))
  const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]))
  list.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))

  return NextResponse.json({ data: list })
}
