import { db } from '@/lib/db'
import { appointments, services } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { appointmentEndUtc } from '@/lib/appointments/time'
import { computeNoShowFeeFromServicePrice } from '@/lib/appointments/no-show-fee'

/**
 * Marks past pending appointments as no_show with 20% fee.
 * Used by Netlify scheduled function (and can be invoked manually).
 */
export async function processNoShows(): Promise<{ flagged: number }> {
  const rows = await db
    .select({ appt: appointments, service: services })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(and(eq(appointments.status, 'pending'), eq(appointments.checkedOff, false)))

  const now = new Date()
  let flagged = 0

  for (const { appt, service } of rows) {
    const end = appointmentEndUtc(appt, service.durationMinutes)
    if (end.getTime() >= now.getTime()) continue

    const fee = computeNoShowFeeFromServicePrice(service.price)
    await db
      .update(appointments)
      .set({
        status: 'no_show',
        noShowFee: fee,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appt.id))

    console.log(
      `[no-show-checker] id=${appt.id} customer=${appt.customerName} date=${appt.appointmentDate} fee=${fee}`
    )
    flagged++
  }

  return { flagged }
}
