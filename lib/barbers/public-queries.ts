import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import type { MarketingBarberCard } from '@/lib/marketing/home-fallbacks'
import {
  HOMEPAGE_TEAM_ALL_SLUGS,
  buildHomepageTeamCards,
} from '@/lib/marketing/homepage-team'
import { and, asc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm'

/** Postgres undefined_column — or driver message when a migrated column is missing in an older DB. */
function isLikelyMissingColumnError(e: unknown): boolean {
  if (e && typeof e === 'object' && 'code' in e && String((e as { code?: string }).code) === '42703') {
    return true
  }
  const parts: string[] = []
  if (e instanceof Error) {
    parts.push(e.message)
    if (e.cause instanceof Error) parts.push(e.cause.message)
  } else {
    parts.push(String(e))
  }
  const msg = parts.join(' ')
  return /42703|column .* does not exist|undefined column/i.test(msg)
}

/**
 * Marketing homepage team grid — tolerates older DBs that lack newer `barbers` columns
 * (e.g. `show_on_homepage`, `phone`) by retrying with a minimal SELECT.
 */
export async function fetchMarketingBarbersForHomePage(): Promise<MarketingBarberCard[]> {
  const homepageWhere = and(
    barbersForMarketingCondition,
    inArray(barbers.slug, HOMEPAGE_TEAM_ALL_SLUGS)
  )
  try {
    const rows = await db
      .select({ barber: barbers })
      .from(barbers)
      .leftJoin(users, eq(barbers.userId, users.id))
      .where(homepageWhere)
      .orderBy(asc(barbers.sortOrder))
    return buildHomepageTeamCards(
      rows.map((r) => ({
        id: r.barber.id,
        slug: r.barber.slug,
        avatarUrl: r.barber.avatarUrl,
      }))
    )
  } catch (e) {
    if (!isLikelyMissingColumnError(e)) throw e
    const rows = await db
      .select({
        id: barbers.id,
        slug: barbers.slug,
        avatarUrl: barbers.avatarUrl,
      })
      .from(barbers)
      .leftJoin(users, eq(barbers.userId, users.id))
      .where(homepageWhere)
      .orderBy(asc(barbers.sortOrder))
    return buildHomepageTeamCards(rows)
  }
}

/**
 * Active barbers visible on the marketing site (team section).
 * Includes profiles without a linked staff account (e.g. after DB restore) and those with an active linked user.
 */
export const barbersForMarketingCondition = and(
  eq(barbers.isActive, true),
  or(isNull(barbers.userId), eq(users.isActive, true))
)

/** Same as marketing list but excludes staff/test profiles hidden from the public site (admin toggle). */
export const barbersForPublicMarketingCondition = and(
  barbersForMarketingCondition,
  eq(barbers.showOnHomepage, true)
)

/**
 * Barbers who can accept online bookings: must have a linked active staff user.
 */
export const bookableBarbersCondition = and(
  eq(barbers.isActive, true),
  isNotNull(barbers.userId),
  eq(users.isActive, true)
)

/** Bookable barbers shown to customers on /book (excludes internal/test profiles). */
export const barbersForPublicBookingCondition = and(
  bookableBarbersCondition,
  eq(barbers.showOnHomepage, true)
)
