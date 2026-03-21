import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appointments, posTransactions, squareDevices } from '@/lib/db/schema'
import { requireSquareClient, fromCents } from '@/lib/square/client'
import { verifySquareWebhookSignature } from '@/lib/square/webhook'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Always 200 — Square retries on non-2xx */
export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get('x-square-hmacsha256-signature') ?? ''

  const valid = await verifySquareWebhookSignature(rawBody, sig)
  if (!valid) {
    console.error('Square webhook: invalid signature')
    return NextResponse.json({ received: true })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ received: true })
  }

  const type = event.type as string | undefined

  try {
    if (type === 'terminal.checkout.updated') {
      await handleTerminalCheckoutUpdated(event)
    } else if (type === 'device.code.paired') {
      await handleDeviceCodePaired(event)
    } else if (type === 'payment.created') {
      await handlePaymentCreated(event)
    }
  } catch (err) {
    console.error('Square webhook handler:', type, err)
  }

  return NextResponse.json({ received: true })
}

function readCheckout(obj: Record<string, unknown> | undefined) {
  if (!obj) return undefined
  return (obj.checkout ?? obj) as Record<string, unknown> | undefined
}

async function handleTerminalCheckoutUpdated(event: Record<string, unknown>) {
  const data = event.data as Record<string, unknown> | undefined
  const obj = data?.object as Record<string, unknown> | undefined
  const checkout = readCheckout(obj)
  if (!checkout) return

  const checkoutId = checkout.id as string | undefined
  const status = checkout.status as string | undefined
  const paymentIds = (checkout.paymentIds ?? checkout.payment_ids) as string[] | undefined
  if (!checkoutId || !status) return

  if (status === 'COMPLETED') {
    const paymentId = paymentIds?.[0]
    let cardBrand: string | undefined
    let cardLast4: string | undefined
    let tipDollars = 0
    let totalDollars = 0

    if (paymentId) {
      try {
        const client = requireSquareClient()
        const res = await client.payments.get({ paymentId })
        const p = res.payment
        cardBrand = p?.cardDetails?.card?.cardBrand
        cardLast4 = p?.cardDetails?.card?.last4
        tipDollars = fromCents(p?.tipMoney?.amount)
        totalDollars = fromCents(p?.amountMoney?.amount)
      } catch (e) {
        console.error('Square webhook: payments.get failed', e)
      }
    }

    const [txn] = await db
      .select()
      .from(posTransactions)
      .where(eq(posTransactions.squareTerminalCheckoutId, checkoutId))
      .limit(1)

    if (txn) {
      await db
        .update(posTransactions)
        .set({
          squarePaymentId: paymentId ?? null,
          paymentStatus: 'paid',
          paymentMethod: 'card',
          cardBrand: cardBrand ?? null,
          cardLastFour: cardLast4 ?? null,
          tipAmount: tipDollars > 0 ? String(tipDollars.toFixed(2)) : txn.tipAmount,
          total: totalDollars > 0 ? String(totalDollars.toFixed(2)) : txn.total,
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
            squarePaymentId: paymentId ?? null,
            squareTerminalCheckoutId: checkoutId,
            tipAmount: tipDollars > 0 ? String(tipDollars.toFixed(2)) : undefined,
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, txn.appointmentId))
      }
    }
  }

  if (status === 'CANCELED') {
    await db
      .update(posTransactions)
      .set({
        paymentStatus: 'pending',
        squareTerminalCheckoutId: null,
      })
      .where(eq(posTransactions.squareTerminalCheckoutId, checkoutId))
  }
}

async function handleDeviceCodePaired(event: Record<string, unknown>) {
  const data = event.data as Record<string, unknown> | undefined
  const obj = data?.object as Record<string, unknown> | undefined
  const code = (obj?.device_code ?? obj?.deviceCode ?? obj) as Record<string, unknown> | undefined
  const codeId = code?.id as string | undefined
  const deviceId = (code?.device_id ?? code?.deviceId) as string | undefined
  if (!codeId || !deviceId) return

  await db
    .update(squareDevices)
    .set({
      deviceId,
      status: 'paired',
      pairedAt: new Date(),
    })
    .where(eq(squareDevices.deviceCodeId, codeId))
}

async function handlePaymentCreated(event: Record<string, unknown>) {
  const data = event.data as Record<string, unknown> | undefined
  const obj = data?.object as Record<string, unknown> | undefined
  const payment = (obj?.payment ?? obj) as Record<string, unknown> | undefined
  if (!payment) return

  const sourceType = (payment.sourceType ?? payment.source_type) as string | undefined
  const ref = (payment.referenceId ?? payment.reference_id) as string | undefined
  const paymentId = payment.id as string | undefined
  if (sourceType !== 'CASH' || !ref || !paymentId) return

  const [txn] = await db.select().from(posTransactions).where(eq(posTransactions.id, ref)).limit(1)

  await db
    .update(posTransactions)
    .set({
      squarePaymentId: paymentId,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
    })
    .where(eq(posTransactions.id, ref))

  if (txn?.appointmentId) {
    await db
      .update(appointments)
      .set({
        status: 'completed',
        checkedOff: true,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        squarePaymentId: paymentId,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, txn.appointmentId))
  }
}
