import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/schema'
import { and, eq, gte, lt, sql } from 'drizzle-orm'

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** EST-ish boundaries for "today" in store timezone (simplified: use date string) */
function getDayBounds(dateStr: string) {
  return {
    start: new Date(`${dateStr}T09:00:00-05:00`),
    end: new Date(`${dateStr}T20:00:00-05:00`),
  }
}

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const sun = new Date(now)
  sun.setDate(now.getDate() - day)
  const sat = new Date(sun)
  sat.setDate(sun.getDate() + 6)
  return {
    start: new Date(toDateString(sun) + 'T00:00:00-05:00'),
    end: new Date(toDateString(sat) + 'T23:59:59-05:00'),
  }
}

function getMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return {
    start: new Date(start.toISOString().slice(0, 10) + 'T00:00:00-05:00'),
    end: new Date(end.toISOString().slice(0, 10) + 'T23:59:59-05:00'),
  }
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = toDateString(new Date())
  const { start: dayStart, end: dayEnd } = getDayBounds(today)
  const { start: weekStart, end: weekEnd } = getWeekBounds()
  const { start: monthStart, end: monthEnd } = getMonthBounds()

  const [dailyCount, weeklyCount, monthlyCount, recentAppointments] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          gte(appointments.startAt, dayStart),
          lt(appointments.startAt, dayEnd),
          eq(appointments.status, 'confirmed')
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          gte(appointments.startAt, weekStart),
          lt(appointments.startAt, weekEnd),
          eq(appointments.status, 'confirmed')
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          gte(appointments.startAt, monthStart),
          lt(appointments.startAt, monthEnd),
          eq(appointments.status, 'confirmed')
        )
      ),
    db
      .select({ startAt: appointments.startAt })
      .from(appointments)
      .where(
        and(
          gte(appointments.startAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          eq(appointments.status, 'confirmed')
        )
      ),
  ])

  const daily = dailyCount[0]?.count ?? 0
  const weekly = weeklyCount[0]?.count ?? 0
  const monthly = monthlyCount[0]?.count ?? 0

  // Peak hours: group by hour (EST) from recent appointments
  const hourCounts: Record<number, number> = {}
  for (let h = 9; h <= 19; h++) hourCounts[h] = 0
  for (const a of recentAppointments) {
    const d = new Date(a.startAt)
    const estHour = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours()
    if (estHour >= 9 && estHour <= 19) hourCounts[estHour] = (hourCounts[estHour] ?? 0) + 1
  }
  const peakHours = Object.entries(hourCounts)
    .map(([h, count]) => ({ hour: Number(h), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxPeak = Math.max(...peakHours.map((p) => p.count), 1)

  function hourTo12(h: number) {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12} ${h < 12 ? 'AM' : 'PM'}`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Overview</h1>
        <p className="text-headz-gray text-sm mt-1">
          Bookings at a glance and peak hours for better scheduling.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Today</p>
          <p className="mt-2 text-3xl font-bold text-headz-black">{daily}</p>
          <p className="text-xs text-headz-gray mt-1">confirmed bookings</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">This week</p>
          <p className="mt-2 text-3xl font-bold text-headz-black">{weekly}</p>
          <p className="text-xs text-headz-gray mt-1">confirmed bookings</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">This month</p>
          <p className="mt-2 text-3xl font-bold text-headz-black">{monthly}</p>
          <p className="text-xs text-headz-gray mt-1">confirmed bookings</p>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-headz-black mb-1">Peak hours</h2>
        <p className="text-sm text-headz-gray mb-5">Last 30 days — align availability with busiest times.</p>
        <div className="flex flex-wrap items-end gap-3">
          {peakHours.map(({ hour, count }) => (
            <div key={hour} className="flex flex-col items-center gap-2">
              <div
                className="w-14 rounded-t bg-headz-red transition-all"
                style={{ height: `${Math.max(16, (count / maxPeak) * 72)}px` }}
                title={`${hourTo12(hour)} – ${count} appointments`}
              />
              <span className="text-xs font-medium text-headz-gray">
                {hourTo12(hour)}
              </span>
            </div>
          ))}
        </div>
        {peakHours.length === 0 && (
          <p className="text-sm text-headz-gray">No appointment data yet.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/schedule"
          className="inline-flex items-center rounded-lg bg-headz-red px-4 py-2.5 text-sm font-medium text-white hover:bg-headz-redDark shadow-sm"
        >
          View schedule →
        </Link>
        <Link
          href="/dashboard/availability"
          className="inline-flex items-center rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-headz-black hover:bg-headz-cream/80"
        >
          Staff working hours
        </Link>
      </div>
    </div>
  )
}
