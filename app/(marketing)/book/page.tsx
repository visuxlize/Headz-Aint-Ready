import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { barbers, services } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { BookingFlow } from '@/components/booking/BookingFlow'

export const metadata = {
  title: 'Book | Headz Ain\'t Ready',
  description: 'Book your haircut at Headz Ain\'t Ready, Jackson Heights.',
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const [barbersList, servicesList] = await Promise.all([
    db.select().from(barbers).where(eq(barbers.isActive, true)),
    db.select().from(services).where(eq(services.isActive, true)),
  ])
  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Book your cut</h1>
        <p className="text-headz-gray mb-8">
          Pick a service, your barber, and a time. We&apos;ll hold your slot.
        </p>
        <BookingFlow
          barbers={barbersList}
          services={servicesList}
          defaultCategory={category ?? undefined}
        />
      </div>
    </div>
  )
}
