import { WebhooksHelper } from 'square'

/**
 * Validates Square webhook signature (must use raw request body string).
 * Set SQUARE_WEBHOOK_NOTIFICATION_URL to the exact URL configured in Square Developer (same as incoming request).
 */
export async function verifySquareWebhookSignature(
  rawBody: string,
  signatureHeader: string
): Promise<boolean> {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL
  if (!key || !notificationUrl) {
    console.error('Square webhook: missing SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_WEBHOOK_NOTIFICATION_URL')
    return false
  }
  return WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader,
    signatureKey: key,
    notificationUrl,
  })
}
