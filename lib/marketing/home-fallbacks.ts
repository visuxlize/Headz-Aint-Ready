/**
 * Published fallbacks for the public homepage when the DB is unreachable or not yet seeded.
 * Keeps "The Dream Team" and "Price list" visually populated — same content sources as
 * `scripts/seed-headz-barbers.mjs` and `lib/services/default-headz-services.json`.
 * Live DB data always wins when available.
 */
import defaultServices from '@/lib/services/default-headz-services.json'

/** Minimal barber shape for the marketing team grid (matches what the homepage renders). */
export type MarketingBarberCard = {
  id: string
  name: string
  avatarUrl: string | null
}

const FALLBACK_TEAM: MarketingBarberCard[] = [
  {
    id: 'fallback-barber-louie-live',
    name: 'Louie Live',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/LOUIELIVE.jpg',
  },
  {
    id: 'fallback-barber-johan',
    name: 'Johan',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2025/04/JOHAN.jpg',
  },
  {
    id: 'fallback-barber-king-rome',
    name: 'King Rome',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/ROME-1.jpg',
  },
  {
    id: 'fallback-barber-jesus',
    name: 'Jesus',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/JESUS.jpg',
  },
  {
    id: 'fallback-barber-angel',
    name: 'Angel',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/ANGEL.jpg',
  },
  {
    id: 'fallback-barber-victor',
    name: 'Victor',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/VICTOR.jpg',
  },
  {
    id: 'fallback-barber-liseth',
    name: 'Liseth',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2025/04/Liseth.jpg',
  },
  {
    id: 'fallback-barber-carlos',
    name: 'Carlos',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/CARLOS.jpg',
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
  return (defaultServices as Array<Record<string, unknown>>).map((row, i) => ({
    id: `fallback-svc-${String(row.slug ?? i)}`,
    name: String(row.name ?? ''),
    description: row.description != null ? String(row.description) : null,
    price: String(row.price ?? '0'),
    priceDisplayOverride: row.priceDisplayOverride != null ? String(row.priceDisplayOverride) : null,
    durationMinutes: Number(row.durationMinutes ?? 30),
  }))
}
