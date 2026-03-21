'use client'

import type { ActiveBarberColumn } from '@/lib/dashboard/active-barbers'
import { cn } from '@/lib/utils/cn'

export function ScheduleBarberStrip({
  barbers,
  selectedProfileId,
  onSelect,
}: {
  barbers: ActiveBarberColumn[]
  selectedProfileId: string | null
  onSelect: (profileId: string) => void
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 pt-1 [scrollbar-width:thin]">
      {barbers.map((b) => {
        const linked = !!b.staffUserId
        const selected = selectedProfileId === b.barberProfileId
        return (
          <button
            key={b.barberProfileId}
            type="button"
            disabled={!linked}
            onClick={() => linked && onSelect(b.barberProfileId)}
            title={!linked ? 'Link this barber to a staff login to set hours' : b.name}
            className={cn(
              'flex min-w-[148px] max-w-[180px] flex-shrink-0 flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-left transition-all',
              selected
                ? 'border-headz-red bg-white shadow-[0_4px_20px_rgba(200,38,38,0.12)] ring-2 ring-headz-red/25'
                : 'border-black/8 bg-white hover:border-black/15 hover:shadow-sm',
              !linked && 'cursor-not-allowed opacity-55'
            )}
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-black/8 bg-gradient-to-br from-headz-cream to-white">
              {b.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-serif text-lg font-bold text-headz-red">
                  {b.initials}
                </span>
              )}
            </div>
            <div className="w-full text-center">
              <p className="truncate text-sm font-semibold text-headz-black">{b.name}</p>
              {!linked && <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">Not linked</p>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
