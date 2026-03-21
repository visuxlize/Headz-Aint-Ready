'use client'

import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { ServiceIcon, type ServiceCategory } from '@/components/ui/ServiceIcon'
import { format } from 'date-fns'

type OverviewPayload = {
  weeklyBookings: { day: string; count: number; revenue: number; date: string }[]
  totalRevenue: number
  revenueChange: number
  totalBookings: number
  bookingsChange: number
  activeBarbers: number
  noShowsCount: number
  noShowFeesOutstanding: number
  paymentBreakdown?: {
    cardTotal: number
    cashTotal: number
    cardCount: number
    cashCount: number
  }
  todaysAppointments: {
    id: string
    customerName: string
    serviceName: string
    time: string
    barberName: string
    status: string
  }[]
  topBarbers: {
    id: string
    name: string
    initials: string
    specialty: string
    totalCuts: number
    revenue: number
  }[]
  topServices: { id: string; name: string; category: ServiceCategory; totalBookings: number }[]
  revenueTrend: { date: string; revenue: number }[]
  periodStart: string
  periodEnd: string
}

export function AdminOverviewTab() {
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/dashboard/overview', { credentials: 'include' })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Failed')
        if (!j.weeklyBookings) throw new Error('Invalid response')
        setData(j as OverviewPayload)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed'))
  }, [])

  if (err) {
    return <p className="text-headz-red text-sm">{err}</p>
  }
  if (!data) {
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

  const today = format(new Date(), 'yyyy-MM-dd')
  const chartData = data.weeklyBookings.map((w) => ({
    name: w.day,
    count: w.count,
    fill: w.date === today ? '#FDF6EC' : '#14532d',
  }))

  return (
    <div className="space-y-8 text-headz-black">
      <div>
        <h1 className="font-serif text-2xl font-bold">Overview</h1>
        <p className="text-headz-gray text-sm mt-1">Analytics for {data.periodStart.slice(0, 7)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={`$${data.totalRevenue.toFixed(2)}`}
          delta={data.revenueChange}
          sub="vs last month"
        />
        <MetricCard
          title="Total Bookings"
          value={String(data.totalBookings)}
          delta={data.bookingsChange}
          sub="vs last month"
        />
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Active Barbers</p>
          <p className="mt-2 text-3xl font-bold">{data.activeBarbers}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">No-Shows</p>
          <p className="mt-2 text-3xl font-bold">{data.noShowsCount}</p>
          <p className="text-xs text-headz-gray mt-1">${data.noShowFeesOutstanding.toFixed(2)} fees outstanding</p>
        </div>
        {data.paymentBreakdown && (
          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Payment methods (month)</p>
            <div className="mt-3 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-headz-gray">Card</span>
                <p className="font-semibold">
                  ${data.paymentBreakdown.cardTotal.toFixed(2)}{' '}
                  <span className="text-headz-gray font-normal">
                    ({data.paymentBreakdown.cardCount} txns)
                  </span>
                </p>
              </div>
              <div>
                <span className="text-headz-gray">Cash</span>
                <p className="font-semibold">
                  ${data.paymentBreakdown.cashTotal.toFixed(2)}{' '}
                  <span className="text-headz-gray font-normal">
                    ({data.paymentBreakdown.cashCount} txns)
                  </span>
                </p>
              </div>
            </div>
            {data.paymentBreakdown.cardTotal + data.paymentBreakdown.cashTotal > 0 && (
              <div className="mt-3 flex h-2 w-full max-w-md overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full bg-headz-red"
                  style={{
                    width: `${(
                      (100 * data.paymentBreakdown.cardTotal) /
                      (data.paymentBreakdown.cardTotal + data.paymentBreakdown.cashTotal)
                    ).toFixed(1)}%`,
                  }}
                />
                <div
                  className="h-full bg-[#FDF6EC]"
                  style={{
                    width: `${(
                      (100 * data.paymentBreakdown.cashTotal) /
                      (data.paymentBreakdown.cardTotal + data.paymentBreakdown.cashTotal)
                    ).toFixed(1)}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold mb-4">Booking overview</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#14532d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-headz-gray mt-3">
            +{data.revenueChange}% revenue · Analytics from previous month
          </p>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold mb-3 flex items-center justify-between">
            Today&apos;s Appointments
            <span className="text-headz-gray">⋮</span>
          </h2>
          <ul className="space-y-3 max-h-72 overflow-y-auto">
            {data.todaysAppointments.length === 0 ? (
              <li className="text-sm text-headz-gray">No appointments today</li>
            ) : (
              data.todaysAppointments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-full bg-headz-cream flex items-center justify-center text-xs font-bold">
                    {a.customerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{a.customerName}</p>
                    <span className="inline-block mt-0.5 rounded-full bg-black/5 px-2 py-0.5 text-xs">
                      {a.serviceName}
                    </span>
                  </div>
                  <span className="text-xs text-headz-gray shrink-0">{String(a.time).slice(0, 5)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold mb-3 flex items-center justify-between">
            Top Barber&apos;s
            <span className="text-xs text-headz-red">See All →</span>
          </h2>
          <ul className="space-y-3">
            {data.topBarbers.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-headz-cream flex items-center justify-center text-sm font-bold">
                  {b.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{b.name}</p>
                  <p className="text-xs text-headz-gray">{b.specialty}</p>
                </div>
                <span className="text-xs text-headz-gray">{b.totalCuts} cuts</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Revenue Summary</h2>
          <p className="text-3xl font-bold">${data.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-blue-600 mt-1">{data.revenueChange}% vs prior</p>
          <div className="h-40 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueTrend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C0392B" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#C0392B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="revenue" stroke="#C0392B" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl p-5 shadow-sm bg-[#C0392B] text-white">
          <h2 className="font-semibold mb-4">Top Services</h2>
          <ul className="space-y-3">
            {data.topServices.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <ServiceIcon category={s.category} className="text-white" size={18} />
                  <span className="truncate text-sm font-medium">{s.name}</span>
                </span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs shrink-0">{s.totalBookings}+</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  delta,
  sub,
}: {
  title: string
  value: string
  delta: number
  sub: string
}) {
  const pos = delta >= 0
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">{title}</p>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <p className="text-3xl font-bold">{value}</p>
        <span
          className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
            pos ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
          }`}
        >
          {pos ? '+' : ''}
          {delta}%
        </span>
      </div>
      <p className="text-xs text-headz-gray mt-1">{sub}</p>
    </div>
  )
}
