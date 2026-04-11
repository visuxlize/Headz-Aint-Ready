'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, endOfWeek, startOfWeek } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

type ReportsPayload = {
  activeBarbers: number
  summary: {
    totalRevenue: number
    totalAppointments: number
  }
}

type OverviewLite = {
  todaysAppointments: {
    id: string
    customerName: string
    serviceName: string
    time: string
    barberName: string
    status: string
  }[]
}

export function AdminOverviewTab() {
  const [todayRep, setTodayRep] = useState<ReportsPayload | null>(null)
  const [weekRep, setWeekRep] = useState<ReportsPayload | null>(null)
  const [overview, setOverview] = useState<OverviewLite | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const w0 = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const w1 = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    void Promise.all([
      fetch(`/api/dashboard/reports?start=${encodeURIComponent(today)}&end=${encodeURIComponent(today)}`, {
        credentials: 'include',
      }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Reports (today) failed')
        return j as ReportsPayload
      }),
      fetch(`/api/dashboard/reports?start=${encodeURIComponent(w0)}&end=${encodeURIComponent(w1)}`, {
        credentials: 'include',
      }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Reports (week) failed')
        return j as ReportsPayload
      }),
      fetch('/api/dashboard/overview', { credentials: 'include' }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Overview failed')
        return {
          todaysAppointments: (j.todaysAppointments ?? []) as OverviewLite['todaysAppointments'],
        }
      }),
    ])
      .then(([t, w, o]) => {
        setTodayRep(t)
        setWeekRep(w)
        setOverview(o)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  if (err) {
    return <p className="text-headz-red text-sm">{err}</p>
  }
  if (!todayRep || !weekRep || !overview) {
    return (
      <div className="space-y-4">
        <Skeleton variant="line" className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
        <Skeleton variant="chart-bar" />
      </div>
    )
  }

  const appts = overview.todaysAppointments

  return (
    <div className="space-y-8 text-headz-black">
      <div>
        <h1 className="font-serif text-2xl font-bold">Overview</h1>
        <p className="text-headz-gray text-sm mt-1">Key numbers from your local reports (Squire is source of truth for live scheduling).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Today&apos;s revenue</p>
          <p className="mt-2 text-3xl font-bold">${todayRep.summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Today&apos;s appointments</p>
          <p className="mt-2 text-3xl font-bold">{todayRep.summary.totalAppointments}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">This week&apos;s revenue</p>
          <p className="mt-2 text-3xl font-bold">${weekRep.summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Active barbers</p>
          <p className="mt-2 text-3xl font-bold">{todayRep.activeBarbers}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-8 text-center shadow-lg">
        <h2 className="font-serif text-xl font-semibold text-white">Open Squire Dashboard</h2>
        <p className="mt-2 text-sm text-white/60 max-w-lg mx-auto">
          Manage appointments, availability, and scheduling in Squire.
        </p>
        <a
          href="https://app.getsquire.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-headz-red px-8 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-headz-red/25 transition hover:bg-headz-redDark"
        >
          Open Squire <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray mb-3">Quick actions</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://app.getsquire.com/schedule"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-medium text-headz-black shadow-sm hover:bg-black/[0.02]"
          >
            View Schedule in Squire
          </a>
          <a
            href="https://app.getsquire.com/team"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-medium text-headz-black shadow-sm hover:bg-black/[0.02]"
          >
            Manage Staff in Squire
          </a>
          <Link
            href="/dashboard/payments"
            className="inline-flex items-center rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-medium text-headz-black shadow-sm hover:bg-black/[0.02]"
          >
            View Payments
          </Link>
          <Link
            href="/dashboard/settings/staff"
            className="inline-flex items-center rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-medium text-headz-black shadow-sm hover:bg-black/[0.02]"
          >
            Staff Profiles
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Today on the site (mirrored)</h2>
        {appts.length === 0 ? (
          <p className="text-sm text-headz-gray">
            Appointments are managed in Squire. Click &quot;Open Squire Dashboard&quot; to view the live calendar.
          </p>
        ) : (
          <ul className="space-y-3 max-h-80 overflow-y-auto">
            {appts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 text-sm border-b border-black/5 pb-3 last:border-0">
                <div className="w-10 h-10 rounded-full bg-headz-cream flex items-center justify-center text-xs font-bold">
                  {a.customerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{a.customerName}</p>
                  <p className="text-xs text-headz-gray">{a.serviceName}</p>
                </div>
                <span className="text-xs text-headz-gray shrink-0">{String(a.time).slice(0, 5)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
