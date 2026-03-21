import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, blockedTimes, services, users, type BlockedTime } from '@/lib/db/schema'
import { and, asc, eq, gte, lte, ne } from 'drizzle-orm'
import { requireCalendarApi } from '@/lib/dashboard/api-auth'
import { minutesToPgTime, normalizeTimeSlot, pgTimeToMinutes } from '@/lib/appointments/time'

function toHHmm(t: string): string {
  const n = normalizeTimeSlot(t)
  return n.slice(0, 5)
}

function endHHmm(startSlot: string, durationMinutes: number): string {
  const startMin = pgTimeToMinutes(normalizeTimeSlot(startSlot).slice(0, 5))
  const endMin = startMin + durationMinutes
  return minutesToPgTime(endMin).slice(0, 5)
}

function initialsFrom(name: string | null | undefined): string {
  const n = name?.trim()
  if (!n) return '?'
  const parts = n.split(/\s+/)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

/** GET /api/dashboard/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD&barberId=optional */
export async function GET(request: Request) {
  const auth = await requireCalendarApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const barberFilter = searchParams.get('barberId')
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return NextResponse.json({ error: 'Invalid or missing start/end' }, { status: 400 })
  }

  const apptConditions = [
    gte(appointments.appointmentDate, start),
    lte(appointments.appointmentDate, end),
    ne(appointments.status, 'cancelled'),
  ]
  if (auth.dbUser.role === 'barber') {
    apptConditions.push(eq(appointments.barberId, auth.user.id))
  } else if (barberFilter && /^[0-9a-f-]{36}$/i.test(barberFilter)) {
    apptConditions.push(eq(appointments.barberId, barberFilter))
  }

  const blockedConditions = [
    gte(blockedTimes.date, start),
    lte(blockedTimes.date, end),
  ]
  if (auth.dbUser.role === 'barber') {
    blockedConditions.push(eq(blockedTimes.barberId, auth.user.id))
  } else if (barberFilter && /^[0-9a-f-]{36}$/i.test(barberFilter)) {
    blockedConditions.push(eq(blockedTimes.barberId, barberFilter))
  }

  const apptRows = await db
    .select({
      id: appointments.id,
      barberId: appointments.barberId,
      customerName: appointments.customerName,
      appointmentDate: appointments.appointmentDate,
      timeSlot: appointments.timeSlot,
      status: appointments.status,
      checkedOff: appointments.checkedOff,
      notes: appointments.notes,
      paymentMethod: appointments.paymentMethod,
      paymentStatus: appointments.paymentStatus,
      noShowFee: appointments.noShowFee,
      waivedAt: appointments.waivedAt,
      serviceName: services.name,
      durationMinutes: services.durationMinutes,
      price: services.price,
      barberName: users.fullName,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(users, eq(appointments.barberId, users.id))
    .where(and(...apptConditions))
    .orderBy(asc(appointments.appointmentDate), asc(appointments.timeSlot))

  let blockedRows: BlockedTime[] = []
  try {
    blockedRows = await db.select().from(blockedTimes).where(and(...blockedConditions))
  } catch (e) {
    console.error('blocked_times query failed:', e)
  }

  const appointmentsOut = apptRows.map((a) => ({
    id: a.id,
    barberId: a.barberId,
    customerName: a.customerName,
    serviceName: a.serviceName,
    startTime: toHHmm(String(a.timeSlot)),
    endTime: endHHmm(String(a.timeSlot), a.durationMinutes),
    date: a.appointmentDate,
    status: a.status as 'pending' | 'completed' | 'cancelled' | 'no_show',
    price: Number(a.price),
    checkedOff: a.checkedOff,
    notes: a.notes ?? null,
    paymentMethod: a.paymentMethod ?? null,
    paymentStatus: a.paymentStatus ?? null,
    noShowFee: Number(a.noShowFee ?? 0),
    waivedAt: a.waivedAt ? a.waivedAt.toISOString() : null,
    barberName: a.barberName ?? 'Barber',
    barberInitials: initialsFrom(a.barberName),
    durationMinutes: a.durationMinutes,
  }))

  const blockedOut = blockedRows.map((b) => ({
    id: b.id,
    barberId: b.barberId,
    date: b.date,
    startTime: toHHmm(String(b.startTime)),
    endTime: toHHmm(String(b.endTime)),
    reason: b.reason ?? 'Block',
  }))

  return NextResponse.json({
    appointments: appointmentsOut,
    blockedTimes: blockedOut,
  })
}
