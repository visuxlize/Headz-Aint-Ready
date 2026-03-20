import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, services } from '@/lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { requireBarberApi } from '@/lib/barber/api-auth'

/**
 * GET /api/barber/appointments?date=YYYY-MM-DD
 * Mirrors `barber_appointments_view` (no customer_phone / customer_email).
 * We query `appointments` + `services` explicitly because the DB view uses auth.uid(),
 * which is unset on the server postgres connection.
 */
export async function GET(request: Request) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
  }

  const rows = await db
    .select({
      id: appointments.id,
      barberId: appointments.barberId,
      serviceId: appointments.serviceId,
      customerName: appointments.customerName,
      appointmentDate: appointments.appointmentDate,
      timeSlot: appointments.timeSlot,
      status: appointments.status,
      checkedOff: appointments.checkedOff,
      noShowFee: appointments.noShowFee,
      createdAt: appointments.createdAt,
      serviceName: services.name,
      durationMinutes: services.durationMinutes,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(and(eq(appointments.barberId, auth.user.id), eq(appointments.appointmentDate, date)))
    .orderBy(asc(appointments.timeSlot))

  return NextResponse.json({ data: rows })
}
