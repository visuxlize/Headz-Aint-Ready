import { db } from '@/lib/db'
import { barbers, services } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { BookingFlow } from '@/components/booking/BookingFlow'
import type { Barber, Service } from '@/lib/db/schema'

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
  let barbersList: Barber[] = []
  let servicesList: Service[] = []
  let backendUnavailable = false
  try {
    const [b, s] = await Promise.all([
      db.select().from(barbers).where(eq(barbers.isActive, true)),
      db.select().from(services).where(eq(services.isActive, true)),
    ])
    barbersList = b
    servicesList = s
  } catch (err) {
    console.error('BookPage: could not load barbers/services', err)
    backendUnavailable = true
  }
  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Book your cut</h1>
        <p className="text-headz-gray mb-8">
          Pick a service, your barber, and a time. We&apos;ll hold your slot.
        </p>
        {backendUnavailable && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <p className="font-medium">Booking is temporarily unavailable</p>
            <p className="mt-1">Please call <a href="tel:+17184296841" className="text-headz-red font-medium underline">(718) 429-6841</a> to book, or try again in a few minutes.</p>
          </div>
        )}
        <BookingFlow
          barbers={barbersList}
          services={servicesList}
          defaultCategory={category ?? undefined}
        />
      </div>
    </div>
  )
}
