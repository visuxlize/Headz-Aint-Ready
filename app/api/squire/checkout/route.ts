import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { posTransactions } from '@/lib/db/schema'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { requireBarberUserId } from '@/lib/staff/barber-scope'
import { squireFetch } from '@/lib/squire/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  amount: z // dollars
    .number()
    .positive(),
  transactionId: z.string().uuid().optional(),
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

  const { barberId, serviceId, appointmentId, amount, transactionId } = parsed.data
  const locationId = process.env.SQUIRE_LOCATION_ID?.trim()

  const scoped = requireBarberUserId(auth, barberId)
  if (scoped) return scoped

  if (transactionId) {
    const [txn] = await db.select().from(posTransactions).where(eq(posTransactions.id, transactionId)).limit(1)
    if (!txn) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    if (txn.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Transaction is not pending' }, { status: 400 })
    }
    if (txn.barberId !== barberId) {
      return NextResponse.json({ error: 'Transaction does not match barber' }, { status: 400 })
    }
  }

  try {
    const res = await squireFetch('/terminal/checkout', {
      method: 'POST',
      body: JSON.stringify({
        locationId: locationId ?? undefined,
        barberId,
        serviceId,
        appointmentId: appointmentId ?? undefined,
        amount,
        amountCents: Math.round(amount * 100),
        transactionId: transactionId ?? undefined,
      }),
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      console.error('Squire checkout error', res.status, data)
      return NextResponse.json(
        { error: (data.message as string) || (data.error as string) || `Squire API error (${res.status})` },
        { status: 502 }
      )
    }

    const checkoutId = (data.checkoutId ?? data.id ?? data.checkout_id) as string | undefined
    const status = (data.status ?? data.state ?? 'PENDING') as string

    if (checkoutId && transactionId) {
      await db
        .update(posTransactions)
        .set({ squareTerminalCheckoutId: checkoutId })
        .where(eq(posTransactions.id, transactionId))
    }

    return NextResponse.json({
      checkoutId,
      status,
      raw: data,
    })
  } catch (e) {
    console.error('squire/checkout', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Terminal checkout failed' },
      { status: 500 }
    )
  }
}
