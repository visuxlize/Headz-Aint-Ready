import type { Metadata } from 'next'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { barbers, services } from '@/lib/db/schema'
import { TicketsPageClient } from '@/components/dashboard/TicketsPageClient'
import {
  barbersForManualTicketPicker,
  type ManualTicketBarberSourceRow,
} from '@/lib/dashboard/manual-ticket-barbers'
import { fetchBarberRowsForManualTicketPicker } from '@/lib/dashboard/ticket-barber-labels-query'
import type { ServiceOption } from '@/lib/dashboard/service-option'

export const metadata: Metadata = {
  title: 'Tickets | Headz Staff',
}

export default async function TicketsPage() {
  let rows: ManualTicketBarberSourceRow[] = []
  try {
    rows = await fetchBarberRowsForManualTicketPicker()
  } catch {
    const basic = await db
      .select({
        id: barbers.id,
        slug: barbers.slug,
        name: barbers.name,
        avatarUrl: barbers.avatarUrl,
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

  /** Tickets-only allowlist + order — does not change marketing, booking, or other admin views. */
  const barbersList = barbersForManualTicketPicker(rows)

  const serviceRows = await db
    .select({
      id: services.id,
      name: services.name,
      price: services.price,
      priceDisplayOverride: services.priceDisplayOverride,
    })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.displayOrder), asc(services.name))

  const servicesList: ServiceOption[] = serviceRows.map((s) => ({
    id: s.id,
    name: s.name,
    price: String(s.price),
    priceDisplayOverride: s.priceDisplayOverride,
  }))

  return (
    <div className="mx-auto max-w-6xl pb-12 pt-2 sm:pt-4">
      <TicketsPageClient barbers={barbersList} services={servicesList} />
    </div>
  )
}
