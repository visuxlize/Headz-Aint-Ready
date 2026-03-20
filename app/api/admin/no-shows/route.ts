import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, barbers, services } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'

/** GET — all no-show appointments (admin) */
export async function GET() {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const rows = await db
    .select({
      id: appointments.id,
      customerName: appointments.customerName,
      appointmentDate: appointments.appointmentDate,
      timeSlot: appointments.timeSlot,
      status: appointments.status,
      noShowFee: appointments.noShowFee,
      waivedAt: appointments.waivedAt,
      serviceName: services.name,
      servicePrice: services.price,
      barberName: barbers.name,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(barbers.userId, appointments.barberId))
    .where(eq(appointments.status, 'no_show'))
    .orderBy(desc(appointments.appointmentDate), desc(appointments.timeSlot))

  return NextResponse.json({ data: rows })
}
