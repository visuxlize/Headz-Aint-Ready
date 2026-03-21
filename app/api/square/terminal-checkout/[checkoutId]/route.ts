import { NextResponse } from 'next/server'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { requireSquareClient } from '@/lib/square/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ checkoutId: string }> }) {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  const { checkoutId } = await context.params
  if (!checkoutId) {
    return NextResponse.json({ error: 'Missing checkout id' }, { status: 400 })
  }

  try {
    const client = requireSquareClient()
    const res = await client.terminal.checkouts.get({ checkoutId })
    const c = res.checkout
    return NextResponse.json({
      status: c?.status ?? 'UNKNOWN',
      paymentIds: c?.paymentIds ?? [],
    })
  } catch (e) {
    console.error('square/terminal-checkout get', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get checkout' },
      { status: 500 }
    )
  }
}
