import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appointments, posTransactions } from '@/lib/db/schema'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { squireFetch } from '@/lib/squire/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function readString(rec: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === 'string' && v) return v
  }
  return undefined
}

async function syncIfPaid(checkoutId: string, payload: Record<string, unknown>) {
  const status = readString(payload, 'status', 'state')?.toUpperCase() ?? ''
  const paymentId = readString(payload, 'paymentId', 'payment_id')

  const done = status === 'COMPLETED' || status === 'COMPLETE' || status === 'PAID'
  if (!done || !paymentId) return

  const [txn] = await db
    .select()
    .from(posTransactions)
    .where(eq(posTransactions.squareTerminalCheckoutId, checkoutId))
    .limit(1)

  if (!txn || txn.paymentStatus !== 'pending') return

  await db
    .update(posTransactions)
    .set({
      squarePaymentId: paymentId,
      paymentStatus: 'paid',
      paymentMethod: 'card',
    })
    .where(eq(posTransactions.id, txn.id))

  if (txn.appointmentId) {
    await db
      .update(appointments)
      .set({
        status: 'completed',
        checkedOff: true,
        paymentStatus: 'paid',
        paymentMethod: 'card',
        squarePaymentId: paymentId,
        squareTerminalCheckoutId: checkoutId,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, txn.appointmentId))
  }
}

export async function GET(_request: Request, context: { params: Promise<{ checkoutId: string }> }) {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  const { checkoutId } = await context.params
  if (!checkoutId) {
    return NextResponse.json({ error: 'Missing checkout id' }, { status: 400 })
  }

  try {
    const res = await squireFetch(`/terminal/checkout/${encodeURIComponent(checkoutId)}`, { method: 'GET' })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      console.error('Squire get checkout', res.status, data)
      return NextResponse.json(
        { error: (data.message as string) || (data.error as string) || 'Failed to load checkout' },
        { status: 502 }
      )
    }

    await syncIfPaid(checkoutId, data)

    const status = readString(data, 'status', 'state') ?? 'UNKNOWN'
    return NextResponse.json({ ...data, status })
  } catch (e) {
    console.error('squire/checkout get', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get checkout' },
      { status: 500 }
    )
  }
}
