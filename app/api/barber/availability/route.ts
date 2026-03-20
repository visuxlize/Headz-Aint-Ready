import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { availability } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { getAllStoreWindows } from '@/lib/barber/store-hours'
import { minutesToPgTime, pgTimeToMinutes } from '@/lib/appointments/time'

const daySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  enabled: z.boolean(),
  startMinutes: z.number().min(0).max(24 * 60 - 1).optional(),
  endMinutes: z.number().min(0).max(24 * 60).optional(),
})

const putSchema = z.object({
  days: z
    .array(daySchema)
    .length(7)
    .refine((days) => new Set(days.map((d) => d.dayOfWeek)).size === 7, {
      message: 'Provide exactly one entry per day (0–6).',
    }),
})

/** GET — current availability rows + store windows for labels */
export async function GET() {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const [rows, store] = await Promise.all([
    db.select().from(availability).where(eq(availability.barberId, auth.user.id)),
    getAllStoreWindows(),
  ])

  return NextResponse.json({ data: { availability: rows, storeHours: store } })
}

/** PUT — replace weekly availability (validated against store hours per day) */
export async function PUT(request: Request) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const storeByDay = new Map((await getAllStoreWindows()).map((s) => [s.dayOfWeek, s]))

  for (const d of parsed.data.days) {
    if (!d.enabled) continue
    if (d.startMinutes == null || d.endMinutes == null) {
      return NextResponse.json({ error: 'Start and end required for enabled days' }, { status: 400 })
    }
    if (d.endMinutes <= d.startMinutes) {
      return NextResponse.json({ error: 'End must be after start' }, { status: 400 })
    }
    const sh = storeByDay.get(d.dayOfWeek)
    if (!sh) continue
    if (!sh.isOpen) {
      return NextResponse.json(
        { error: `Store is closed on day ${d.dayOfWeek}; disable that day or change store hours.` },
        { status: 400 }
      )
    }
    if (d.startMinutes < sh.openMin || d.endMinutes > sh.closeMin) {
      return NextResponse.json(
        {
          error: `Hours for day ${d.dayOfWeek} must fall within store hours (${Math.floor(sh.openMin / 60)}:${String(sh.openMin % 60).padStart(2, '0')} – ${Math.floor(sh.closeMin / 60)}:${String(sh.closeMin % 60).padStart(2, '0')}).`,
        },
        { status: 400 }
      )
    }
  }

  await db.delete(availability).where(eq(availability.barberId, auth.user.id))

  const now = new Date()
  for (const d of parsed.data.days) {
    if (!d.enabled || d.startMinutes == null || d.endMinutes == null) continue
    await db.insert(availability).values({
      barberId: auth.user.id,
      dayOfWeek: d.dayOfWeek,
      startTime: minutesToPgTime(d.startMinutes),
      endTime: minutesToPgTime(d.endMinutes),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  const rows = await db.select().from(availability).where(eq(availability.barberId, auth.user.id))
  return NextResponse.json({ data: rows })
}
