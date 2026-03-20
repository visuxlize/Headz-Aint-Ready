import { NextResponse } from 'next/server'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { getStripe } from '@/lib/stripe/server'
import { z } from 'zod'

const bodySchema = z.object({
  amountCents: z.number().int().min(50).max(99999999),
  currency: z.string().optional().default('usd'),
})

/** Card-present PaymentIntent for Stripe Terminal (collectPaymentMethod → processPayment). */
export async function POST(request: Request) {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 503 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const { amountCents, currency } = parsed.data

  try {
    const stripe = getStripe()
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
    })
    return NextResponse.json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
    })
  } catch (e) {
    console.error('payment-intent', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create PaymentIntent' },
      { status: 500 }
    )
  }
}
