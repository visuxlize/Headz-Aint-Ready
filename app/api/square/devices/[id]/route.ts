import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GONE = NextResponse.json(
  {
    error: 'Square device pairing was removed. Configure Squire Terminal in app.getsquire.com.',
    code: 'square_deprecated',
  },
  { status: 410 }
)

export async function GET() {
  return GONE
}

export async function DELETE() {
  return GONE
}
