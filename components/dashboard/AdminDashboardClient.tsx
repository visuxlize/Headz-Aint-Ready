'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AdminOverviewTab } from '@/components/dashboard/AdminOverviewTab'
import { AdminCalendarTab } from '@/components/dashboard/AdminCalendarTab'
import type { ActiveBarberColumn } from '@/lib/dashboard/active-barbers'

export function AdminDashboardClient({
  barbers,
  userId,
}: {
  barbers: ActiveBarberColumn[]
  userId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'overview' | 'calendar'>('overview')

  useEffect(() => {
    const v = searchParams.get('view')
    setTab(v === 'calendar' ? 'calendar' : 'overview')
  }, [searchParams])

  const go = useCallback(
    (t: 'overview' | 'calendar') => {
      router.replace(`/dashboard?view=${t}`)
    },
    [router]
  )

  return (
    <div className={tab === 'calendar' ? 'flex min-h-0 flex-1 flex-col' : ''}>
      <div
        className={`mb-6 flex gap-2 border-b border-black/10 pb-4 ${tab === 'calendar' ? 'shrink-0 px-4 pt-4 sm:px-6' : ''}`}
      >
        <button
          type="button"
          onClick={() => go('overview')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'overview' ? 'bg-headz-red text-white' : 'bg-black/5 text-headz-gray hover:bg-black/10'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => go('calendar')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'calendar' ? 'bg-headz-red text-white' : 'bg-black/5 text-headz-gray hover:bg-black/10'
          }`}
        >
          Calendar
        </button>
      </div>

      {tab === 'overview' ? (
        <div className="bg-[#FAFAF8] min-h-[60vh] -mx-4 px-4 py-6 sm:-mx-6 sm:px-6 rounded-xl">
          <AdminOverviewTab />
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#111111]">
          <AdminCalendarTab barbers={barbers} userId={userId} />
        </div>
      )}
    </div>
  )
}
