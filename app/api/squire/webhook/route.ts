import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posTransactions } from '@/lib/db/schema'
import { verifySquireWebhookSignature } from '@/lib/squire/webhook-verify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  if (typeof v === 'string') return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return undefined
}

function moneyToDecimal(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return v.toFixed(2)
  const s = str(v)
  if (!s) return '0.00'
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

/** Dollars from cents or dollars field */
function amountFromPayload(obj: Record<string, unknown>): string {
  const cents = obj.amountCents ?? obj.amount_cents
  if (typeof cents === 'number' && Number.isFinite(cents)) return (cents / 100).toFixed(2)
  const a = obj.amount ?? obj.total ?? obj.totalAmount
  return moneyToDecimal(a)
}

function normalizeMethod(v: unknown): 'card' | 'cash' {
  const s = String(v ?? 'card').toLowerCase()
  if (s === 'cash') return 'cash'
  return 'card'
}

async function upsertFromPaymentPayload(data: Record<string, unknown>) {
  const paymentId =
    str(data.paymentId) ??
    str(data.id) ??
    str(data.squirePaymentId) ??
    str(asRecord(data.payment)?.id)
  if (!paymentId) {
    console.warn('[Squire webhook] payment event missing payment id', data)
    return
  }

  const barberId =
    str(data.barberId) ??
    str(data.barber_id) ??
    str(asRecord(data.barber)?.id) ??
    str(asRecord(data.barber)?.userId)
  if (!barberId || !/^[0-9a-f-]{36}$/i.test(barberId)) {
    console.warn('[Squire webhook] payment event missing barberId', data)
    return
  }

  const customerName =
    str(data.customerName) ??
    str(data.customer_name) ??
    str(asRecord(data.customer)?.name) ??
    'Guest'

  const total = amountFromPayload(data)
  const subtotal = moneyToDecimal(data.subtotal ?? data.subTotal ?? total)
  const tip = moneyToDecimal(data.tipAmount ?? data.tip ?? 0)
  const method = normalizeMethod(data.paymentMethod ?? data.payment_method ?? data.method)

  const [existing] = await db
    .select({ id: posTransactions.id })
    .from(posTransactions)
    .where(eq(posTransactions.squarePaymentId, paymentId))
    .limit(1)

  const row = {
    customerName,
    barberId,
    appointmentId: null,
    serviceId: null,
    items: null,
    subtotal,
    tipAmount: tip,
    total,
    paymentMethod: method,
    paymentStatus: 'paid' as const,
    squarePaymentId: paymentId,
  }

  if (existing) {
    await db.update(posTransactions).set(row).where(eq(posTransactions.id, existing.id))
  } else {
    await db.insert(posTransactions).values(row)
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const sig = request.headers.get('x-squire-signature')

  if (!verifySquireWebhookSignature(rawBody, sig)) {
    console.error('Squire webhook: invalid or missing signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = String(event.type ?? event.event ?? '')

  if (type === 'appointment.no_show') {
    console.log('[Squire webhook] appointment.no_show', event)
    return NextResponse.json({ received: true }, { status: 200 })
  }
  if (type === 'appointment.cancelled') {
    console.log('[Squire webhook] appointment.cancelled', event)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const data =
    asRecord(event.data) ?? asRecord(event.payload) ?? (type.includes('payment') || type.includes('appointment') ? event : null)

  if (type === 'payment.completed' || type === 'appointment.completed') {
    if (data) {
      try {
        await upsertFromPaymentPayload(data)
      } catch (e) {
        console.error('[Squire webhook] persist failed', e)
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
      }
    }
    return NextResponse.json({ received: true }, { status: 200 })
  }

  console.log('[Squire webhook] unhandled type', type)
  return NextResponse.json({ received: true }, { status: 200 })
}
