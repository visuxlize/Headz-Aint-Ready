import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, services, users } from '@/lib/db/schema'
import { and, eq, gte, lte, ne, sql } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'

/** GET /api/dashboard/reports?start=YYYY-MM-DD&end=YYYY-MM-DD */
export async function GET(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end required' }, { status: 400 })
  }

  const [rev, apptCount, byBarber, byService, byHour, tableRows] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${services.price}::numeric), 0)` })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.status, 'completed'),
          gte(appointments.appointmentDate, start),
          lte(appointments.appointmentDate, end)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, start),
          lte(appointments.appointmentDate, end),
          ne(appointments.status, 'cancelled')
        )
      ),
    db
      .select({
        barberId: appointments.barberId,
        name: users.fullName,
        revenue: sql<string>`coalesce(sum(${services.price}::numeric), 0)`,
        cuts: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(users, eq(appointments.barberId, users.id))
      .where(
        and(
          eq(appointments.status, 'completed'),
          gte(appointments.appointmentDate, start),
          lte(appointments.appointmentDate, end)
        )
      )
      .groupBy(appointments.barberId, users.fullName),
    db
      .select({
        serviceId: appointments.serviceId,
        name: services.name,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.status, 'completed'),
          gte(appointments.appointmentDate, start),
          lte(appointments.appointmentDate, end)
        )
      )
      .groupBy(appointments.serviceId, services.name),
    db
      .select({
        dow: sql<number>`extract(dow from ${appointments.appointmentDate}::timestamp)::int`,
        hour: sql<number>`extract(hour from ${appointments.timeSlot})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, start),
          lte(appointments.appointmentDate, end),
          ne(appointments.status, 'cancelled')
        )
      )
      .groupBy(sql`extract(dow from ${appointments.appointmentDate}::timestamp)`, sql`extract(hour from ${appointments.timeSlot})`),
    db
      .select({
        barberId: appointments.barberId,
        name: users.fullName,
        cuts: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(${services.price}::numeric), 0)`,
        noShows: sql<number>`sum(case when ${appointments.status} = 'no_show' then 1 else 0 end)::int`,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(users, eq(appointments.barberId, users.id))
      .where(and(gte(appointments.appointmentDate, start), lte(appointments.appointmentDate, end)))
      .groupBy(appointments.barberId, users.fullName),
  ])

  const totalRevenue = Number(rev[0]?.total ?? 0)
  const totalAppointments = apptCount[0]?.count ?? 0
  const avgPer = totalAppointments > 0 ? totalRevenue / totalAppointments : 0

  const noShowDen = totalAppointments > 0 ? (tableRows.reduce((s, r) => s + (r.noShows ?? 0), 0) / totalAppointments) * 100 : 0

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalAppointments,
      avgPerAppointment: avgPer,
      noShowRate: Math.round(noShowDen * 10) / 10,
    },
    revenueByBarber: byBarber.map((r) => ({
      name: r.name ?? 'Barber',
      revenue: Number(r.revenue),
      cuts: r.cuts,
    })),
    bookingsByService: byService.map((r) => ({ name: r.name, value: r.count })),
    heatmap: byHour.map((r) => ({ dow: r.dow, hour: r.hour, count: r.count })),
    barberTable: tableRows.map((r) => ({
      barber: r.name ?? 'Barber',
      cuts: r.cuts,
      revenue: Number(r.revenue),
      noShows: r.noShows ?? 0,
      completionRate: r.cuts > 0 ? Math.round(((r.cuts - (r.noShows ?? 0)) / r.cuts) * 1000) / 10 : 0,
      avgRating: 5,
    })),
  })
}
