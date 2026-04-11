import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posTransactions } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'

/** DELETE — void a ticket (manual soft-delete). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuid.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const [row] = await db.select({ id: posTransactions.id }).from(posTransactions).where(eq(posTransactions.id, id)).limit(1)
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.update(posTransactions).set({ paymentStatus: 'voided' }).where(eq(posTransactions.id, id))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/dashboard/tickets/[id]', e)
    return NextResponse.json({ error: 'Failed to void ticket' }, { status: 500 })
  }
}
