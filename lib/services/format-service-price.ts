/** Label shown on pricelist, booking, POS (supports "$45.00 & Up"). */
export function formatServicePriceDisplay(service: {
  price: string | number
  priceDisplayOverride?: string | null
}): string {
  const o = service.priceDisplayOverride?.trim()
  if (o) return o
  const n = Number.parseFloat(String(service.price))
  if (!Number.isFinite(n)) return String(service.price)
  return `$${n.toFixed(2)}`
}

/** Base amount for fees, POS totals, Stripe (uses numeric column). */
export function servicePriceNumeric(service: { price: string | number }): number {
  const n = Number.parseFloat(String(service.price))
  return Number.isFinite(n) ? n : 0
}
