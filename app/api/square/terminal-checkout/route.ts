import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { posTransactions } from '@/lib/db/schema'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { requireSquareClient, newIdempotencyKey } from '@/lib/square/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  deviceId: z.string().min(1),
  amountCents: z.number().int().positive(),
  transactionId: z.string().uuid(),
  note: z.string().max(500).optional(),
  tipEnabled: z.boolean().optional(),
})

export async function POST(request: Request) {
  const auth = await requireStaffApi()
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

  const { deviceId, amountCents, transactionId, note, tipEnabled } = parsed.data

  const [txn] = await db.select().from(posTransactions).where(eq(posTransactions.id, transactionId)).limit(1)
  if (!txn) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }
  if (txn.paymentStatus !== 'pending') {
    return NextResponse.json({ error: 'Transaction is not pending' }, { status: 400 })
  }

  try {
    const client = requireSquareClient()
    const res = await client.terminal.checkouts.create({
      idempotencyKey: newIdempotencyKey(),
      checkout: {
        amountMoney: { amount: BigInt(amountCents), currency: 'USD' },
        deviceOptions: {
          deviceId,
          skipReceiptScreen: true,
          tipSettings: { allowTipping: tipEnabled ?? false },
        },
        note: note ?? undefined,
        referenceId: transactionId,
      },
    })

    const checkout = res.checkout
    if (!checkout?.id) {
      return NextResponse.json({ error: 'Square did not return a checkout' }, { status: 502 })
    }

    await db
      .update(posTransactions)
      .set({ squareTerminalCheckoutId: checkout.id })
      .where(eq(posTransactions.id, transactionId))

    return NextResponse.json({
      checkoutId: checkout.id,
      status: checkout.status ?? 'UNKNOWN',
    })
  } catch (e) {
    console.error('square/terminal-checkout', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Terminal checkout failed' },
      { status: 500 }
    )
  }
}
