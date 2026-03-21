import { addMinutes } from 'date-fns'
import {
  appointmentEndUtc,
  appointmentStartUtc,
  normalizeTimeSlot,
  pgTimeToMinutes,
} from '@/lib/appointments/time'

export const SLOT_HEIGHT_PX = 60
export const SLOT_MINUTES = 30
/** 8:00 AM */
export const OPEN_MINUTES = 8 * 60
/** 9:00 PM — grid ends at 21:00 */
export const CLOSE_MINUTES = 21 * 60

export function totalGridHeightPx(): number {
  const slots = (CLOSE_MINUTES - OPEN_MINUTES) / SLOT_MINUTES
  return slots * SLOT_HEIGHT_PX
}

export function timeToMinutesFromOpen(timeSlot: string): number {
  const m = pgTimeToMinutes(normalizeTimeSlot(timeSlot).slice(0, 5))
  return m - OPEN_MINUTES
}

export function minutesFromOpenToTop(minutesFromOpen: number): number {
  return (minutesFromOpen / SLOT_MINUTES) * SLOT_HEIGHT_PX
}

export function durationToHeightPx(durationMinutes: number): number {
  return (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT_PX - 4
}

export interface Interval {
  id: string
  startMin: number
  endMin: number
}

function layoutGreedyInGroup<T extends Interval>(
  items: T[]
): Array<T & { lane: number; laneCount: number }> {
  if (items.length === 0) return []
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  const laneEnds: number[] = []
  const placed: Array<T & { lane: number; laneCount: number }> = []
  for (const item of sorted) {
    let lane = -1
    for (let i = 0; i < laneEnds.length; i++) {
      if (item.startMin >= laneEnds[i]) {
        lane = i
        break
      }
    }
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.endMin)
    } else {
      laneEnds[lane] = item.endMin
    }
    placed.push({ ...item, lane, laneCount: 0 })
  }
  const maxLanes = Math.max(1, laneEnds.length)
  for (const p of placed) {
    p.laneCount = maxLanes
  }
  return placed
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin
}

/** Greedy lane assignment; overlap groups are independent so widths are correct */
export function layoutOverlapLanes<T extends Interval>(
  items: T[]
): Array<T & { lane: number; laneCount: number }> {
  if (items.length === 0) return []
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin)
  const n = sorted.length
  const parent = Array.from({ length: n }, (_, i) => i)
  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]!)
    return parent[i]!
  }
  function union(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (overlaps(sorted[i]!, sorted[j]!)) union(i, j)
    }
  }
  const byRoot = new Map<number, T[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    const list = byRoot.get(r) ?? []
    list.push(sorted[i]!)
    byRoot.set(r, list)
  }
  const out: Array<T & { lane: number; laneCount: number }> = []
  for (const g of byRoot.values()) {
    out.push(...layoutGreedyInGroup(g))
  }
  return out
}

export function yToMinutesFromOpen(yPx: number, gridTopOffset = 0): number {
  const rel = Math.max(0, yPx - gridTopOffset)
  const slotIndex = Math.floor(rel / SLOT_HEIGHT_PX)
  const frac = (rel % SLOT_HEIGHT_PX) / SLOT_HEIGHT_PX
  const base = slotIndex * SLOT_MINUTES
  return Math.min(
    CLOSE_MINUTES - OPEN_MINUTES - SLOT_MINUTES,
    base + Math.round(frac * SLOT_MINUTES)
  )
}

export function minutesFromOpenToTimeString(minutesFromOpen: number): string {
  const total = OPEN_MINUTES + minutesFromOpen
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

export function nowMinutesFromOpen(): number | null {
  const now = new Date()
  const m = now.getHours() * 60 + now.getMinutes()
  if (m < OPEN_MINUTES || m > CLOSE_MINUTES) return null
  return m - OPEN_MINUTES
}

export function isAppointmentHappening(
  appointment: { appointmentDate: string; timeSlot: unknown },
  durationMinutes: number
): boolean {
  const start = appointmentStartUtc(appointment)
  const end = appointmentEndUtc(appointment, durationMinutes)
  const now = new Date()
  return now >= start && now <= end
}
