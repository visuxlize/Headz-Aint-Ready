import { NextResponse } from 'next/server'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { getStripe } from '@/lib/stripe/server'

/** Stripe Terminal connection token (browser SDK). */
export async function POST() {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  const locationId = process.env.STRIPE_TERMINAL_LOCATION_ID
  if (!process.env.STRIPE_SECRET_KEY || !locationId) {
    return NextResponse.json(
      { error: 'Stripe Terminal is not configured (STRIPE_SECRET_KEY, STRIPE_TERMINAL_LOCATION_ID)' },
      { status: 503 }
    )
  }

  try {
    const stripe = getStripe()
    const token = await stripe.terminal.connectionTokens.create({
      location: locationId,
    })
    return NextResponse.json({ secret: token.secret })
  } catch (e) {
    console.error('connection-token', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create connection token' },
      { status: 500 }
    )
  }
}
