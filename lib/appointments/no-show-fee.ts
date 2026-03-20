/** No-show fee = 20% of current service price (rounded to cents). */
export function computeNoShowFeeFromServicePrice(price: string | number): string {
  const n = typeof price === 'string' ? parseFloat(price) : price
  if (!Number.isFinite(n) || n < 0) return '0.00'
  const fee = Math.round(n * 100 * 0.2) / 100
  return fee.toFixed(2)
}
