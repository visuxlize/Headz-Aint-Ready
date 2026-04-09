import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GONE = NextResponse.json(
  {
    error: 'Square webhooks were removed. Point Getsquire webhooks to /api/squire/webhook.',
    code: 'square_deprecated',
  },
  { status: 410 }
)

export async function POST() {
  return GONE
}
