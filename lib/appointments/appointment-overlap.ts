import { appointments, services } from '@/lib/db/schema'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appointmentEndUtc, appointmentStartUtc } from '@/lib/appointments/time'

type Db = typeof db

/** True if barber has another pending appointment overlapping [startMs,endMs) on same date (excluding one id). */
export async function hasOverlappingAppointment(
  executor: Db,
  params: {
    barberUserId: string
    appointmentDate: string
    startMs: number
    endMs: number
    excludeAppointmentId?: string
  }
): Promise<boolean> {
  const rows = await executor
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, params.barberUserId),
        eq(appointments.appointmentDate, params.appointmentDate),
        eq(appointments.status, 'pending'),
        ...(params.excludeAppointmentId ? [ne(appointments.id, params.excludeAppointmentId)] : [])
      )
    )

  if (rows.length === 0) return false

  const svcIds = [...new Set(rows.map((r) => r.serviceId))]
  const svcRows = await executor.select().from(services).where(inArray(services.id, svcIds))
  const durMap = new Map(svcRows.map((s) => [s.id, s.durationMinutes]))

  for (const r of rows) {
    const dur = durMap.get(r.serviceId) ?? 30
    const aStart = appointmentStartUtc(r).getTime()
    const aEnd = appointmentEndUtc(r, dur).getTime()
    if (params.startMs < aEnd && params.endMs > aStart) return true
  }
  return false
}
