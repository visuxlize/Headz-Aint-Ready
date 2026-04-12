import { NextResponse } from 'next/server'
import { isAmericaNewYork2359 } from '@/lib/no-show/is-america-new-york-2359'
import { processNoShows } from '@/lib/no-show/process-no-shows'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Vercel Cron Job — runs every hour (schedule defined in vercel.json).
 * Only processes no-shows when America/New_York time is 23:59.
 *
 * Vercel passes Authorization: Bearer <CRON_SECRET> on every invocation.
 * Set CRON_SECRET in Vercel environment variables (any long random string).
 */
export async function GET(request: Request) {
  // Verify the request came from Vercel Cron (not a random public caller)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!isAmericaNewYork2359()) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'not_america_new_york_2359' })
    }

    if (!process.env.DATABASE_URL) {
      console.error('[no-show-checker] DATABASE_URL is not set')
      return NextResponse.json({ error: 'DATABASE_URL missing' }, { status: 500 })
    }

    const { flagged } = await processNoShows()
    console.log(`[no-show-checker] completed, flagged=${flagged}`)
    return NextResponse.json({ ok: true, flagged })
  } catch (e) {
    console.error('[no-show-checker]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
