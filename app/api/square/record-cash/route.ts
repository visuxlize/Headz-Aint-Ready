import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { appointments, posTransactions } from '@/lib/db/schema'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { requireSquareClient, newIdempotencyKey } from '@/lib/square/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  amountCents: z.number().int().positive(),
  cashGivenCents: z.number().int().min(0),
  transactionId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
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

  const { amountCents, cashGivenCents, transactionId, appointmentId, note } = parsed.data
  const locationId = process.env.SQUARE_LOCATION_ID
  if (!locationId) {
    return NextResponse.json({ error: 'SQUARE_LOCATION_ID not configured' }, { status: 500 })
  }

  const [txn] = await db.select().from(posTransactions).where(eq(posTransactions.id, transactionId)).limit(1)
  if (!txn) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }
  if (txn.paymentStatus !== 'pending') {
    return NextResponse.json({ error: 'Transaction is not pending' }, { status: 400 })
  }

  if (appointmentId && txn.appointmentId && txn.appointmentId !== appointmentId) {
    return NextResponse.json({ error: 'appointmentId does not match transaction' }, { status: 400 })
  }

  try {
    const client = requireSquareClient()
    const res = await client.payments.create({
      idempotencyKey: newIdempotencyKey(),
      sourceId: 'CASH',
      amountMoney: { amount: BigInt(amountCents), currency: 'USD' },
      cashDetails: {
        buyerSuppliedMoney: { amount: BigInt(cashGivenCents), currency: 'USD' },
      },
      locationId,
      note: note ?? undefined,
      referenceId: transactionId,
    })

    const payment = res.payment
    if (!payment?.id) {
      return NextResponse.json({ error: 'Square did not return a payment' }, { status: 502 })
    }

    await db
      .update(posTransactions)
      .set({
        squarePaymentId: payment.id,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
      })
      .where(eq(posTransactions.id, transactionId))

    const apptId = appointmentId ?? txn.appointmentId
    if (apptId) {
      await db
        .update(appointments)
        .set({
          status: 'completed',
          checkedOff: true,
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          squarePaymentId: payment.id,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, apptId))
    }

    return NextResponse.json({ paymentId: payment.id })
  } catch (e) {
    console.error('square/record-cash', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cash recording failed' },
      { status: 500 }
    )
  }
}
