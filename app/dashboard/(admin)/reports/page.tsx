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

const COLORS = ['#C0392B', '#FDF6EC', '#1A1A1A', '#6b7280', '#14532d']

export default function ReportsPage() {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch(`/api/dashboard/reports?start=${start}&end=${end}`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [start, end])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton variant="line" className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
        <Skeleton variant="chart-bar" />
      </div>
    )
  }

  const payload = data as {
    summary: {
      totalRevenue: number
      totalAppointments: number
      avgPerAppointment: number
      noShowRate: number
    }
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

  const heatCells = Array.from({ length: 7 * 14 }).map((_, i) => {
    const dow = i % 7
    const hour = 8 + Math.floor(i / 7)
    const found = payload.heatmap.find((h) => h.dow === dow && h.hour === hour)
    return { key: `${dow}-${hour}`, dow, hour, count: found?.count ?? 0 }
  })
  const maxH = Math.max(...heatCells.map((c) => c.count), 1)

  return (
    <div className="space-y-8 text-headz-black">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-headz-gray text-sm mt-1">
          Last 30 days ({start} → {end})
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">${payload.summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">Appointments</p>
          <p className="text-2xl font-bold mt-1">{payload.summary.totalAppointments}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">Avg / appt</p>
          <p className="text-2xl font-bold mt-1">${payload.summary.avgPerAppointment.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-headz-gray">No-show rate</p>
          <p className="text-2xl font-bold mt-1">{payload.summary.noShowRate}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="font-semibold mb-4">Revenue by barber</h2>
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
        <h2 className="font-semibold mb-4">Bookings by service</h2>
        <div className="h-64 flex">
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
        <h2 className="font-semibold mb-4">Busiest hours (heatmap)</h2>
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}
        >
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

      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
        <h2 className="font-semibold mb-4">Barber performance</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-headz-gray border-b">
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
