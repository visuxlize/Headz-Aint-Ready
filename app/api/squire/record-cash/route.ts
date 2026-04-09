import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { appointments, posTransactions } from '@/lib/db/schema'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { requireBarberUserId } from '@/lib/staff/barber-scope'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  amountCents: z.number().int().positive(),
  cashGivenCents: z.number().int().min(0),
  transactionId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
})

/**
 * Records cash tender locally (no Squire cash API). Logs payload for auditing.
 */
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

  console.log('[Squire record-cash]', {
    staffUserId: auth.user.id,
    amountCents,
    cashGivenCents,
    transactionId,
    appointmentId,
    note,
  })

  const [txn] = await db.select().from(posTransactions).where(eq(posTransactions.id, transactionId)).limit(1)
  if (!txn) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }
  const scoped = requireBarberUserId(auth, txn.barberId)
  if (scoped) return scoped
  if (txn.paymentStatus !== 'pending') {
    return NextResponse.json({ error: 'Transaction is not pending' }, { status: 400 })
  }

  if (appointmentId && txn.appointmentId && txn.appointmentId !== appointmentId) {
    return NextResponse.json({ error: 'appointmentId does not match transaction' }, { status: 400 })
  }

  const localPaymentRef = `cash-${transactionId}`

  await db
    .update(posTransactions)
    .set({
      squarePaymentId: localPaymentRef,
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
        squarePaymentId: localPaymentRef,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, apptId))
  }

  return NextResponse.json({ ok: true, paymentId: localPaymentRef }, { status: 200 })
}
