import { NextResponse } from 'next/server'

type Bucket = { count: number; resetAt: number }

/** In-memory sliding window (resets per deploy / instance). For multi-region production, use Redis (e.g. Upstash). */
const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 50_000

function pruneIfNeeded() {
  if (buckets.size <= MAX_BUCKETS) return
  const now = Date.now()
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k)
    if (buckets.size <= MAX_BUCKETS * 0.8) break
  }
}

export function clientKeyFromRequest(request: Request, userId: string | null): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  return userId ? `u:${userId}` : `ip:${ip}`
}

/**
 * @returns null if allowed, or 429 NextResponse
 */
export function rateLimitResponse(
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  pruneIfNeeded()
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs }
    buckets.set(key, b)
  }
  b.count += 1
  if (b.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000))
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }
  return null
}

/** Booking POST: limit abuse without accounts */
export const BOOKING_POST_LIMIT = 40
export const BOOKING_POST_WINDOW_MS = 60 * 60 * 1000

/** Authenticated API burst */
export const API_BURST_LIMIT = 300
export const API_BURST_WINDOW_MS = 60 * 1000
