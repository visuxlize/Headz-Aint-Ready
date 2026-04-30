/**
 * Manual **Tickets** page barber picker only — slugs must match `barbers.slug` rows.
 * Does not affect marketing, /book, staff, POS, or other dashboards.
 */
import type { BarberOption } from '@/lib/dashboard/barber-option'

export const MANUAL_TICKET_BARBER_SLUGS = [
  'victor-zambrano',
  'matthew-mirabella',
  'luis-benites',
  'liseth-calderon',
  'jesus-theodoro',
  'jerome-glenn',
  'david-fernandez',
  'carlos-principal',
  'angle-miranda',
] as const

const MANUAL_SLUG_SET = new Set(
  (MANUAL_TICKET_BARBER_SLUGS as readonly string[]).map((s) => s.toLowerCase())
)

/** Whether this marketing slug is allowed on the manual Tickets picker / barber label editor. */
export function isSlugInManualTicketAllowlist(slug: string): boolean {
  return MANUAL_SLUG_SET.has(slug.trim().toLowerCase())
}

/** DB row shape for {@link barbersForManualTicketPicker} (marketing `name` / `avatar_url` + optional ticket-only overrides). */
export type ManualTicketBarberSourceRow = {
  id: string
  slug: string
  name: string
  avatarUrl: string | null
  ticketDisplayName: string | null
  ticketDisplayAvatarUrl: string | null
}

/** First DB row per allowlist slug, in {@link MANUAL_TICKET_BARBER_SLUGS} order (for admin label editor). */
export function orderedManualTicketBarberRows(rows: ManualTicketBarberSourceRow[]): ManualTicketBarberSourceRow[] {
  const bySlugLower = new Map<string, ManualTicketBarberSourceRow>()
  for (const r of rows) {
    const k = r.slug.trim().toLowerCase()
    if (!bySlugLower.has(k)) bySlugLower.set(k, r)
  }
  const out: ManualTicketBarberSourceRow[] = []
  for (const slug of MANUAL_TICKET_BARBER_SLUGS) {
    const row = bySlugLower.get(slug)
    if (row) out.push(row)
  }
  return out
}

/** Build picker options: only allowlisted slugs, canonical order, first DB row per slug. */
export function barbersForManualTicketPicker(rows: ManualTicketBarberSourceRow[]): BarberOption[] {
  return orderedManualTicketBarberRows(rows).map((row) => {
    const name = (row.ticketDisplayName?.trim() || row.name).trim()
    const avatarUrl = row.ticketDisplayAvatarUrl?.trim() || row.avatarUrl
    return {
      id: row.id,
      name,
      avatarUrl: avatarUrl || null,
    }
  })
}
