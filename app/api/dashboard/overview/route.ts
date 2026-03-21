import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  appointments,
  barberProfiles,
  posTransactions,
  services,
  users,
} from '@/lib/db/schema'
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, sql } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { addDays, format, startOfWeek } from 'date-fns'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function monthBounds(y: number, m: number) {
  const start = `${y}-${pad(m + 1)}-01`
  const last = new Date(y, m + 1, 0).getDate()
  const end = `${y}-${pad(m + 1)}-${pad(last)}`
  return { start, end }
}

function initialsFrom(name: string | null | undefined): string {
  const n = name?.trim()
  if (!n) return '?'
  const parts = n.split(/\s+/)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

function categoryLabel(raw: string | null): 'cuts' | 'beard' | 'add-ons' {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('beard')) return 'beard'
  if (s.includes('add') || s.includes('extra') || s.includes('addon')) return 'add-ons'
  return 'cuts'
}

/** GET /api/dashboard/overview?start=YYYY-MM-DD&end=YYYY-MM-DD — admin only */
export async function GET(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')

  const now = new Date()
  let y = now.getFullYear()
  let m = now.getMonth()
  if (startParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam)) {
    y = Number(startParam.slice(0, 4))
    m = Number(startParam.slice(5, 7)) - 1
  }
  const { start: periodStart, end: periodEnd } = monthBounds(y, m)
  const { start: prevStart, end: prevEnd } = monthBounds(
    m === 0 ? y - 1 : y,
    m === 0 ? 11 : m - 1
  )

  const prevMonthStart = new Date(`${prevStart}T00:00:00`)
  const prevMonthEnd = new Date(`${prevEnd}T23:59:59`)
  const monthStartTs = new Date(`${periodStart}T00:00:00`)
  const monthEndTs = new Date(`${periodEnd}T23:59:59`)

  const [
    revenueRows,
    prevRevenueRows,
    bookingCountRows,
    prevBookingCountRows,
    activeBarbersRows,
    noShowRows,
    noShowFeeRows,
    weeklyDayCounts,
    todayAppts,
    topBarberRows,
    topServiceRows,
    revenueByDayRows,
    paymentBreakdownRows,
  ] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${posTransactions.total}), 0)` })
      .from(posTransactions)
      .where(
        and(gte(posTransactions.createdAt, monthStartTs), lte(posTransactions.createdAt, monthEndTs))
      ),
    db
      .select({ total: sql<string>`coalesce(sum(${posTransactions.total}), 0)` })
      .from(posTransactions)
      .where(
        and(gte(posTransactions.createdAt, prevMonthStart), lte(posTransactions.createdAt, prevMonthEnd))
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, periodStart),
          lte(appointments.appointmentDate, periodEnd),
          ne(appointments.status, 'cancelled')
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, prevStart),
          lte(appointments.appointmentDate, prevEnd),
          ne(appointments.status, 'cancelled')
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.role, 'barber'), eq(users.isActive, true))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, periodStart),
          lte(appointments.appointmentDate, periodEnd),
          eq(appointments.status, 'no_show')
        )
      ),
    db
      .select({ total: sql<string>`coalesce(sum(${appointments.noShowFee}), 0)` })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, periodStart),
          lte(appointments.appointmentDate, periodEnd),
          eq(appointments.status, 'no_show'),
          isNull(appointments.waivedAt)
        )
      ),
    (async () => {
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
      const labels: { date: string; day: string }[] = []
      for (let i = 0; i < 7; i++) {
        const x = addDays(monday, i)
        labels.push({
          date: format(x, 'yyyy-MM-dd'),
          day: format(x, 'EEE'),
        })
      }
      const counts = await Promise.all(
        labels.map(({ date: ds }) =>
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(appointments)
            .where(
              and(eq(appointments.appointmentDate, ds), ne(appointments.status, 'cancelled'))
            )
        )
      )
      return labels.map((l, i) => ({
        day: l.day,
        count: counts[i]?.[0]?.count ?? 0,
        revenue: 0,
        date: l.date,
      }))
    })(),
    db
      .select({
        id: appointments.id,
        customerName: appointments.customerName,
        timeSlot: appointments.timeSlot,
        status: appointments.status,
        serviceName: services.name,
        barberName: users.fullName,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(users, eq(appointments.barberId, users.id))
      .where(
        and(
          eq(appointments.appointmentDate, format(new Date(), 'yyyy-MM-dd')),
          inArray(appointments.status, ['pending', 'completed'])
        )
      )
      .orderBy(asc(appointments.timeSlot)),
    db
      .select({
        barberId: appointments.barberId,
        total: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'completed'),
          gte(appointments.appointmentDate, periodStart),
          lte(appointments.appointmentDate, periodEnd)
        )
      )
      .groupBy(appointments.barberId)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(4),
    db
      .select({
        serviceId: appointments.serviceId,
        total: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'completed'),
          gte(appointments.appointmentDate, periodStart),
          lte(appointments.appointmentDate, periodEnd)
        )
      )
      .groupBy(appointments.serviceId)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(4),
    db
      .select({
        d: sql<string>`${appointments.appointmentDate}::text`,
        revenue: sql<string>`coalesce(sum(${services.price}::numeric), 0)`,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.status, 'completed'),
          gte(appointments.appointmentDate, periodStart),
          lte(appointments.appointmentDate, periodEnd)
        )
      )
      .groupBy(appointments.appointmentDate)
      .orderBy(asc(appointments.appointmentDate)),
    db
      .select({
        method: posTransactions.paymentMethod,
        count: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(${posTransactions.total}), 0)`,
      })
      .from(posTransactions)
      .where(
        and(
          eq(posTransactions.paymentStatus, 'paid'),
          gte(posTransactions.createdAt, monthStartTs),
          lte(posTransactions.createdAt, monthEndTs)
        )
      )
      .groupBy(posTransactions.paymentMethod),
  ])

  const totalRevenue = Number(revenueRows[0]?.total ?? 0)
  const prevRevenue = Number(prevRevenueRows[0]?.total ?? 0)
  const revenueChange =
    prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10 : 0

  const totalBookings = bookingCountRows[0]?.count ?? 0
  const prevBookings = prevBookingCountRows[0]?.count ?? 0
  const bookingsChange =
    prevBookings > 0 ? Math.round(((totalBookings - prevBookings) / prevBookings) * 1000) / 10 : 0

  const barberIds = topBarberRows.map((r) => r.barberId)
  const barberUsers =
    barberIds.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            specialty: barberProfiles.specialty,
          })
          .from(users)
          .leftJoin(barberProfiles, eq(barberProfiles.userId, users.id))
          .where(inArray(users.id, barberIds))
      : []

  const revenueByBarber = await Promise.all(
    topBarberRows.map(async (row) => {
      const [rev] = await db
        .select({
          total: sql<string>`coalesce(sum(${services.price}::numeric), 0)`,
        })
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.barberId, row.barberId),
            eq(appointments.status, 'completed'),
            gte(appointments.appointmentDate, periodStart),
            lte(appointments.appointmentDate, periodEnd)
          )
        )
      return { barberId: row.barberId, revenue: Number(rev?.total ?? 0) }
    })
  )
  const revMap = new Map(revenueByBarber.map((x) => [x.barberId, x.revenue]))

  const topBarbers = topBarberRows.map((row) => {
    const u = barberUsers.find((b) => b.id === row.barberId)
    const name = u?.fullName ?? 'Barber'
    return {
      id: row.barberId,
      name,
      initials: initialsFrom(name),
      specialty: u?.specialty ?? 'Cut Specialist',
      totalCuts: row.total,
      revenue: revMap.get(row.barberId) ?? 0,
    }
  })

  const serviceIds = topServiceRows.map((r) => r.serviceId)
  const serviceMeta =
    serviceIds.length > 0
      ? await db
          .select({
            id: services.id,
            name: services.name,
            category: services.category,
          })
          .from(services)
          .where(inArray(services.id, serviceIds))
      : []

  const topServices = topServiceRows.map((row) => {
    const s = serviceMeta.find((x) => x.id === row.serviceId)
    return {
      id: row.serviceId,
      name: s?.name ?? 'Service',
      category: categoryLabel(s?.category ?? null),
      totalBookings: row.total,
    }
  })

  const revenueTrend = revenueByDayRows.map((r) => ({
    date: r.d,
    revenue: Number(r.revenue),
  }))

  const weeklyBookings = weeklyDayCounts.map((w) => ({
    day: w.day,
    count: w.count,
    revenue: w.revenue,
    date: w.date,
  }))

  let cardTotal = 0
  let cashTotal = 0
  let cardCount = 0
  let cashCount = 0
  for (const row of paymentBreakdownRows) {
    const m = row.method
    const n = row.count ?? 0
    const rev = Number(row.revenue ?? 0)
    if (m === 'card') {
      cardTotal = rev
      cardCount = n
    } else if (m === 'cash') {
      cashTotal = rev
      cashCount = n
    }
  }

  return NextResponse.json({
    weeklyBookings,
    totalRevenue,
    revenueChange,
    totalBookings,
    bookingsChange,
    activeBarbers: activeBarbersRows[0]?.count ?? 0,
    noShowsCount: noShowRows[0]?.count ?? 0,
    noShowFeesOutstanding: Number(noShowFeeRows[0]?.total ?? 0),
    todaysAppointments: todayAppts.map((a) => ({
      id: a.id,
      customerName: a.customerName,
      serviceName: a.serviceName,
      time: a.timeSlot,
      barberName: a.barberName ?? 'Barber',
      status: a.status,
    })),
    topBarbers,
    topServices,
    revenueTrend,
    periodStart,
    periodEnd,
    paymentBreakdown: {
      cardTotal,
      cashTotal,
      cardCount,
      cashCount,
    },
  })
}
