/**
 * Published fallbacks for the public homepage when the DB is unreachable or not yet seeded.
 * Keeps "The Dream Team" and "Price list" visually populated — same content sources as
 * `scripts/seed-headz-barbers.mjs` and `lib/services/default-headz-services.json`.
 * Live DB data always wins when available.
 */
import defaultServices from '@/lib/services/default-headz-services.json'
import type { DefaultServiceSeed } from '@/lib/services/default-price-list'

/** Minimal barber shape for the marketing team grid (matches what the homepage renders). */
export type MarketingBarberCard = {
  id: string
  name: string
  avatarUrl: string | null
}

/** Same `/public/marketing-team/` assets as `homepage-team.ts` when DB is unavailable. */
const FALLBACK_TEAM: MarketingBarberCard[] = [
  { id: 'fallback-homepage-0', name: 'Louie Live', avatarUrl: '/marketing-team/Luis.png' },
  { id: 'fallback-homepage-1', name: 'King Rome', avatarUrl: '/marketing-team/Rome.png' },
  { id: 'fallback-homepage-2', name: 'Jesus', avatarUrl: '/marketing-team/Jesus.png' },
  { id: 'fallback-homepage-3', name: 'Liseth', avatarUrl: '/marketing-team/Liseth.png' },
  { id: 'fallback-homepage-4', name: 'Carlos', avatarUrl: '/marketing-team/Carlos.png' },
  { id: 'fallback-homepage-5', name: 'Angel', avatarUrl: '/marketing-team/Angel.png' },
  { id: 'fallback-homepage-6', name: 'Victor', avatarUrl: '/marketing-team/Victor.png' },
]

export type MarketingPriceRow = {
  id: string
  name: string
  description: string | null
  price: string
  priceDisplayOverride: string | null
  durationMinutes: number
}

export function getPublishedFallbackTeam(): MarketingBarberCard[] {
  return FALLBACK_TEAM
}

export function getPublishedFallbackPrices(): MarketingPriceRow[] {
  const sorted = [...(defaultServices as DefaultServiceSeed[])].sort((a, b) => a.displayOrder - b.displayOrder)
  return sorted.map((row) => ({
    id: `fallback-svc-${row.slug}`,
    name: row.name,
    description: row.description,
    price: row.price,
    priceDisplayOverride: row.priceDisplayOverride,
    durationMinutes: row.durationMinutes,
  }))
}
