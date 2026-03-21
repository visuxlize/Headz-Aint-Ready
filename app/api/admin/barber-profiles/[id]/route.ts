import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  /** Work email barbers use at signup to claim this profile */
  displayEmail: z.string().email().optional().nullable(),
  name: z.string().min(1).max(200).optional(),
})

/** PATCH barber profile row when no staff account is linked yet (Dream Team placeholders). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const [row] = await db.select().from(barbers).where(eq(barbers.id, id)).limit(1)
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (row.userId != null) {
    return NextResponse.json(
      { error: 'This barber already has a staff login. Use Deactivate on the linked account instead.' },
      { status: 400 }
    )
  }

  if (d.displayEmail != null && d.displayEmail !== '') {
    const lower = d.displayEmail.trim().toLowerCase()
    const [dupUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, lower)).limit(1)
    if (dupUser) {
      return NextResponse.json({ error: 'That email is already used by a staff account.' }, { status: 409 })
    }
  }

  const [updated] = await db
    .update(barbers)
    .set({
      ...(d.name != null ? { name: d.name.trim() } : {}),
      ...(d.displayEmail !== undefined
        ? { email: d.displayEmail?.trim().toLowerCase() ?? null }
        : {}),
      ...(d.isActive != null ? { isActive: d.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(barbers.id, id))
    .returning()

  return NextResponse.json({ data: updated })
}
