import { barbers, users } from '@/lib/db/schema'
import { and, eq, isNotNull, isNull, or } from 'drizzle-orm'

/**
 * Active barbers visible on the marketing site (team section).
 * Includes profiles without a linked staff account (e.g. after DB restore) and those with an active linked user.
 */
export const barbersForMarketingCondition = and(
  eq(barbers.isActive, true),
  or(isNull(barbers.userId), eq(users.isActive, true))
)

/**
 * Barbers who can accept online bookings: must have a linked active staff user.
 */
export const bookableBarbersCondition = and(
  eq(barbers.isActive, true),
  isNotNull(barbers.userId),
  eq(users.isActive, true)
)
