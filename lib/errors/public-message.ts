/**
 * Maps API/network failures to copy safe to show end users (no stack traces, SQL, or raw server output).
 * Log diagnostics on the server or in development tooling instead.
 */

const GENERIC = "Something went wrong. Please try again."

export function publicMessageForHttpStatus(status: number): string {
  switch (status) {
    case 401:
      return 'Your session expired. Please sign in again.'
    case 403:
      return "You don't have permission to do that."
    case 404:
      return "We couldn't find that."
    case 408:
    case 504:
      return 'The request took too long. Please try again.'
    case 429:
      return 'Too many attempts. Please wait a moment and try again.'
    case 503:
      return 'Service is temporarily unavailable. Please try again shortly.'
    default:
      if (status >= 500) {
        return 'Something went wrong on our end. Please try again in a moment.'
      }
      if (status >= 400) {
        return "We couldn't complete that. Check your entries and try again."
      }
      return GENERIC
  }
}

/** Use when a fetch failed (response not ok). Ignores response body text for user display. */
export function publicMessageForFailedResponse(res: Response): string {
  return publicMessageForHttpStatus(res.status)
}

/** Use for caught exceptions (network offline, thrown Error after we sanitized, etc.). */
export function publicMessageFromUnknown(error: unknown): string {
  if (error instanceof TypeError) {
    const m = error.message.toLowerCase()
    if (m.includes('fetch') || m.includes('network') || m.includes('load failed') || m.includes('aborted')) {
      return 'Connection problem. Check your network and try again.'
    }
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 'The request was cancelled. Please try again.'
  }
  return GENERIC
}
