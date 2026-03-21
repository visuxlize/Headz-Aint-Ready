'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Clock,
  DollarSign,
  Eye,
  RotateCcw,
  Slash,
  XCircle,
} from 'lucide-react'
import {
  CLOSE_MINUTES,
  OPEN_MINUTES,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  durationToHeightPx,
  isAppointmentHappening,
  layoutOverlapLanes,
  minutesFromOpenToTimeString,
  minutesFromOpenToTop,
  nowMinutesFromOpen,
  timeToMinutesFromOpen,
  yToMinutesFromOpen,
} from '@/lib/dashboard/calendar-math'
import { cn } from '@/lib/utils/cn'
import { appointmentStartUtc } from '@/lib/appointments/time'
import toast from 'react-hot-toast'

function slotForMath(t: string): string {
  return t.length === 5 ? `${t}:00` : t
}

export type CalendarAppointment = {
  id: string
  barberId: string
  customerName: string
  serviceName: string
  startTime: string
  endTime: string
  date: string
  status: 'pending' | 'completed' | 'cancelled' | 'no_show'
  price: number
  checkedOff: boolean
  notes?: string | null
  /** cash | card preference at booking; may reflect completed POS method later */
  paymentMethod?: string | null
  paymentStatus?: string | null
  noShowFee?: number
  waivedAt?: string | null
  barberName?: string
  barberInitials?: string
  durationMinutes?: number
}

export type CalendarColumn =
  | {
      kind: 'barber'
      /** Stable key for column UI + hide toggles (profile id when unlinked) */
      id: string
      /** Auth user id — appointments/blocks match this; null = roster-only column */
      staffUserId: string | null
      name: string
      initials: string
      avatarUrl?: string | null
    }
  | { kind: 'day'; id: string; name: string; dateKey: string }

export type BlockedTimeCard = {
  id?: string
  barberId: string
  startTime: string
  endTime: string
  label: string
  date?: string
}

function parseHHmm(s: string): { h: number; m: number } {
  const [a, b] = s.split(':').map((x) => parseInt(x, 10))
  return { h: Number.isNaN(a) ? 0 : a, m: Number.isNaN(b) ? 0 : b }
}

function minutesFromMidnight(s: string): number {
  const { h, m } = parseHHmm(s)
  return h * 60 + m
}

function durationFromTimes(start: string, end: string): number {
  return Math.max(15, minutesFromMidnight(end) - minutesFromMidnight(start))
}

const SLOT_ROWS = (CLOSE_MINUTES - OPEN_MINUTES) / SLOT_MINUTES

