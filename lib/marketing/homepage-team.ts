import type { MarketingBarberCard } from '@/lib/marketing/home-fallbacks'

/**
 * Public homepage “The Dream Team” grid only — fixed roster and display names.
 * Separate from manual tickets allowlist, /book barbers, and admin seed lists.
 *
 * `slugAliases` are tried in order; first matching `barbers.slug` wins (case-insensitive).
 */
/** Display order for the homepage row (Louie → … → Victor). */
export const HOMEPAGE_TEAM = [
  { displayName: 'Louie Live', slugAliases: ['louie-live'] },
  { displayName: 'King Rome', slugAliases: ['king-rome'] },
  { displayName: 'Jesus', slugAliases: ['jesus-theodoro', 'jesus'] },
  { displayName: 'Liseth', slugAliases: ['liseth-calderon', 'liseth'] },
  { displayName: 'Carlos', slugAliases: ['carlos-principal', 'carlos'] },
  { displayName: 'Angel', slugAliases: ['angle-miranda', 'angel'] },
  { displayName: 'Victor', slugAliases: ['victor-zambrano', 'victor'] },
] as const

export const HOMEPAGE_TEAM_ALL_SLUGS: string[] = [
  ...new Set(HOMEPAGE_TEAM.flatMap((t) => [...t.slugAliases])),
]

export function buildHomepageTeamCards(
  rows: { id: string; slug: string | null; avatarUrl: string | null }[]
): MarketingBarberCard[] {
  const slugToRow = new Map<string, { id: string; avatarUrl: string | null }>()
  for (const r of rows) {
    const k = (r.slug ?? '').trim().toLowerCase()
    if (k && !slugToRow.has(k)) slugToRow.set(k, { id: r.id, avatarUrl: r.avatarUrl })
  }

  const out: MarketingBarberCard[] = []
  for (const { displayName, slugAliases } of HOMEPAGE_TEAM) {
    for (const alias of slugAliases) {
      const row = slugToRow.get(alias.toLowerCase())
      if (row) {
        out.push({ id: row.id, name: displayName, avatarUrl: row.avatarUrl })
        break
      }
    }
  }
  return out
}
