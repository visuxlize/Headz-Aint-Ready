import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { posTransactions } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { requireSquareClient, newIdempotencyKey } from '@/lib/square/client'

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
      { error: 'Cash payments cannot be refunded through Square. Handle refunds manually.' },
      { status: 400 }
    )
  }

  try {
    const client = requireSquareClient()
    const res = await client.refunds.refundPayment({
      idempotencyKey: newIdempotencyKey(),
      paymentId,
      amountMoney: { amount: BigInt(amountCents), currency: 'USD' },
      reason,
    })

    const refund = res.refund
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
      refundId: refund?.id ?? null,
      status: refund?.status ?? 'UNKNOWN',
    })
  } catch (e) {
    console.error('square/refund', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Refund failed' },
      { status: 500 }
    )
  }
}
