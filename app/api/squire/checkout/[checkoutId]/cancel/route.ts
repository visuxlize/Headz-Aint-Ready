import { NextResponse } from 'next/server'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { squireFetch } from '@/lib/squire/client'

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
    const res = await squireFetch(`/terminal/checkout/${encodeURIComponent(checkoutId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      console.error('Squire cancel checkout', res.status, data)
      return NextResponse.json(
        { error: (data.message as string) || (data.error as string) || 'Cancel failed' },
        { status: 502 }
      )
    }
    return NextResponse.json(data)
  } catch (e) {
    console.error('squire/checkout cancel', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cancel failed' },
      { status: 500 }
    )
  }
}
