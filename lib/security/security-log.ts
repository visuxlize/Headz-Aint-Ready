/**
 * Structured server logs for security-relevant events. Hook to Axiom / Datadog / Sentry in production.
 * Never log secrets, tokens, or full cookies.
 */
export function logSecurityEvent(
  event: 'auth_failure' | 'rate_limit' | 'forbidden' | 'idor_blocked' | 'validation_error',
  detail: Record<string, string | number | boolean | undefined>
) {
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'security',
      event,
      ...detail,
    })
  )
}
