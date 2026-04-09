import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GONE = NextResponse.json(
  {
    error: 'Square cash recording was removed. Use POST /api/squire/record-cash.',
    code: 'square_deprecated',
  },
  { status: 410 }
)

export async function POST() {
  return GONE
}
