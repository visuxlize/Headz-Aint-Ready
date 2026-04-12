import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { barbers } from '@/lib/db/schema'
import {
  orderedManualTicketBarberRows,
  type ManualTicketBarberSourceRow,
} from '@/lib/dashboard/manual-ticket-barbers'
import { isMissingTicketDisplayColumnError } from '@/lib/db/postgres-error'

/** Active barbers for the manual ticket picker (with ticket-UI fallback if columns are missing). */
export async function fetchBarberRowsForManualTicketPicker(): Promise<ManualTicketBarberSourceRow[]> {
  try {
    return await db
      .select({
        id: barbers.id,
        slug: barbers.slug,
        name: barbers.name,
        avatarUrl: barbers.avatarUrl,
        ticketDisplayName: barbers.ticketDisplayName,
        ticketDisplayAvatarUrl: barbers.ticketDisplayAvatarUrl,
      })
      .from(barbers)
      .where(eq(barbers.isActive, true))
      .orderBy(asc(barbers.sortOrder), asc(barbers.name))
  } catch (e) {
    if (!isMissingTicketDisplayColumnError(e)) throw e
    const rows = await db
      .select({
        id: barbers.id,
        slug: barbers.slug,
        name: barbers.name,
        avatarUrl: barbers.avatarUrl,
      })
      .from(barbers)
      .where(eq(barbers.isActive, true))
      .orderBy(asc(barbers.sortOrder), asc(barbers.name))
    return rows.map((r) => ({
      ...r,
      ticketDisplayName: null,
      ticketDisplayAvatarUrl: null,
    }))
  }
}

export type TicketBarberLabelRow = {
  id: string
  slug: string
  marketingName: string
  marketingAvatarUrl: string | null
  ticketDisplayName: string | null
  ticketDisplayAvatarUrl: string | null
}

/** Rows for the Tickets barber label editor + GET API (manual ticket allowlist only). */
export async function fetchTicketBarberLabelRows(): Promise<TicketBarberLabelRow[]> {
  let rows: {
    id: string
    slug: string
    marketingName: string
    marketingAvatarUrl: string | null
    ticketDisplayName: string | null
    ticketDisplayAvatarUrl: string | null
  }[]

  try {
    rows = await db
      .select({
        id: barbers.id,
        slug: barbers.slug,
        marketingName: barbers.name,
        marketingAvatarUrl: barbers.avatarUrl,
        ticketDisplayName: barbers.ticketDisplayName,
        ticketDisplayAvatarUrl: barbers.ticketDisplayAvatarUrl,
      })
      .from(barbers)
      .where(eq(barbers.isActive, true))
      .orderBy(asc(barbers.sortOrder), asc(barbers.name))
  } catch (e) {
    if (!isMissingTicketDisplayColumnError(e)) throw e
    const basic = await db
      .select({
        id: barbers.id,
        slug: barbers.slug,
        marketingName: barbers.name,
        marketingAvatarUrl: barbers.avatarUrl,
      })
      .from(barbers)
      .where(eq(barbers.isActive, true))
      .orderBy(asc(barbers.sortOrder), asc(barbers.name))
    rows = basic.map((r) => ({
      ...r,
      ticketDisplayName: null,
      ticketDisplayAvatarUrl: null,
    }))
  }

  const ordered = orderedManualTicketBarberRows(
    rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.marketingName,
      avatarUrl: r.marketingAvatarUrl,
      ticketDisplayName: r.ticketDisplayName,
      ticketDisplayAvatarUrl: r.ticketDisplayAvatarUrl,
    }))
  )

  return ordered.map((r) => ({
    id: r.id,
    slug: r.slug,
    marketingName: r.name,
    marketingAvatarUrl: r.avatarUrl,
    ticketDisplayName: r.ticketDisplayName,
    ticketDisplayAvatarUrl: r.ticketDisplayAvatarUrl,
  }))
}
