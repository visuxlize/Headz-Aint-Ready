/**
 * Nightly job: mark past pending appointments (not checked off) as no_show with 20% fee.
 * Schedule: hourly UTC in netlify.toml; we only run when local America/New_York is 23:59
 * (single invocation per day matches 11:59 PM Eastern through DST).
 *
 * Requires DATABASE_URL (Postgres connection string). Direct DB bypasses RLS.
 */
import type { Handler } from '@netlify/functions'
import { isAmericaNewYork2359 } from '../../lib/no-show/is-america-new-york-2359'
import { processNoShows } from '../../lib/no-show/process-no-shows'

export const handler: Handler = async () => {
  try {
    if (!isAmericaNewYork2359()) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, skipped: true, reason: 'not_america_new_york_2359' }),
      }
    }
    if (!process.env.DATABASE_URL) {
      console.error('[no-show-checker] DATABASE_URL is not set')
      return { statusCode: 500, body: JSON.stringify({ error: 'DATABASE_URL missing' }) }
    }
    const { flagged } = await processNoShows()
    console.log(`[no-show-checker] completed, flagged=${flagged}`)
    return { statusCode: 200, body: JSON.stringify({ ok: true, flagged }) }
  } catch (e) {
    console.error('[no-show-checker]', e)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
    }
  }
}
