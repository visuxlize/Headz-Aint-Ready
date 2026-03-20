import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timeOffRequests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'

const bodySchema = z.object({
  denialReason: z.string().max(1000).optional().nullable(),
})

/** POST — deny time off request */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: unknown = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const [reqRow] = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id)).limit(1)
  if (!reqRow) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  if (reqRow.status !== 'pending') {
    return NextResponse.json({ error: 'Request is not pending' }, { status: 400 })
  }

  const reason = parsed.data.denialReason?.trim() || null
  const now = new Date()

  await db
    .update(timeOffRequests)
    .set({
      status: 'denied',
      reviewedBy: auth.user.id,
      reviewedAt: now,
      denialReason: reason,
    })
    .where(eq(timeOffRequests.id, id))

  const [updated] = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id)).limit(1)

  return NextResponse.json({ data: updated })
}
