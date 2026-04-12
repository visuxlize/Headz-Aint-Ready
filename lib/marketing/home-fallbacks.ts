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

/** Matches `lib/marketing/homepage-team.ts` — legacy WP assets when DB is unavailable. */
const FALLBACK_TEAM: MarketingBarberCard[] = [
  {
    id: 'fallback-homepage-louie-live',
    name: 'Louie Live',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/LOUIELIVE.jpg',
  },
  { id: 'fallback-homepage-king-rome', name: 'King Rome', avatarUrl: null },
  {
    id: 'fallback-homepage-jesus',
    name: 'Jesus',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/JESUS.jpg',
  },
  {
    id: 'fallback-homepage-liseth',
    name: 'Liseth',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2025/04/Liseth.jpg',
  },
  {
    id: 'fallback-homepage-carlos',
    name: 'Carlos',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/CARLOS.jpg',
  },
  {
    id: 'fallback-homepage-angel',
    name: 'Angel',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/ANGEL.jpg',
  },
  {
    id: 'fallback-homepage-victor',
    name: 'Victor',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/VICTOR.jpg',
  },
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
