import type { MarketingBarberCard } from '@/lib/marketing/home-fallbacks'

/**
 * Public homepage “The Dream Team” grid only — fixed roster and display names.
 * Avatar art is served from `/public/marketing-team/` (see `image` paths).
 *
 * `slugAliases` are tried in order; first matching `barbers.slug` wins (case-insensitive).
 */
/** Display order for the homepage row (Louie → … → Victor). */
export const HOMEPAGE_TEAM = [
  {
    displayName: 'Louie Live',
    slugAliases: ['louie-live'],
    image: '/marketing-team/Luis.png',
  },
  {
    displayName: 'King Rome',
    slugAliases: ['king-rome'],
    image: '/marketing-team/Rome.png',
  },
  {
    displayName: 'Jesus',
    slugAliases: ['jesus-theodoro', 'jesus'],
    image: '/marketing-team/Jesus.png',
  },
  {
    displayName: 'Liseth',
    slugAliases: ['liseth-calderon', 'liseth'],
    image: '/marketing-team/Liseth.png',
  },
  {
    displayName: 'Carlos',
    slugAliases: ['carlos-principal', 'carlos'],
    image: '/marketing-team/Carlos-2026.png',
  },
  {
    displayName: 'Angel',
    slugAliases: ['angle-miranda', 'angel'],
    image: '/marketing-team/Angel.png',
  },
  {
    displayName: 'Victor',
    slugAliases: ['victor-zambrano', 'victor'],
    image: '/marketing-team/Victor.png',
  },
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
  for (const { displayName, slugAliases, image } of HOMEPAGE_TEAM) {
    for (const alias of slugAliases) {
      const row = slugToRow.get(alias.toLowerCase())
      if (row) {
        out.push({ id: row.id, name: displayName, avatarUrl: image })
        break
      }
    }
  }
  return out
}
