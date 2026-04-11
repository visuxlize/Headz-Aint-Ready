'use client'

import { useState } from 'react'
import { NativeBookingFlow } from './NativeBookingFlow'
import { SquireWidgetEmbed } from './SquireWidgetEmbed'
import type { BookingBarber, BookingService } from './NativeBookingFlow'

export function BookingPageClient({
  services,
  barbers,
}: {
  services: BookingService[]
  barbers: BookingBarber[]
}) {
  const [mode, setMode] = useState<'widget' | 'native'>('widget')
  return (
    <>
      {mode === 'widget' ? (
        <SquireWidgetEmbed onFailed={() => setMode('native')} />
      ) : (
        <NativeBookingFlow services={services} barbers={barbers} />
      )}
      <div className="px-6 pb-5 text-center">
        {mode === 'widget' ? (
          <button
            type="button"
            onClick={() => setMode('native')}
            className="text-xs text-headz-gray/50 underline underline-offset-2 transition hover:text-headz-gray"
          >
            Having trouble? Switch to simple booking mode
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMode('widget')}
            className="text-xs text-headz-gray/50 underline underline-offset-2 transition hover:text-headz-gray"
          >
            Switch back to full booking experience
          </button>
        )}
      </div>
    </>
  )
}
