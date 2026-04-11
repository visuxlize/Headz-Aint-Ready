import type { Metadata } from 'next'
import { and, asc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { TicketsPageClient } from '@/components/dashboard/TicketsPageClient'
import type { BarberOption } from '@/lib/dashboard/barber-option'

export const metadata: Metadata = {
  title: 'Tickets | Headz Staff',
}

export default async function TicketsPage() {
  const rows = await db
    .select({ barber: barbers, user: users })
    .from(barbers)
    .innerJoin(users, eq(barbers.userId, users.id))
    .where(
      and(
        eq(barbers.isActive, true),
        eq(users.isActive, true),
        eq(users.role, 'barber'),
        isNotNull(barbers.userId)
      )
    )
    .orderBy(asc(barbers.sortOrder))

  const barbersList: BarberOption[] = rows.map(({ barber: b, user: u }) => ({
    id: u.id,
    name: (b.name ?? u.fullName ?? u.email ?? 'Barber').trim(),
    avatarUrl: b.avatarUrl ?? u.avatarUrl ?? null,
  }))

  return (
    <div className="mx-auto max-w-6xl pb-12 pt-2 sm:pt-4">
      <TicketsPageClient barbers={barbersList} />
    </div>
  )
}