export function CalendarGrid({
  columns,
  appointments,
  blockedTimes,
  anchorDateLabel,
  onAppointmentClick,
  onSlotClick,
  onBlockSlot,
  viewMode: _viewMode,
  currentUserRole,
  currentUserId,
  variant = 'admin',
  showSummaryColumn = false,
  visibleBarberIds = null,
  mobileBarberId = null,
  anchorIsToday = true,
  onMarkDone,
  onReschedule,
  onCancel,
}: {
  columns: CalendarColumn[]
  appointments: CalendarAppointment[]
  blockedTimes: BlockedTimeCard[]
  anchorDateLabel: string
  onAppointmentClick: (a: CalendarAppointment) => void
  onSlotClick: (payload: { barberId: string | null; date: string; time: string }) => void
  onBlockSlot: (payload: { barberId: string | null; date: string; time: string }) => void
  viewMode: 'day' | '3day' | 'week'
  currentUserRole: 'admin' | 'barber'
  currentUserId: string
  variant?: 'admin' | 'barber'
  showSummaryColumn?: boolean
  visibleBarberIds?: string[] | null
  mobileBarberId?: string | null
  /** When false, hide “now” line and highlight in time column */
  anchorIsToday?: boolean
  onMarkDone?: (id: string) => void
  onReschedule?: (a: CalendarAppointment) => void
  onCancel?: (id: string) => void
}) {
  const [tick, setTick] = useState(0)
  const [slotMenu, setSlotMenu] = useState<{
    x: number
    y: number
    barberId: string | null
    date: string
    time: string
  } | null>(null)

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (!slotMenu) return
    const close = () => setSlotMenu(null)
    const id = window.setTimeout(() => {
      window.addEventListener('click', close)
    }, 0)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('click', close)
    }
  }, [slotMenu])

  const nowTop = useMemo(() => {
    void tick
    if (!anchorIsToday) return null
    const m = nowMinutesFromOpen()
    if (m === null) return null
    return minutesFromOpenToTop(m)
  }, [tick, anchorIsToday])

  const nowClock = useMemo(() => {
    void tick
    const d = new Date()
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }, [tick])

  const timeLabels = useMemo(() => {
    const labels: { label: string; top: number; isNow: boolean }[] = []
    for (let i = 0; i < SLOT_ROWS; i++) {
      const m = i * SLOT_MINUTES
      const total = OPEN_MINUTES + m
      const h = Math.floor(total / 60)
      const min = total % 60
      const hour12 = h % 12 === 0 ? 12 : h % 12
      const ampm = h < 12 ? 'AM' : 'PM'
      const label = `${hour12}:${String(min).padStart(2, '0')} ${ampm}`
      const nowM = anchorIsToday ? nowMinutesFromOpen() : null
      const isNow = nowM !== null && Math.floor(nowM / SLOT_MINUTES) === i
      labels.push({ label, top: i * SLOT_HEIGHT_PX, isNow })
    }
    return labels
  }, [tick, anchorIsToday])

  const filteredAppts = useMemo(() => {
    let list = appointments
    if (visibleBarberIds !== undefined && visibleBarberIds !== null) {
      if (visibleBarberIds.length === 0) {
        list = []
      } else {
        const set = new Set(visibleBarberIds)
        list = list.filter((a) => set.has(a.barberId))
      }
    }
    if (mobileBarberId) {
      const col = columns.find((c) => c.kind === 'barber' && c.id === mobileBarberId)
      if (col?.kind === 'barber') {
        if (col.staffUserId) list = list.filter((a) => a.barberId === col.staffUserId)
        else list = []
      }
    }
    return list
  }, [appointments, visibleBarberIds, mobileBarberId, columns])

  const displayColumns = useMemo(() => {
    if (mobileBarberId && columns[0]?.kind === 'barber') {
      return columns.filter((c) => c.kind === 'barber' && c.id === mobileBarberId)
    }
    return columns
  }, [columns, mobileBarberId])

  const summaryCounts = useMemo(() => {
    const counts: number[] = Array.from({ length: SLOT_ROWS }, () => 0)
    if (!showSummaryColumn) return counts
    for (const a of filteredAppts) {
      const start = timeToMinutesFromOpen(slotForMath(a.startTime))
      const idx = Math.floor(start / SLOT_MINUTES)
      if (idx >= 0 && idx < SLOT_ROWS) counts[idx] += 1
    }
    return counts
  }, [filteredAppts, showSummaryColumn])

  const gridHeight = SLOT_ROWS * SLOT_HEIGHT_PX

  const handleColumnMouseDown = useCallback(
    (e: React.MouseEvent, col: CalendarColumn) => {
      if ((e.target as HTMLElement).closest('[data-appt-card]')) return
    const colEl = (e.currentTarget as HTMLElement).querySelector('[data-slot-area]') as HTMLElement | null
      if (!colEl) return
      const r = colEl.getBoundingClientRect()
      const y = e.clientY - r.top
      const mfo = yToMinutesFromOpen(y)
      const time = minutesFromOpenToTimeString(mfo)
      const date =
        col.kind === 'day'
          ? col.dateKey
          : anchorDateLabel
      const barberId =
        col.kind === 'barber' ? col.staffUserId : currentUserRole === 'barber' ? currentUserId : null
      e.stopPropagation()
      setSlotMenu({
        x: e.clientX,
        y: e.clientY,
        barberId,
        date,
        time,
      })
    },
    [anchorDateLabel, currentUserId, currentUserRole]
  )

  return (
    <div className="relative flex min-h-0 flex-1 flex-col rounded-lg border border-[#1E1E1E] bg-[#111111] text-white overflow-hidden">
      {slotMenu && (
        <div
          role="presentation"
          className="fixed z-[100] w-[200px] rounded-xl border border-[#2a4a7a] bg-[#1E3A5F] p-2 text-left shadow-xl"
          style={{ left: slotMenu.x, top: slotMenu.y, transform: 'translate(-50%, -100%) translateY(-8px)' }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] uppercase tracking-wide text-white/50 mb-1">Slot</p>
          <button
            type="button"
            className="block w-full rounded-lg px-2 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => {
              if (!slotMenu.barberId && variant === 'admin') {
                toast.error('This barber is not linked to a login yet — link them before booking.')
                setSlotMenu(null)
                return
              }
              onSlotClick({
                barberId: slotMenu.barberId,
                date: slotMenu.date,
                time: slotMenu.time,
              })
              setSlotMenu(null)
            }}
          >
            Add an appointment +
          </button>
          <button
            type="button"
            className="block w-full rounded-lg px-2 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => {
              const bid = slotMenu.barberId ?? (variant === 'barber' ? currentUserId : null)
              if (!bid) {
                toast.error('Link this barber to a staff login before blocking time.')
                setSlotMenu(null)
                return
              }
              onBlockSlot({
                barberId: bid,
                date: slotMenu.date,
                time: slotMenu.time,
              })
              setSlotMenu(null)
            }}
          >
            Block time ⊘
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div className="inline-flex flex-col min-w-full">
          <div className="flex sticky top-0 z-20 bg-[#111] border-b border-[#2A2A2A]">
            <div className="sticky left-0 z-30 w-[60px] shrink-0 bg-[#111] h-14 border-r border-[#2A2A2A]" />
            {showSummaryColumn && (
              <div className="h-14 w-20 shrink-0 flex items-center justify-center border-r border-[#2A2A2A] text-[10px] text-[#666]">
                All
              </div>
            )}
            {displayColumns.map((col) => (
              <div
                key={col.id}
                className="h-14 min-w-[140px] flex-1 flex items-center gap-2 px-2 border-r border-[#2A2A2A] bg-[#1A1A1A]"
              >
                <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                  {col.kind === 'barber' && col.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={col.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{col.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{col.name}</p>
                </div>
                <Clock className="w-4 h-4 text-[#555] shrink-0" />
              </div>
            ))}
          </div>

          <div className="flex relative">
            {nowTop !== null && (
              <div
                className="pointer-events-none absolute z-30"
                style={{
                  left: showSummaryColumn ? 140 : 60,
                  right: 0,
                  top: 56 + nowTop,
                }}
              >
                <div className="relative h-px w-full bg-[#3B82F6]">
                  <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#3B82F6]" />
                </div>
              </div>
            )}
            <div className="sticky left-0 z-20 w-[60px] shrink-0 bg-[#111] border-r border-[#1E1E1E] relative">
              {timeLabels.map(({ label, top, isNow }) => (
                <div
                  key={label}
                  className="absolute left-0 right-0 flex items-start justify-center pt-1"
                  style={{ top, height: SLOT_HEIGHT_PX }}
                >
                  {isNow ? (
                    <span className="rounded bg-[#3B82F6] px-1.5 py-0.5 text-xs font-semibold text-white">
                      {nowClock}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#666]">{label}</span>
                  )}
                </div>
              ))}
              <div style={{ height: gridHeight }} />
            </div>

            {showSummaryColumn && (
              <div className="w-20 shrink-0 border-r border-[#1E1E1E] relative bg-[#111]" style={{ height: gridHeight }}>
                {summaryCounts.map((n, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 flex items-center justify-center gap-0.5"
                    style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
                  >
                    {Array.from({ length: Math.min(n, 5) }).map((_, j) => (
                      <span key={j} className="w-1.5 h-1.5 rounded-full bg-[#555]" />
                    ))}
                  </div>
                ))}
                {Array.from({ length: SLOT_ROWS }).map((_, i) => (
                  <div
                    key={`g-${i}`}
                    className="absolute left-0 right-0 border-t border-[#1E1E1E] pointer-events-none"
                    style={{ top: i * SLOT_HEIGHT_PX }}
                  />
                ))}
              </div>
            )}

            {displayColumns.map((col) => (
              <ColumnBody
                key={col.id}
                col={col}
                anchorDateLabel={anchorDateLabel}
                appointments={filteredAppts}
                blockedTimes={blockedTimes}
                gridHeight={gridHeight}
                onAppointmentClick={onAppointmentClick}
                variant={variant}
                currentUserRole={currentUserRole}
                onMarkDone={onMarkDone}
                onReschedule={onReschedule}
                onCancel={onCancel}
                onMouseDown={(e) => handleColumnMouseDown(e, col)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ColumnBody({
  col,
  anchorDateLabel,
  appointments,
  blockedTimes,
  gridHeight,
  onAppointmentClick,
  variant,
  currentUserRole,
  onMarkDone,
  onReschedule,
  onCancel,
  onMouseDown,
}: {
  col: CalendarColumn
  anchorDateLabel: string
  appointments: CalendarAppointment[]
  blockedTimes: BlockedTimeCard[]
  gridHeight: number
  onAppointmentClick: (a: CalendarAppointment) => void
  variant: 'admin' | 'barber'
  currentUserRole: 'admin' | 'barber'
  onMarkDone?: (id: string) => void
  onReschedule?: (a: CalendarAppointment) => void
  onCancel?: (id: string) => void
  onMouseDown: (e: React.MouseEvent) => void
}) {
  const dateKey = col.kind === 'day' ? col.dateKey : anchorDateLabel

  const colAppts = useMemo(() => {
    return appointments.filter((a) => {
      if (a.date !== dateKey) return false
      if (col.kind === 'barber') {
        if (!col.staffUserId) return false
        return a.barberId === col.staffUserId
      }
      return true
    })
  }, [appointments, col, dateKey])

  const colBlocked = useMemo(() => {
    return blockedTimes.filter((b) => {
      const d = b.date ?? anchorDateLabel
      if (d !== dateKey) return false
      if (col.kind === 'barber') {
        if (!col.staffUserId) return false
        return b.barberId === col.staffUserId
      }
      return true
    })
  }, [blockedTimes, col, dateKey, anchorDateLabel])

  const laidOut = useMemo(() => {
    const intervals = colAppts.map((a) => {
      const dur =
        a.durationMinutes ?? durationFromTimes(a.startTime, a.endTime)
      const startMin = timeToMinutesFromOpen(slotForMath(a.startTime))
      const endMin = startMin + dur
      return {
        id: a.id,
        startMin,
        endMin,
        appt: a,
      }
    })
    const lanes = layoutOverlapLanes(intervals)
    return lanes
  }, [colAppts])

  const blockedLayouts = useMemo(() => {
    return colBlocked.map((b) => {
      const startMin = timeToMinutesFromOpen(slotForMath(b.startTime))
      const endMin = timeToMinutesFromOpen(slotForMath(b.endTime))
      return {
        id: b.id ?? b.label,
        startMin,
        endMin,
        blocked: b,
      }
    })
  }, [colBlocked])

  return (
    <div
      className="relative min-w-[140px] flex-1 border-r border-[#1E1E1E] bg-[#111]"
      onMouseDown={onMouseDown}
    >
      <div className="relative" style={{ height: gridHeight }} data-slot-area>
        {Array.from({ length: SLOT_ROWS }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-[#1E1E1E] pointer-events-none"
            style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
          />
        ))}

        {blockedLayouts.map((b) => {
          const top = minutesFromOpenToTop(b.startMin)
          const h = durationToHeightPx(b.endMin - b.startMin)
          return (
            <div
              key={b.id}
              className="absolute left-1 right-1 rounded-md overflow-hidden z-[5]"
              style={{
                top,
                height: Math.max(h, 24),
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  #2a2a2a,
                  #2a2a2a 6px,
                  #1a1a1a 6px,
                  #1a1a1a 12px
                )`,
              }}
            >
              <div className="p-2 text-[11px] text-[#999]">
                <div className="font-semibold text-white/80">Block</div>
                <div className="truncate">{b.blocked.label}</div>
              </div>
            </div>
          )
        })}

        {laidOut.map((item) => {
          const a = item.appt
          const dur = a.durationMinutes ?? durationFromTimes(a.startTime, a.endTime)
          const top = minutesFromOpenToTop(item.startMin)
          const h = durationToHeightPx(dur)
          const wPct = 100 / item.laneCount
          const leftPct = (100 / item.laneCount) * item.lane
          const happening = isAppointmentHappening(
            { appointmentDate: a.date, timeSlot: slotForMath(a.startTime) },
            dur
          )
          const status = a.status
          const pending = status === 'pending'
          const completed = status === 'completed'
          const noShow = status === 'no_show'
          const awaiting =
            pending &&
            !a.checkedOff &&
            appointmentStartUtc({ appointmentDate: a.date, timeSlot: slotForMath(a.startTime) }) <
              new Date()

          let bg = pending ? 'bg-[#1E2A1E]' : noShow ? 'bg-[#2A1A1A]' : 'bg-[#1A1A1A]'
          let borderL = pending
            ? 'border-l-[3px] border-l-[#C0392B]'
            : completed
              ? 'border-l-[3px] border-l-[#27AE60]'
              : 'border-l-[3px] border-l-[#555]'
          if (awaiting) {
            borderL = 'border-l-[3px] border-l-amber-500'
            bg = 'bg-amber-950/40'
          }
          if (happening) {
            borderL = 'border-l-[3px] border-l-[#3B82F6]'
            bg = 'bg-blue-950/30'
          }

          const dot =
            completed ? 'bg-emerald-500' : pending ? 'bg-amber-500' : status === 'cancelled' ? 'bg-red-500' : 'bg-[#555]'

          return (
            <div
              key={a.id}
              data-appt-card
              className={cn(
                'absolute z-[8] rounded-md p-2 shadow-sm cursor-pointer',
                bg,
                borderL
              )}
              style={{
                top,
                height: Math.max(h, 48),
                width: `${wPct}%`,
                left: `${leftPct}%`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onAppointmentClick(a)
              }}
            >
              <div className={cn('absolute top-2 right-2 w-2 h-2 rounded-full', dot)} />
              <p className="text-[13px] font-semibold text-white pr-3 truncate">{a.customerName}</p>
              <p className="text-[11px] text-[#999999] truncate">
                {col.kind === 'day' && a.barberName ? `${a.barberName} · ` : ''}
                {a.serviceName}
              </p>
              <p className="text-[11px] text-[#666666]">
                {a.startTime}–{a.endTime}
              </p>
              <div className="absolute bottom-1.5 right-1.5 flex flex-col items-end gap-0.5">
                {a.status === 'no_show' &&
                  (a.noShowFee ?? 0) > 0 &&
                  !a.waivedAt && (
                    <span className="rounded bg-red-950/90 px-1.5 py-0.5 text-[9px] font-semibold text-red-200">
                      ${Number(a.noShowFee).toFixed(0)} fee
                    </span>
                  )}
                {a.status !== 'no_show' && a.paymentStatus === 'paid' && a.paymentMethod === 'card' && (
                  <span className="rounded bg-emerald-950/90 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200">
                    💳 Paid
                  </span>
                )}
                {a.status !== 'no_show' && a.paymentStatus === 'paid' && a.paymentMethod === 'cash' && (
                  <span className="rounded bg-emerald-950/90 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200">
                    💵 Paid
                  </span>
                )}
                {a.status === 'pending' && a.paymentStatus !== 'paid' && (
                  <span className="rounded bg-amber-950/90 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200">
                    Unpaid
                  </span>
                )}
              </div>
              {awaiting && (
                <p className="text-[10px] text-amber-400 mt-1">Awaiting check-off</p>
              )}
              {variant === 'admin' && (
                <div className="mt-2 flex gap-1">
                  <button type="button" className="p-1 text-[#555] hover:text-[#C0392B]" aria-label="View">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1 text-[#555] hover:text-[#C0392B]" aria-label="Reschedule">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1 text-[#555] hover:text-[#C0392B]" aria-label="Cancel">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1 text-[#555] hover:text-[#C0392B]" aria-label="Charge">
                    <DollarSign className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {variant === 'barber' && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-[11px] font-medium bg-emerald-700/50 text-emerald-200 hover:bg-emerald-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMarkDone?.(a.id)
                    }}
                  >
                    ✓ Done
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-[11px] font-medium bg-white/10 text-white/80 hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      onReschedule?.(a)
                    }}
                  >
                    ↺ Reschedule
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-[11px] font-medium bg-red-900/50 text-red-200 hover:bg-red-900"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCancel?.(a.id)
                    }}
                  >
                    × Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
