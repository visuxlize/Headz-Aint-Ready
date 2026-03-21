import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { blockedTimes } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { requireBarberApi } from '@/lib/barber/api-auth'

/** DELETE /api/barber/blocked-times/[id] */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const { id } = await context.params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const deleted = await db
    .delete(blockedTimes)
    .where(and(eq(blockedTimes.id, id), eq(blockedTimes.barberId, auth.user.id)))
    .returning({ id: blockedTimes.id })
  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
