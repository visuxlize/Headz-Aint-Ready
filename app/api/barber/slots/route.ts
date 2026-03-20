import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { computeBarberSlotIsoStrings } from '@/lib/barber/compute-slots'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().min(15).max(120),
  excludeAppointmentId: z.string().uuid().optional(),
})

/** GET /api/barber/slots?date=&durationMinutes=&excludeAppointmentId= */
export async function GET(request: Request) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    date: searchParams.get('date'),
    durationMinutes: searchParams.get('durationMinutes'),
    excludeAppointmentId: searchParams.get('excludeAppointmentId') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 })
  }

  const [profile] = await db.select().from(barbers).where(eq(barbers.userId, auth.user.id)).limit(1)
  if (!profile) {
    return NextResponse.json({ slots: [] })
  }

  const slots = await computeBarberSlotIsoStrings({
    barberProfileId: profile.id,
    barberUserId: auth.user.id,
    date: parsed.data.date,
    durationMinutes: parsed.data.durationMinutes,
    excludeAppointmentId: parsed.data.excludeAppointmentId ?? null,
  })

  return NextResponse.json({ slots })
}
