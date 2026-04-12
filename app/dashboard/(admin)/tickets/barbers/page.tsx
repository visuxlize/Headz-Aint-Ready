import type { Metadata } from 'next'
import { TicketBarberLabelsClient } from '@/components/dashboard/TicketBarberLabelsClient'
import { fetchTicketBarberLabelRows } from '@/lib/dashboard/ticket-barber-labels-query'

export const metadata: Metadata = {
  title: 'Barbers | Headz Staff',
}

export default async function TicketBarberLabelsPage() {
  let initial: Awaited<ReturnType<typeof fetchTicketBarberLabelRows>> = []
  let loadError: string | null = null
  try {
    initial = await fetchTicketBarberLabelRows()
  } catch {
    loadError =
      'Could not load barbers. Run scripts/add-barbers-ticket-display-columns.sql in the Supabase SQL editor, then refresh.'
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl pb-12 pt-2 sm:pt-4">
        <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          {loadError}
        </p>
      </div>
    )
  }

  return <TicketBarberLabelsClient initial={initial} />
}
