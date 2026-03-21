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

  try {
    const [profile] = await db.select().from(barbers).where(eq(barbers.userId, auth.user.id)).limit(1)
    if (!profile) {
      return NextResponse.json({
        slots: [] as string[],
        warning: 'No roster profile linked to your account.',
      })
    }

    const slots = await computeBarberSlotIsoStrings({
      barberProfileId: profile.id,
      barberUserId: auth.user.id,
      date: parsed.data.date,
      durationMinutes: parsed.data.durationMinutes,
      excludeAppointmentId: parsed.data.excludeAppointmentId ?? null,
    })

    return NextResponse.json({ slots })
  } catch (e) {
    console.error('GET /api/barber/slots:', e)
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg, slots: [] as string[] }, { status: 500 })
  }
}
