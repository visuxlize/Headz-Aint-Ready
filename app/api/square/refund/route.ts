import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GONE = NextResponse.json(
  {
    error: 'Square refunds were removed. Use POST /api/squire/refund.',
    code: 'square_deprecated',
  },
  { status: 410 }
)

export async function POST() {
  return GONE
}
