import { NextResponse } from 'next/server'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { buildScheduleDaysForStaffUser } from '@/lib/barber/build-schedule-response'
import { persistWeeklySchedule, putScheduleBodySchema } from '@/lib/barber/persist-weekly-schedule'

export const dynamic = 'force-dynamic'

/** GET — weekly schedule (modes + intervals) + store hours */
export async function GET() {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  try {
    const data = await buildScheduleDaysForStaffUser(auth.user.id)
    return NextResponse.json({ data })
  } catch (e) {
    console.error('GET /api/barber/availability', e)
    const msg = e instanceof Error ? e.message : 'Failed to load schedule'
    return NextResponse.json(
      {
        error:
          msg.includes('relation') && msg.includes('does not exist')
            ? 'Database tables are missing. Run migrations (e.g. drizzle push or scripts in /scripts) for availability and store_hours.'
            : msg,
      },
      { status: 500 }
    )
  }
}

/** PUT — replace full weekly schedule */
export async function PUT(request: Request) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

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
    await persistWeeklySchedule(auth.user.id, parsed.data)
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
    console.error('PUT /api/barber/availability', e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const data = await buildScheduleDaysForStaffUser(auth.user.id)
  return NextResponse.json({ data, ok: true })
}
