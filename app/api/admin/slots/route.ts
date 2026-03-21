import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { computeBarberSlotIsoStrings } from '@/lib/barber/compute-slots'

const querySchema = z.object({
  barberUserId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().min(15).max(120),
  excludeAppointmentId: z.string().uuid().optional(),
})

/** GET /api/admin/slots — same as barber slots but for any barber (admin) */
export async function GET(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    barberUserId: searchParams.get('barberUserId'),
    date: searchParams.get('date'),
    durationMinutes: searchParams.get('durationMinutes'),
    excludeAppointmentId: searchParams.get('excludeAppointmentId') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const [profile] = await db
      .select()
      .from(barbers)
      .where(eq(barbers.userId, parsed.data.barberUserId))
      .limit(1)
    if (!profile) {
      return NextResponse.json({
        slots: [] as string[],
        warning: 'No roster profile linked to this barber user — cannot compute slots.',
      })
    }

    const slots = await computeBarberSlotIsoStrings({
      barberProfileId: profile.id,
      barberUserId: parsed.data.barberUserId,
      date: parsed.data.date,
      durationMinutes: parsed.data.durationMinutes,
      excludeAppointmentId: parsed.data.excludeAppointmentId ?? null,
    })

    return NextResponse.json({ slots })
  } catch (e) {
    console.error('GET /api/admin/slots:', e)
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg, slots: [] as string[] }, { status: 500 })
  }
}
