import { NextResponse } from 'next/server'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { requireSquareClient } from '@/lib/square/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_request: Request, context: { params: Promise<{ checkoutId: string }> }) {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  const { checkoutId } = await context.params
  if (!checkoutId) {
    return NextResponse.json({ error: 'Missing checkout id' }, { status: 400 })
  }

  try {
    const client = requireSquareClient()
    await client.terminal.checkouts.cancel({ checkoutId })
    return NextResponse.json({ cancelled: true })
  } catch (e) {
    console.error('square/terminal-checkout cancel', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cancel failed' },
      { status: 500 }
    )
  }
}
