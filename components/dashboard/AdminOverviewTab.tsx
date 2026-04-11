'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import {
  Banknote,
  CreditCard,
  DollarSign,
  ExternalLink,
  ReceiptText,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAnimatedCounter } from '@/lib/hooks/useAnimatedCounter'
import { formatMoney } from '@/lib/utils/format-money'
import { cn } from '@/lib/utils/cn'
import { NY_TZ } from '@/lib/date/ny-bounds'

type OverviewApi = {
  activeBarbers?: number
  todaysAppointments: unknown[]
}

type TicketsApi = {
  tickets: Array<{
    id: string
    customerName: string
    barberName: string
    paymentMethod: string
    total: number
    tipAmount: number
    createdAt: string
  }>
  totals: {
    cash: number
    card: number
    count: number
    byBarber: Array<{ barberId: string; barberName: string; cash: number; card: number; tickets: number; total: number }>
  }
}

type ReportsTodayApi = {
  combinedRevenue: number
}

export function AdminOverviewTab() {
  const [overview, setOverview] = useState<OverviewApi | null>(null)
  const [ticketsData, setTicketsData] = useState<TicketsApi | null>(null)
  const [reportsToday, setReportsToday] = useState<ReportsTodayApi | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setErr(null)
    const todayNy = format(toZonedTime(new Date(), NY_TZ), 'yyyy-MM-dd')
    void Promise.all([
      fetch('/api/dashboard/overview', { credentials: 'include' }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Overview failed')
        return j as OverviewApi
      }),
      fetch('/api/dashboard/tickets', { credentials: 'include' }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Tickets failed')
        return j as TicketsApi
      }),
      fetch(
        `/api/dashboard/reports?start=${encodeURIComponent(todayNy)}&end=${encodeURIComponent(todayNy)}`,
        { credentials: 'include' }
      ).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Reports failed')
        return j as ReportsTodayApi
      }),
    ])
      .then(([o, t, rep]) => {
        setOverview(o)
        setTicketsData(t)
        setReportsToday(rep)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const cash = useAnimatedCounter(ticketsData?.totals.cash ?? 0, 600)
  const card = useAnimatedCounter(ticketsData?.totals.card ?? 0, 600)
  const tickCount = useAnimatedCounter(ticketsData?.totals.count ?? 0, 600)

  const dailyTotal = (ticketsData?.totals.cash ?? 0) + (ticketsData?.totals.card ?? 0)
  const cashShare = dailyTotal > 0 ? (100 * (ticketsData?.totals.cash ?? 0)) / dailyTotal : 50

  const lastTickets = (ticketsData?.tickets ?? []).slice(0, 5)
  const cashTickets = (ticketsData?.tickets ?? []).filter((x) => x.paymentMethod === 'cash').length
  const cardTickets = (ticketsData?.tickets ?? []).filter((x) => x.paymentMethod === 'card').length

  const byBarber = [...(ticketsData?.totals.byBarber ?? [])].sort((a, b) => b.total - a.total)

  if (err) {
    return (
      <div className="rounded-full border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        {err}{' '}
        <button type="button" className="ml-2 font-semibold underline" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  if (loading || !overview || !ticketsData || !reportsToday) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" className="h-28" />
          ))}
        </div>
        <Skeleton variant="line" className="h-10 w-full max-w-md" />
        <Skeleton variant="chart-bar" />
      </div>
    )
  }

  return (
    <div className="space-y-8 text-headz-black">
      {/* Hero */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          className="animate-slide-up rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Cash today</p>
              <p className="mt-2 font-mono text-2xl font-black tabular-nums text-emerald-600">{formatMoney(cash)}</p>
            </div>
            <span className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-600">
              <Banknote className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/5">
            <div className="h-full bg-emerald-500/80 transition-all" style={{ width: `${cashShare}%` }} />
          </div>
        </div>
        <div
          className="animate-slide-up rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          style={{ animationDelay: '60ms' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Card today</p>
              <p className="mt-2 font-mono text-2xl font-black tabular-nums text-blue-600">{formatMoney(card)}</p>
            </div>
            <span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-600">
              <CreditCard className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/5">
            <div className="h-full bg-blue-500/80 transition-all" style={{ width: `${100 - cashShare}%` }} />
          </div>
        </div>
        <div
          className="animate-slide-up rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          style={{ animationDelay: '120ms' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Tickets today</p>
              <p className="mt-2 font-mono text-2xl font-black tabular-nums text-headz-red">{Math.round(tickCount)}</p>
              <p className="mt-1 text-xs text-headz-gray">
                {cashTickets} cash · {cardTickets} card
              </p>
            </div>
            <span className="rounded-xl bg-headz-red/15 p-2.5 text-headz-red">
              <ReceiptText className="h-5 w-5" />
            </span>
          </div>
        </div>
        <div
          className="animate-slide-up rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          style={{ animationDelay: '180ms' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Active barbers</p>
              <p className="mt-2 text-2xl font-black text-headz-black">{overview.activeBarbers ?? 0}</p>
              <p className="mt-1 text-xs text-headz-gray">{format(new Date(), 'EEE MMM d')}</p>
            </div>
            <span className="rounded-xl bg-purple-500/15 p-2.5 text-purple-700">
              <Users className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>

      {/* Squire */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-headz-black via-[#1a0a0d] to-headz-black">
        <div className="flex flex-col items-stretch justify-between gap-4 px-7 py-6 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-headz-red/80">Powered by Squire</p>
            <h2 className="text-xl font-bold text-white">Manage Appointments &amp; Staff</h2>
            <p className="mt-1 text-sm text-white/50">Live scheduling, availability, and client management live in Squire.</p>
            <p className="mt-2 text-xs text-white/35">
              Today combined (bookings + tickets):{' '}
              <span className="font-semibold text-white/55">{formatMoney(reportsToday.combinedRevenue)}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="https://app.getsquire.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-headz-red px-6 py-3 text-sm font-bold text-white hover:bg-headz-redDark"
            >
              Open Squire Admin →
            </a>
            <Link
              href="/dashboard/tickets"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              Add Ticket
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-headz-black">Today&apos;s Tickets</h3>
            <Link href="/dashboard/tickets" className="text-sm font-medium text-headz-red hover:underline">
              View all →
            </Link>
          </div>
          {lastTickets.length === 0 ? (
            <p className="text-sm italic text-headz-gray">No tickets recorded yet today.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {lastTickets.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-headz-red/10 text-[10px] font-bold text-headz-red">
                    {t.customerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.customerName}</p>
                    <p className="truncate text-xs text-headz-gray">{t.barberName}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      t.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {t.paymentMethod === 'cash' ? 'CASH' : 'CARD'}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{formatMoney(t.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-headz-black">Barber Totals</h3>
            <Link href="/dashboard/reports" className="text-sm font-medium text-headz-red hover:underline">
              Full report →
            </Link>
          </div>
          {byBarber.length === 0 ? (
            <p className="text-sm italic text-headz-gray">No sales recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {byBarber.map((b) => {
                const t = b.cash + b.card
                const cw = t > 0 ? (100 * b.cash) / t : 50
                return (
                  <li key={b.barberId}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-headz-red/10 text-xs font-bold text-headz-red">
                          {b.barberName.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium">{b.barberName}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{formatMoney(b.total)}</span>
                    </div>
                    <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-black/5">
                      <div className="h-full bg-emerald-500" style={{ width: `${cw}%` }} />
                      <div className="h-full bg-blue-500" style={{ width: `${100 - cw}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-headz-gray">Jump to</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/dashboard/tickets"
            className="group cursor-pointer rounded-xl border border-black/[0.07] bg-white p-4 transition-all hover:border-headz-red/30 hover:shadow-sm"
          >
            <span className="mb-2 inline-flex rounded-lg bg-black/5 p-2 text-headz-black group-hover:bg-headz-red/10 group-hover:text-headz-red">
              <ReceiptText className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium">Tickets</p>
          </Link>
          <Link
            href="/dashboard/payments"
            className="group cursor-pointer rounded-xl border border-black/[0.07] bg-white p-4 transition-all hover:border-headz-red/30 hover:shadow-sm"
          >
            <span className="mb-2 inline-flex rounded-lg bg-black/5 p-2 text-headz-black group-hover:bg-headz-red/10 group-hover:text-headz-red">
              <DollarSign className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium">Payments</p>
          </Link>
          <Link
            href="/dashboard/reports"
            className="group cursor-pointer rounded-xl border border-black/[0.07] bg-white p-4 transition-all hover:border-headz-red/30 hover:shadow-sm"
          >
            <span className="mb-2 inline-flex rounded-lg bg-black/5 p-2 text-headz-black group-hover:bg-headz-red/10 group-hover:text-headz-red">
              <TrendingUp className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium">Reports</p>
          </Link>
          <a
            href="https://app.getsquire.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group cursor-pointer rounded-xl border border-black/[0.07] bg-white p-4 transition-all hover:border-headz-red/30 hover:shadow-sm"
          >
            <span className="mb-2 inline-flex rounded-lg bg-black/5 p-2 text-headz-black group-hover:bg-headz-red/10 group-hover:text-headz-red">
              <ExternalLink className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium">Squire</p>
          </a>
        </div>
      </div>
    </div>
  )
}
