import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies `x-squire-signature` using HMAC-SHA256 of the raw body with `SQUIRE_WEBHOOK_SECRET`.
 * Adjust if Getsquire documents a different scheme.
 */
export function verifySquireWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.SQUIRE_WEBHOOK_SECRET?.trim()
  if (!secret) return false
  if (!signatureHeader?.trim()) return false

  const expectedHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const sig = signatureHeader.trim()
  const normalized = sig.startsWith('sha256=') ? sig.slice(7) : sig

  try {
    const a = Buffer.from(expectedHex, 'utf8')
    const b = Buffer.from(normalized, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
