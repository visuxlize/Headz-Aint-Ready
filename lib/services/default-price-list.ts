/**
 * Canonical Headz pricelist — matches Feb 2026 marketing (`PRICE_LIST` in commit 671a5b8).
 * Source: `default-headz-services.json` (same data as `npm run restore:services`).
 */
import raw from './default-headz-services.json'

export type DefaultServiceSeed = {
  name: string
  slug: string
  description: string | null
  durationMinutes: number
  price: string
  priceDisplayOverride: string | null
  category: string
  displayOrder: number
}

export const DEFAULT_HEADZ_SERVICES = raw as readonly DefaultServiceSeed[]
