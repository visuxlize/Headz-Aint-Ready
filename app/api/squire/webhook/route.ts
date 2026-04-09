import { NextResponse } from 'next/server'
import { verifySquireWebhookSignature } from '@/lib/squire/webhook-verify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const sig = request.headers.get('x-squire-signature')

  if (!verifySquireWebhookSignature(rawBody, sig)) {
    console.error('Squire webhook: invalid or missing signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = String(event.type ?? event.event ?? 'unknown')
  console.log('[Squire webhook]', type, event)

  return NextResponse.json({ received: true }, { status: 200 })
}
