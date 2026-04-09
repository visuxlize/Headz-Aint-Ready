import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GONE = NextResponse.json(
  {
    error: 'Square POS was removed. Use GET /api/squire/checkout/[checkoutId].',
    code: 'square_deprecated',
  },
  { status: 410 }
)

export async function GET() {
  return GONE
}
