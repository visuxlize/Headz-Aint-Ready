/**
 * Appointments API — retained for staff listing and webhook-mirrored data.
 * New customer bookings are created in Squire, not via POST here (use /book → Squire embed).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { appointments, barbers, users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { isoToNyDateAndTime } from '@/lib/appointments/time'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import {
  API_BURST_LIMIT,
  API_BURST_WINDOW_MS,
  BOOKING_POST_LIMIT,
  BOOKING_POST_WINDOW_MS,
  clientKeyFromRequest,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import { logSecurityEvent } from '@/lib/security/security-log'

const createSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  durationMinutes: z.coerce.number().min(15).max(120),
  clientName: z.string().min(1).max(200),
  clientPhone: z.string().max(50).optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  startAt: z.string().datetime(),
  isWalkIn: z.boolean().optional(),
  noShowAcknowledged: z.boolean().optional(),
  /** Client preference so staff know how they plan to pay */
  paymentMethod: z.enum(['cash', 'card']),
})

/** GET /api/appointments?date=YYYY-MM-DD – list appointments for the day (staff only, scoped by barber) */
export async function GET(request: Request) {
  try {
    const auth = await requireStaffApi()
    if ('error' in auth) return auth.error

    const limited = rateLimitResponse(
      `appt-get:${clientKeyFromRequest(request, auth.user.id)}`,
      API_BURST_LIMIT,
      API_BURST_WINDOW_MS
    )
    if (limited) {
      logSecurityEvent('rate_limit', { route: 'GET /api/appointments', userId: auth.user.id })
      return limited
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
    }

    const base = and(eq(appointments.appointmentDate, date), eq(appointments.status, 'pending'))
    const scoped =
      auth.dbUser.role === 'admin'
        ? base
        : and(base, eq(appointments.barberId, auth.user.id))

    const list = await db.select().from(appointments).where(scoped)
    return NextResponse.json({ data: list })
  } catch (e) {
    console.error('GET /api/appointments', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/appointments – create a new appointment (public booking or staff walk-in) */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: bookingUser },
    } = await supabase.auth.getUser()
    const limited = rateLimitResponse(
      `book:${clientKeyFromRequest(request, bookingUser?.id ?? null)}`,
      BOOKING_POST_LIMIT,
      BOOKING_POST_WINDOW_MS
    )
    if (limited) {
      logSecurityEvent('rate_limit', { route: 'POST /api/appointments' })
      return limited
    }

    const body = await request.json()
    const parsed = createSchema.safeParse({
      ...body,
      clientEmail: body.clientEmail || '',
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data

    const [barberRow] = await db.select().from(barbers).where(eq(barbers.id, data.barberId)).limit(1)
    if (!barberRow?.userId) {
      return NextResponse.json(
        { error: 'This barber is not linked to a staff account yet; booking is unavailable.' },
        { status: 400 }
      )
    }
    const [barberUser] = await db.select().from(users).where(eq(users.id, barberRow.userId)).limit(1)
    if (!barberUser?.isActive) {
      return NextResponse.json({ error: 'This barber is not available for booking.' }, { status: 400 })
    }

    const { date: appointmentDate, timeSlot } = isoToNyDateAndTime(data.startAt)

    const isWalkIn = data.isWalkIn ?? false
    const acknowledged = isWalkIn ? true : data.noShowAcknowledged === true
    if (!acknowledged) {
      return NextResponse.json(
        { error: 'You must acknowledge the no-show policy before confirming.' },
        { status: 400 }
      )
    }

    const [appt] = await db
      .insert(appointments)
      .values({
        barberId: barberRow.userId,
        serviceId: data.serviceId,
        customerName: data.clientName,
        customerPhone: data.clientPhone || null,
        customerEmail: data.clientEmail || null,
        appointmentDate,
        timeSlot,
        isWalkIn,
        status: 'pending',
        noShowAcknowledged: acknowledged,
        paymentMethod: data.paymentMethod,
      })
      .returning()

    return NextResponse.json({ data: appt })
  } catch (e) {
    console.error('POST /api/appointments', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
