import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { squareDevices } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { requireStaffApi } from '@/lib/staff/require-staff-api'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  const { id } = await context.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const [row] = await db.select().from(squareDevices).where(eq(squareDevices.id, id)).limit(1)
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    device: {
      id: row.id,
      deviceId: row.deviceId,
      deviceCodeId: row.deviceCodeId,
      deviceName: row.deviceName,
      status: row.status,
      pairedAt: row.pairedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    },
  })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await context.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const deleted = await db.delete(squareDevices).where(eq(squareDevices.id, id)).returning({ id: squareDevices.id })
  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
