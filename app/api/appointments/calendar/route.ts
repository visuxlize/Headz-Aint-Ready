/**
 * ICS calendar export for legacy workflows. Scheduling source of truth is Squire.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, barbers, services } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { appointmentEndUtc, appointmentStartUtc } from '@/lib/appointments/time'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { logSecurityEvent } from '@/lib/security/security-log'

function formatICSDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICS(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** GET /api/appointments/calendar?date=YYYY-MM-DD&barberId=uuid
 * barberId is barbers.id (profile). Auth required.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireStaffApi()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const barberProfileId = searchParams.get('barberId')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
    }

    const conditions = [eq(appointments.appointmentDate, date), eq(appointments.status, 'pending')]

    if (auth.dbUser.role === 'admin') {
      if (barberProfileId) {
        const [b] = await db.select().from(barbers).where(eq(barbers.id, barberProfileId)).limit(1)
        if (b?.userId) conditions.push(eq(appointments.barberId, b.userId))
      }
    } else {
      conditions.push(eq(appointments.barberId, auth.user.id))
      if (barberProfileId) {
        const [b] = await db.select().from(barbers).where(eq(barbers.id, barberProfileId)).limit(1)
        if (!b?.userId || b.userId !== auth.user.id) {
          logSecurityEvent('idor_blocked', { route: 'GET /api/appointments/calendar', userId: auth.user.id })
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const list = await db
      .select({
        id: appointments.id,
        barberId: appointments.barberId,
        serviceId: appointments.serviceId,
        customerName: appointments.customerName,
        appointmentDate: appointments.appointmentDate,
        timeSlot: appointments.timeSlot,
        isWalkIn: appointments.isWalkIn,
      })
      .from(appointments)
      .where(and(...conditions))

    const userIds = [...new Set(list.map((a) => a.barberId))]
    const [barbersList, servicesList] = await Promise.all([
      userIds.length ? db.select().from(barbers).where(inArray(barbers.userId, userIds)) : [],
      db.select().from(services),
    ])
    const barberByUserId = new Map(barbersList.filter((b) => b.userId).map((b) => [b.userId!, b]))
    const serviceMap = new Map(servicesList.map((s) => [s.id, s]))

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Headz Ain\'t Ready//Schedule//EN',
      'CALSCALE:GREGORIAN',
    ]
    for (const a of list) {
      const barber = barberByUserId.get(a.barberId)
      const service = serviceMap.get(a.serviceId)
      const dur = service?.durationMinutes ?? 30
      const start = appointmentStartUtc(a)
      const end = appointmentEndUtc(a, dur)
      const title = `${service?.name ?? 'Appointment'} – ${a.customerName}${a.isWalkIn ? ' (Walk-in)' : ''}${barber ? ` @ ${barber.name}` : ''}`
      lines.push(
        'BEGIN:VEVENT',
        `UID:${a.id}@headzaintready.com`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(start)}`,
        `DTEND:${formatICSDate(end)}`,
        `SUMMARY:${escapeICS(title)}`,
        'END:VEVENT'
      )
    }
    lines.push('END:VCALENDAR')
    const ics = lines.join('\r\n')

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="headz-schedule-${date}.ics"`,
      },
    })
  } catch (e) {
    console.error('GET /api/appointments/calendar', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
