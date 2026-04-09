import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { posTransactions } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { squireFetch } from '@/lib/squire/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  paymentId: z.string().min(1),
  amountCents: z.number().int().positive(),
  reason: z.string().min(1).max(200),
  transactionId: z.string().uuid(),
})

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { paymentId, amountCents, reason, transactionId } = parsed.data

  const [txn] = await db.select().from(posTransactions).where(eq(posTransactions.id, transactionId)).limit(1)
  if (!txn) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }
  if (txn.paymentMethod === 'cash') {
    return NextResponse.json(
      { error: 'Cash payments cannot be refunded through Squire. Handle refunds manually.' },
      { status: 400 }
    )
  }

  try {
    const res = await squireFetch(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        amountCents,
        reason,
        transactionId,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      console.error('Squire refund', res.status, data)
      return NextResponse.json(
        { error: (data.message as string) || (data.error as string) || 'Refund failed' },
        { status: 502 }
      )
    }

    const refundAmountDollars = (amountCents / 100).toFixed(2)
    await db
      .update(posTransactions)
      .set({
        refundedAt: new Date(),
        refundReason: reason,
        refundAmount: refundAmountDollars,
        paymentStatus: 'refunded',
      })
      .where(eq(posTransactions.id, transactionId))

    return NextResponse.json({
      refundId: (data.id ?? data.refund_id) as string | null,
      status: (data.status as string) ?? 'UNKNOWN',
    })
  } catch (e) {
    console.error('squire/refund', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Refund failed' },
      { status: 500 }
    )
  }
}
