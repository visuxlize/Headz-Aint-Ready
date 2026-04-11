'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/Skeleton'

type ApptRow = {
  id: string
  customerName: string
  serviceName: string
  timeSlot: string
  status: string
}

export function BarberDashboardClient({
  barberColumn,
  displayName,
}: {
  barberColumn: { id: string; name: string; initials: string; avatarUrl: string | null }
  displayName: string
}) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ApptRow[]>([])

  const today = format(new Date(), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/barber/appointments?date=${encodeURIComponent(today)}`, {
        credentials: 'include',
      })
      const j = (await res.json()) as { data?: ApptRow[] }
      if (!res.ok) throw new Error('Could not load appointments')
      setRows(j.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-headz-red/20 bg-headz-cream relative">
            {barberColumn.avatarUrl ? (
              <Image src={barberColumn.avatarUrl} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-headz-red text-xl font-bold">
                {barberColumn.initials}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-serif text-2xl text-headz-black">Hi, {displayName}</h1>
            <p className="text-headz-gray text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-headz-black mb-3">Today&apos;s schedule</h2>
        {loading ? (
          <Skeleton variant="card" className="h-40" />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-headz-gray text-sm">
              No mirrored appointments for today in this system. Your live schedule is in Squire.
            </p>
            <a
              href="https://app.getsquire.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-headz-red px-5 py-2.5 text-sm font-bold text-white hover:bg-headz-redDark"
            >
              Open My Schedule <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        ) : (
          <ul className="space-y-3 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-b border-black/5 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-headz-black">{a.customerName}</p>
                  <p className="text-sm text-headz-gray">{a.serviceName}</p>
                </div>
                <span className="text-sm text-headz-gray shrink-0">{String(a.timeSlot).slice(0, 5)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray mb-3">Quick actions</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://app.getsquire.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-headz-red px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-headz-redDark"
          >
            Open Squire
          </a>
          <Link
            href="/dashboard/barber/pos"
            className="inline-flex items-center justify-center rounded-xl bg-[#111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black/90"
          >
            Charge Customer
          </Link>
          <Link
            href="/dashboard/barber/profile"
            className="inline-flex items-center justify-center rounded-xl border-2 border-headz-red/40 px-5 py-2.5 text-sm font-semibold text-headz-red hover:bg-headz-red/5"
          >
            My Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
