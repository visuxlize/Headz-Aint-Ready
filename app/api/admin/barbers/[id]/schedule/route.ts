import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { buildScheduleDaysForStaffUser } from '@/lib/barber/build-schedule-response'
import { persistWeeklySchedule, putScheduleBodySchema } from '@/lib/barber/persist-weekly-schedule'

/** GET /api/admin/barbers/[id]/schedule — id = barbers.id (profile), not users.id */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id: barberProfileId } = await params
  const [profile] = await db.select().from(barbers).where(eq(barbers.id, barberProfileId)).limit(1)
  if (!profile) {
    return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
  }
  if (!profile.userId) {
    return NextResponse.json({ error: 'Barber is not linked to a staff login yet.' }, { status: 400 })
  }

  const data = await buildScheduleDaysForStaffUser(profile.userId)
  return NextResponse.json({ data })
}

/** PUT — replace weekly schedule for a barber */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id: barberProfileId } = await params
  const [profile] = await db.select().from(barbers).where(eq(barbers.id, barberProfileId)).limit(1)
  if (!profile) {
    return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
  }
  if (!profile.userId) {
    return NextResponse.json({ error: 'Barber is not linked to a staff login yet.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = putScheduleBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await persistWeeklySchedule(profile.userId, parsed.data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    if (msg.includes('relation') && msg.includes('barber_day_modes')) {
      return NextResponse.json(
        {
          error:
            'Database migration required: run scripts/add-barber-day-modes.sql (or drizzle migrate) before saving.',
        },
        { status: 503 }
      )
    }
    console.error('PUT /api/admin/barbers/[id]/schedule', e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const data = await buildScheduleDaysForStaffUser(profile.userId)
  return NextResponse.json({ data, ok: true })
}
