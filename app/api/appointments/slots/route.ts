import { NextResponse } from 'next/server'

/**
 * Slot availability was previously computed from local barber hours.
 * Booking is now exclusively via Squire — use the public /book embed or the Squire dashboard.
 */
export async function GET() {
  return NextResponse.json({ error: 'Slot availability is now managed by Squire.' }, { status: 410 })
}
