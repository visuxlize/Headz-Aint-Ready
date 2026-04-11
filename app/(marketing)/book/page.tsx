import { BookingPageClient } from '@/components/booking/BookingPageClient'
import type { BookingBarber, BookingService } from '@/components/booking/NativeBookingFlow'
import { barbersForPublicBookingCondition } from '@/lib/barbers/public-queries'
import { db } from '@/lib/db'
import { barbers, services, users } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: "Book | Headz Ain't Ready",
  description: "Book your haircut at Headz Ain't Ready Barbershop, Jackson Heights Queens.",
}

export default async function BookPage() {
  const [barberRows, serviceRows] = await Promise.allSettled([
    db
      .select({ barber: barbers })
      .from(barbers)
      .innerJoin(users, eq(barbers.userId, users.id))
      .where(barbersForPublicBookingCondition)
      .orderBy(asc(barbers.sortOrder))
      .then((rows): BookingBarber[] =>
        rows.map((r) => ({
          id: r.barber.id,
          name: r.barber.name,
          avatarUrl: r.barber.avatarUrl ?? null,
        }))
      ),
    db
      .select({
        id: services.id,
        name: services.name,
        price: services.price,
        priceDisplayOverride: services.priceDisplayOverride,
        durationMinutes: services.durationMinutes,
      })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.displayOrder))
      .then((rows): BookingService[] =>
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          price: String(r.price),
          priceDisplayOverride: r.priceDisplayOverride ?? null,
          durationMinutes: r.durationMinutes,
        }))
      ),
  ])

  const barberList: BookingBarber[] = barberRows.status === 'fulfilled' ? barberRows.value : []
  const serviceList: BookingService[] = serviceRows.status === 'fulfilled' ? serviceRows.value : []

  return (
    <div className="min-h-screen bg-headz-black">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-headz-black/95 px-4 py-4 text-center backdrop-blur-sm">
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.25em] text-headz-red">
          Jackson Heights, Queens · NYC
        </p>
        <h1 className="font-headz-display text-xl text-white sm:text-2xl">Book Your Cut</h1>
      </div>
      <div className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <BookingPageClient services={serviceList} barbers={barberList} />
        </div>
      </div>
    </div>
  )
}
