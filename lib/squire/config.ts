/** True when Squire Partner API key is present (server-side only). */
export function isSquireConfigured(): boolean {
  return Boolean(process.env.SQUIRE_API_KEY?.trim())
}
