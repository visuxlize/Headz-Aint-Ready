/** Homepage price list — duration label and fallback copy when DB has no description. */

export function formatServiceDurationLabel(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    return minutes === 60 ? '1 hr' : `${minutes / 60} hr`
  }
  if (minutes > 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h} hr ${m} min` : `${h} hr`
  }
  return `${minutes} min`
}

export function marketingServiceDescription(row: { name: string; description: string | null }): string {
  const t = row.description?.trim()
  if (t) return t
  return `${row.name} — legendary chair work in Jackson Heights. We line it up for your texture and style so you leave ready for Queens.`
}
