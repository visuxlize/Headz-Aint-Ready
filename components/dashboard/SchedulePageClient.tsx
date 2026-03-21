'use client'

import { useMemo, useState } from 'react'
import { AdminCalendarTab } from '@/components/dashboard/AdminCalendarTab'
import { ScheduleBarberStrip } from '@/components/dashboard/ScheduleBarberStrip'
import { WeeklyAvailabilityEditor } from '@/components/dashboard/WeeklyAvailabilityEditor'
import type { ActiveBarberColumn } from '@/lib/dashboard/active-barbers'

export function SchedulePageClient({
  barbers,
  userId,
}: {
  barbers: ActiveBarberColumn[]
  userId: string
}) {
  const [tab, setTab] = useState<'hours' | 'calendar'>('hours')

  const linked = useMemo(() => barbers.filter((b) => b.staffUserId), [barbers])

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => {
    const first = linked[0]
    return first?.barberProfileId ?? null
  })

  const selectedBarber = useMemo(
    () => barbers.find((b) => b.barberProfileId === selectedProfileId),
    [barbers, selectedProfileId]
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-black/10 bg-[#FAFAF8] px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold text-headz-black sm:text-2xl">Schedule</h1>
            <p className="text-sm text-headz-gray">Team calendar and weekly availability (within shop hours).</p>
          </div>
          <div className="flex rounded-xl border border-black/10 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setTab('hours')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === 'hours' ? 'bg-headz-black text-white' : 'text-headz-gray hover:bg-black/5'
              }`}
            >
              Working hours
            </button>
            <button
              type="button"
              onClick={() => setTab('calendar')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === 'calendar' ? 'bg-headz-black text-white' : 'text-headz-gray hover:bg-black/5'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {tab === 'hours' ? (
        <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAF8] px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-headz-gray">Team</h2>
              <ScheduleBarberStrip
                barbers={barbers}
                selectedProfileId={selectedProfileId}
                onSelect={setSelectedProfileId}
              />
            </section>
            <section>
              {selectedBarber?.staffUserId ? (
                <WeeklyAvailabilityEditor
                  scope="admin"
                  barberProfileId={selectedBarber.barberProfileId}
                  barberName={selectedBarber.name}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-headz-gray shadow-sm">
                  {linked.length === 0
                    ? 'No barbers are linked to staff accounts yet. Link a roster profile to a login before setting hours.'
                    : 'Select a linked barber above to edit their weekly hours.'}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#111111]">
          <AdminCalendarTab barbers={barbers} userId={userId} />
        </div>
      )}
    </div>
  )
}
