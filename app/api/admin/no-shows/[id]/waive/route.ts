import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'

/** POST — waive no-show fee */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const [current] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1)
  if (!current || current.status !== 'no_show') {
    return NextResponse.json({ error: 'Not found or not a no-show' }, { status: 404 })
  }

  const now = new Date()
  const [updated] = await db
    .update(appointments)
    .set({
      noShowFee: '0',
      waivedAt: now,
      updatedAt: now,
    })
    .where(eq(appointments.id, id))
    .returning()

  return NextResponse.json({ data: updated })
}
