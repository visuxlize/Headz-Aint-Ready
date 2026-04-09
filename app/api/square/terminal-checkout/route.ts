import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GONE = NextResponse.json(
  {
    error: 'Square POS was removed. Use POST /api/squire/checkout with Squire.',
    code: 'square_deprecated',
  },
  { status: 410 }
)

export async function POST() {
  return GONE
}
