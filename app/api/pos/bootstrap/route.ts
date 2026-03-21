import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, barbers, services, users } from '@/lib/db/schema'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { getTodayStoreDate } from '@/lib/pos/store-date'
import { and, asc, eq } from 'drizzle-orm'
import { formatServicePriceDisplay } from '@/lib/services/format-service-price'

export async function GET() {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  const today = getTodayStoreDate()

  const [serviceRows, barberRows, apptRows] = await Promise.all([
    db.select().from(services).where(eq(services.isActive, true)).orderBy(asc(services.displayOrder)),
    db
      .select({
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
        barberName: barbers.name,
        sortOrder: barbers.sortOrder,
      })
      .from(users)
      .innerJoin(barbers, eq(barbers.userId, users.id))
      .where(and(eq(users.role, 'barber'), eq(users.isActive, true), eq(barbers.isActive, true)))
      .orderBy(asc(barbers.sortOrder)),
    db
      .select({
        appointment: appointments,
        serviceName: services.name,
        servicePrice: services.price,
        barberDisplay: barbers.name,
        barberEmail: users.email,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(users, eq(appointments.barberId, users.id))
      .leftJoin(barbers, eq(barbers.userId, users.id))
      .where(and(eq(appointments.appointmentDate, today), eq(appointments.status, 'pending')))
      .orderBy(asc(appointments.timeSlot)),
  ])

  const appointmentsOut = apptRows.map((r) => ({
    id: r.appointment.id,
    customerName: r.appointment.customerName,
    customerPhone: r.appointment.customerPhone,
    customerEmail: r.appointment.customerEmail,
    timeSlot: r.appointment.timeSlot,
    barberId: r.appointment.barberId,
    serviceId: r.appointment.serviceId,
    serviceName: r.serviceName,
    servicePrice: String(r.servicePrice),
    barberName: r.barberDisplay ?? r.barberEmail ?? 'Barber',
    isWalkIn: r.appointment.isWalkIn,
  }))

  const barbersOut = barberRows.map((b) => {
    const parts = b.barberName.split(/\s+/).filter(Boolean)
    const initials =
      parts
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || '?'
    return {
      id: b.userId,
      name: b.barberName,
      email: b.email,
      initials,
    }
  })

  return NextResponse.json({
    today,
    services: serviceRows.map((s) => ({
      id: s.id,
      name: s.name,
      price: String(s.price),
      displayPrice: formatServicePriceDisplay(s),
      durationMinutes: s.durationMinutes,
      category: s.category,
    })),
    barbers: barbersOut,
    appointments: appointmentsOut,
  })
}
