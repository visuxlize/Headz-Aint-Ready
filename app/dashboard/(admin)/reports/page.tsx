'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { subDays, format } from 'date-fns'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatMoney } from '@/lib/utils/format-money'

const COLORS = ['#C0392B', '#FDF6EC', '#1A1A1A', '#6b7280', '#14532d']

type ReportsPayload = {
  summary: {
    totalRevenue: number
    totalAppointments: number
    avgPerAppointment: number
    noShowRate: number
  }
  posRevenue?: number
  combinedRevenue?: number
  cashTotal?: number
  cardTotal?: number
  ticketsByBarber?: { barber: string; tickets: number; revenue: number }[]
  revenueByBarber: { name: string; revenue: number }[]
  bookingsByService: { name: string; value: number }[]
  heatmap: { dow: number; hour: number; count: number }[]
  barberTable: {
    barber: string
    cuts: number
    revenue: number
    noShows: number
    completionRate: number
    avgRating: number
  }[]
}

export default function ReportsPage() {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const [data, setData] = useState<ReportsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch(`/api/dashboard/reports?start=${start}&end=${end}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setData(j as ReportsPayload))
      .finally(() => setLoading(false))
  }, [start, end])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton variant="line" className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
        <Skeleton variant="chart-bar" />
      </div>
    )
  }

  const payload = data

  const heatCells = Array.from({ length: 7 * 14 }).map((_, i) => {
    const dow = i % 7
    const hour = 8 + Math.floor(i / 7)
    const found = payload.heatmap.find((h) => h.dow === dow && h.hour === hour)
    return { key: `${dow}-${hour}`, dow, hour, count: found?.count ?? 0 }
  })
  const maxH = Math.max(...heatCells.map((c) => c.count), 1)

  const posRev = payload.posRevenue ?? 0
  const cashT = payload.cashTotal ?? 0
  const cardT = payload.cardTotal ?? 0
  const splitDenom = cashT + cardT
  const cashPct = splitDenom > 0 ? (100 * cashT) / splitDenom : 50
  const cardPct = 100 - cashPct

  const ticketsRows = [...(payload.ticketsByBarber ?? [])].sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="space-y-8 text-headz-black">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-headz-gray">
          Appointments + POS ticket revenue. Last 30 days ({start} → {end})
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">Appointment Revenue</p>
          <p className="mt-1 text-2xl font-bold">${payload.summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">Appointments</p>
          <p className="mt-1 text-2xl font-bold">{payload.summary.totalAppointments}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">Avg / appt</p>
          <p className="mt-1 text-2xl font-bold">${payload.summary.avgPerAppointment.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">Ticket Revenue</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(posRev)}</p>
          <p className="mt-1 text-[11px] text-headz-gray">Manual + POS entries</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">No-show rate</p>
          <p className="mt-1 text-2xl font-bold">{payload.summary.noShowRate}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Revenue by barber</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payload.revenueByBarber} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#C0392B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Cash vs Card Split (POS)</h2>
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-black/5">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${cashPct}%` }} />
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${cardPct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-emerald-700">CASH {formatMoney(cashT)}</span>
          <span className="text-headz-gray">
            {cashPct.toFixed(0)}% / {cardPct.toFixed(0)}%
          </span>
          <span className="font-semibold text-blue-700">CARD {formatMoney(cardT)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Bookings by service</h2>
        <div className="flex h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={payload.bookingsByService} dataKey="value" nameKey="name" cx="40%" cy="50%" outerRadius={80}>
                {payload.bookingsByService.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Busiest hours (heatmap)</h2>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
          {heatCells.map((c) => (
            <div
              key={c.key}
              title={`${c.count} bookings`}
              className="aspect-square rounded-sm border border-black/5"
              style={{
                background: `color-mix(in srgb, #C0392B ${Math.round((c.count / maxH) * 100)}%, #FDF6EC)`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Tickets by Barber</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-headz-gray">
              <th className="py-2 pr-4">Barber</th>
              <th className="py-2 pr-4">Tickets</th>
              <th className="py-2 pr-4">Revenue</th>
              <th className="py-2">Avg / ticket</th>
            </tr>
          </thead>
          <tbody>
            {ticketsRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-headz-gray">
                  No POS tickets in this range.
                </td>
              </tr>
            ) : (
              ticketsRows.map((row) => (
                <tr key={row.barber} className="border-b border-black/5">
                  <td className="py-2 pr-4 font-medium">{row.barber}</td>
                  <td className="py-2 pr-4">{row.tickets}</td>
                  <td className="py-2 pr-4">{formatMoney(row.revenue)}</td>
                  <td className="py-2">{formatMoney(row.tickets > 0 ? row.revenue / row.tickets : 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Barber performance</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-headz-gray">
              <th className="py-2 pr-4">Barber</th>
              <th className="py-2 pr-4">Cuts</th>
              <th className="py-2 pr-4">Revenue</th>
              <th className="py-2 pr-4">Avg rating</th>
              <th className="py-2 pr-4">No-shows</th>
              <th className="py-2">Completion %</th>
            </tr>
          </thead>
          <tbody>
            {payload.barberTable.map((row) => (
              <tr key={row.barber} className="border-b border-black/5">
                <td className="py-2 pr-4 font-medium">{row.barber}</td>
                <td className="py-2 pr-4">{row.cuts}</td>
                <td className="py-2 pr-4">${row.revenue.toFixed(2)}</td>
                <td className="py-2 pr-4">{row.avgRating.toFixed(1)}</td>
                <td className="py-2 pr-4">{row.noShows}</td>
                <td className="py-2">{row.completionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
