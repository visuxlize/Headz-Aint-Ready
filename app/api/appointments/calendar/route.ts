import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { appointments, barbers, services } from '@/lib/db/schema'
import { and, eq, gte, lt } from 'drizzle-orm'

function formatICSDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICS(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** GET /api/appointments/calendar?date=YYYY-MM-DD&barberId=uuid
 * Returns .ics file for that day. barberId optional (all barbers if omitted). Auth required.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const barberId = searchParams.get('barberId')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
    }
    const dayStart = new Date(`${date}T00:00:00-05:00`)
    const dayEnd = new Date(`${date}T23:59:59-05:00`)

    const conditions = [
      gte(appointments.startAt, dayStart),
      lt(appointments.startAt, dayEnd),
      eq(appointments.status, 'confirmed'),
    ]
    if (barberId) conditions.push(eq(appointments.barberId, barberId))

    const list = await db
      .select({
        id: appointments.id,
        barberId: appointments.barberId,
        serviceId: appointments.serviceId,
        clientName: appointments.clientName,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        isWalkIn: appointments.isWalkIn,
      })
      .from(appointments)
      .where(and(...conditions))

    const barberIds = [...new Set(list.map((a) => a.barberId))]
    const [barbersList, servicesList] = await Promise.all([
      barberIds.length ? db.select().from(barbers).where(eq(barbers.isActive, true)) : [],
      db.select().from(services),
    ])
    const barberMap = new Map(barbersList.map((b) => [b.id, b]))
    const serviceMap = new Map(servicesList.map((s) => [s.id, s]))

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Headz Ain\'t Ready//Schedule//EN',
      'CALSCALE:GREGORIAN',
    ]
    for (const a of list) {
      const barber = barberMap.get(a.barberId)
      const service = serviceMap.get(a.serviceId)
      const title = `${service?.name ?? 'Appointment'} – ${a.clientName}${a.isWalkIn ? ' (Walk-in)' : ''}${barber ? ` @ ${barber.name}` : ''}`
      const start = new Date(a.startAt)
      const end = new Date(a.endAt)
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
