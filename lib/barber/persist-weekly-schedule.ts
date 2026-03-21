import { db } from '@/lib/db'
import { availability, barberDayModes } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { allAvailabilityKeyIds, getStaffAvailabilityKeys } from '@/lib/barber/staff-availability-keys'
import { z } from 'zod'
import { minutesToPgTime } from '@/lib/appointments/time'
import { getAllStoreWindows } from '@/lib/barber/store-hours'
import type { StoreDayWindow } from '@/lib/barber/store-hours'

const intervalSchema = z
  .object({
    startMinutes: z.number().int().min(0).max(24 * 60 - 1),
    endMinutes: z.number().int().min(1).max(24 * 60),
  })
  .refine((d) => d.endMinutes > d.startMinutes, { message: 'Interval end must be after start' })

export const putScheduleBodySchema = z
  .object({
    days: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          mode: z.enum(['unavailable', 'open', 'custom']),
          intervals: z.array(intervalSchema).optional(),
        })
      )
      .length(7)
      .refine((days) => new Set(days.map((d) => d.dayOfWeek)).size === 7, {
        message: 'Provide exactly one entry per weekday (0–6).',
      }),
  })
  .refine(
    (body) =>
      body.days.every((d) => {
        if (d.mode !== 'custom') return true
        return (d.intervals?.length ?? 0) >= 1
      }),
    { message: 'Custom days need at least one time interval.' }
  )

export type PutScheduleBody = z.infer<typeof putScheduleBodySchema>

function validateAgainstStore(
  days: PutScheduleBody['days'],
  storeByDay: Map<number, StoreDayWindow>
): string | null {
  for (const d of days) {
    const sh = storeByDay.get(d.dayOfWeek)
    if (!sh?.isOpen) {
      if (d.mode !== 'unavailable') {
        return `Day ${d.dayOfWeek}: shop is closed that day — set schedule to N/A.`
      }
      continue
    }
    if (d.mode === 'unavailable' || d.mode === 'open') continue
    const intervals = d.intervals ?? []
    for (const iv of intervals) {
      if (iv.endMinutes <= iv.startMinutes) return `Day ${d.dayOfWeek}: end time must be after start time.`
      if (iv.startMinutes < sh.openMin || iv.endMinutes > sh.closeMin) {
        return `Day ${d.dayOfWeek}: hours must fall within shop hours for that day.`
      }
    }
  }
  return null
}

export async function persistWeeklySchedule(staffUserId: string, body: PutScheduleBody): Promise<void> {
  const parsed = putScheduleBodySchema.parse(body)
  const storeByDay = new Map((await getAllStoreWindows()).map((s) => [s.dayOfWeek, s]))
  const err = validateAgainstStore(parsed.days, storeByDay)
  if (err) throw new Error(err)

  const now = new Date()
  const keyCtx = await getStaffAvailabilityKeys(staffUserId)
  const deleteKeys = allAvailabilityKeyIds(keyCtx)

  await db.transaction(async (tx) => {
    if (deleteKeys.length > 0) {
      await tx.delete(barberDayModes).where(inArray(barberDayModes.barberId, deleteKeys))
      await tx.delete(availability).where(inArray(availability.barberId, deleteKeys))
    }

    for (const d of parsed.days) {
      await tx.insert(barberDayModes).values({
        barberId: staffUserId,
        dayOfWeek: d.dayOfWeek,
        mode: d.mode,
        createdAt: now,
        updatedAt: now,
      })
      if (d.mode === 'custom' && d.intervals?.length) {
        for (const iv of d.intervals) {
          await tx.insert(availability).values({
            barberId: staffUserId,
            dayOfWeek: d.dayOfWeek,
            startTime: minutesToPgTime(iv.startMinutes),
            endTime: minutesToPgTime(iv.endMinutes),
            isActive: true,
            createdAt: now,
            updatedAt: now,
          })
        }
      }
    }
  })
}
