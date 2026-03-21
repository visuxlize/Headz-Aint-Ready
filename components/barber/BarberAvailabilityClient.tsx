'use client'

import { WeeklyAvailabilityEditor } from '@/components/dashboard/WeeklyAvailabilityEditor'

export function BarberAvailabilityClient() {
  return (
    <div className="w-full max-w-none space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-headz-black">Availability</h1>
        <p className="mt-1 text-sm text-headz-gray">
          Set N/A, full shop hours (Open), or custom shifts. Changes apply to booking and the dashboard calendar.
        </p>
      </div>
      <WeeklyAvailabilityEditor scope="barber" />
    </div>
  )
}
