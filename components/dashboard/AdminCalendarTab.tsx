'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarGrid,
  type CalendarAppointment,
  type CalendarColumn,
} from '@/components/dashboard/CalendarGrid'
import { DateNavigator } from '@/components/dashboard/DateNavigator'
import { ViewSwitcher, type DashboardViewMode } from '@/components/dashboard/ViewSwitcher'
import { AppointmentPanel } from '@/components/dashboard/AppointmentPanel'
import { BlockTimeModal } from '@/components/dashboard/BlockTimeModal'
import { NewAppointmentModal } from '@/components/dashboard/NewAppointmentModal'
import type { ActiveBarberColumn } from '@/lib/dashboard/active-barbers'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import toast from 'react-hot-toast'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function getRange(date: Date, view: DashboardViewMode): { start: string; end: string } {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  if (view === 'day' || view === 'schedule_list') return { start: fmt(date), end: fmt(date) }
  if (view === '3day') return { start: fmt(date), end: fmt(addDays(date, 2)) }
  if (view === 'month') {
    return { start: fmt(startOfMonth(date)), end: fmt(endOfMonth(date)) }
  }
  if (view === 'week') {
    const mon = startOfWeek(date, { weekStartsOn: 1 })
    const sun = endOfWeek(date, { weekStartsOn: 1 })
    return { start: fmt(mon), end: fmt(sun) }
  }
  return { start: fmt(date), end: fmt(date) }
}

function gridViewMode(v: DashboardViewMode): 'day' | '3day' | 'week' {
  if (v === '3day') return '3day'
  if (v === 'week' || v === 'month') return 'week'
  return 'day'
}

function useIsMobile() {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setM(mq.matches)
    const fn = () => setM(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return m
}

export function AdminCalendarTab({
  barbers,
  userId,
}: {
  barbers: ActiveBarberColumn[]
  userId: string
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [date, setDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<DashboardViewMode>('day')
  const [calendarView, setCalendarView] = useState<'day' | '3day' | 'week'>('day')
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [blockedRaw, setBlockedRaw] = useState<
    { id: string; barberId: string; date: string; startTime: string; endTime: string; reason: string }[]
  >([])
  const [panelAppt, setPanelAppt] = useState<CalendarAppointment | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [prefill, setPrefill] = useState<{
    barberId: string | null
    date: string
    time: string
  }>({ barberId: null, date: todayStr(), time: '09:00:00' })
  const [hiddenBarberIds, setHiddenBarberIds] = useState<Set<string>>(new Set())
  const [mobileBarberId, setMobileBarberId] = useState<string | null>(null)

  useEffect(() => {
    if (viewMode === 'schedule_list') {
      router.push('/dashboard/schedule')
    }
  }, [viewMode, router])

  useEffect(() => {
    setCalendarView(gridViewMode(viewMode))
  }, [viewMode])

  const range = useMemo(() => getRange(date, viewMode === 'schedule_list' ? 'day' : viewMode), [date, viewMode])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const u = new URL('/api/dashboard/calendar', window.location.origin)
      u.searchParams.set('start', range.start)
      u.searchParams.set('end', range.end)
      const res = await fetch(u.toString(), { credentials: 'include' })
      const j = await parseJsonResponse<{
        error?: string
        appointments?: CalendarAppointment[]
        blockedTimes?: Array<{
          id: string
          barberId: string
          date: string
          startTime: string
          endTime: string
          reason: string
        }>
      }>(res)
      if (!res.ok) throw new Error(j.error || `Failed (${res.status})`)
      const appts = j.appointments ?? []
      setAppointments(appts)
      setBlockedRaw(j.blockedTimes ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [range.start, range.end])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel('appointments-admin-cal')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          void refresh()
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [refresh])

  const firstLinkedStaffId = useMemo(
    () => barbers.find((b) => b.staffUserId)?.staffUserId ?? null,
    [barbers]
  )

  const linkedBarberSelectOptions = useMemo(
    () =>
      barbers
        .filter((b) => b.staffUserId)
        .map((b) => ({ id: b.staffUserId!, name: b.name })),
    [barbers]
  )

  const columns: CalendarColumn[] = useMemo(() => {
    if (viewMode === 'day' || viewMode === 'schedule_list') {
      return barbers.map((b) => ({
        kind: 'barber' as const,
        id: b.id,
        staffUserId: b.staffUserId,
        name: b.name,
        initials: b.initials,
        avatarUrl: b.avatarUrl,
      }))
    }
    if (viewMode === '3day') {
      return [0, 1, 2].map((i) => {
        const d = addDays(date, i)
        return {
          kind: 'day' as const,
          id: format(d, 'yyyy-MM-dd'),
          name: format(d, 'EEE'),
          dateKey: format(d, 'yyyy-MM-dd'),
        }
      })
    }
    const mon = startOfWeek(date, { weekStartsOn: 1 })
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(mon, i)
      return {
        kind: 'day' as const,
        id: format(d, 'yyyy-MM-dd'),
        name: format(d, 'EEE'),
        dateKey: format(d, 'yyyy-MM-dd'),
      }
    })
  }, [barbers, date, viewMode])

  const anchorDateLabel = format(date, 'yyyy-MM-dd')
  const anchorIsToday =
    anchorDateLabel === todayStr() && (viewMode === 'day' || viewMode === 'schedule_list')

  const blockedTimes = useMemo(
    () =>
      blockedRaw.map((b) => ({
        id: b.id,
        barberId: b.barberId,
        startTime: b.startTime,
        endTime: b.endTime,
        label: b.reason,
        date: b.date,
      })),
    [blockedRaw]
  )

  const visibleBarberIds =
    hiddenBarberIds.size === 0
      ? undefined
      : barbers
          .filter((b) => !hiddenBarberIds.has(b.id) && b.staffUserId)
          .map((b) => b.staffUserId!)

  const navViewMode: 'day' | '3day' | 'week' | 'month' =
    viewMode === 'schedule_list'
      ? 'day'
      : viewMode === 'day'
        ? 'day'
        : viewMode === '3day'
          ? '3day'
          : viewMode === 'week'
            ? 'week'
            : 'month'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 text-white">
      <div className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center gap-3 border-b border-[#2A2A2A] bg-[#111] px-4 py-3 sm:px-6">
        <DateNavigator date={date} viewMode={navViewMode} onChange={setDate} />
        <div className="flex flex-1 justify-center">
          <ViewSwitcher value={viewMode} onChange={setViewMode} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!firstLinkedStaffId}
            title={!firstLinkedStaffId ? 'Link at least one barber to a staff account first' : undefined}
            onClick={() => {
              setPrefill({ barberId: firstLinkedStaffId, date: anchorDateLabel, time: '12:00:00' })
              setBlockOpen(true)
            }}
            className="rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Block time
          </button>
          <button
            type="button"
            disabled={!firstLinkedStaffId}
            title={!firstLinkedStaffId ? 'Link at least one barber to a staff account first' : undefined}
            onClick={() => {
              setPrefill({ barberId: firstLinkedStaffId, date: anchorDateLabel, time: '09:00:00' })
              setNewOpen(true)
            }}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            New appointment
          </button>
        </div>
      </div>

      {(viewMode === 'week' || viewMode === 'month') && barbers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {barbers.map((b) => {
            const hidden = hiddenBarberIds.has(b.id)
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setHiddenBarberIds((prev) => {
                    const n = new Set(prev)
                    if (n.has(b.id)) n.delete(b.id)
                    else n.add(b.id)
                    return n
                  })
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  !hidden ? 'border-headz-red text-headz-red bg-headz-red/10' : 'border-white/20 text-white/50'
                }`}
              >
                {b.name}
              </button>
            )
          })}
        </div>
      )}

      {isMobile && viewMode === 'day' && barbers.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-white/70">Barber</label>
          <select
            value={mobileBarberId ?? barbers[0]?.id ?? ''}
            onChange={(e) => setMobileBarberId(e.target.value)}
            className="rounded-lg border border-white/15 bg-[#1A1A1A] px-3 py-2 text-sm"
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4 sm:px-6">
        {loading ? (
          <p className="text-sm text-white/50">Loading calendar…</p>
        ) : (
          <CalendarGrid
          columns={columns}
          appointments={appointments}
          blockedTimes={blockedTimes}
          anchorDateLabel={anchorDateLabel}
          anchorIsToday={anchorIsToday}
          onAppointmentClick={(a) => setPanelAppt(a)}
          onSlotClick={({ barberId, date: d, time }) => {
            setPrefill({ barberId, date: d, time })
            setNewOpen(true)
          }}
          onBlockSlot={({ barberId, date: d, time }) => {
            setPrefill({ barberId, date: d, time })
            setBlockOpen(true)
          }}
          viewMode={calendarView}
          currentUserRole="admin"
          currentUserId={userId}
          variant="admin"
          showSummaryColumn={viewMode === 'day' || viewMode === 'schedule_list'}
          visibleBarberIds={visibleBarberIds}
          mobileBarberId={mobileBarberId}
        />
        )}
      </div>

      <AppointmentPanel
        appointment={panelAppt}
        open={!!panelAppt}
        onClose={() => setPanelAppt(null)}
        onBlockTime={() => {
          setPrefill({
            barberId: panelAppt?.barberId ?? firstLinkedStaffId,
            date: panelAppt?.date ?? anchorDateLabel,
            time: panelAppt?.startTime ?? '09:00:00',
          })
          setBlockOpen(true)
        }}
        onNewAppointment={() => {
          setPrefill({
            barberId: panelAppt?.barberId ?? firstLinkedStaffId,
            date: panelAppt?.date ?? anchorDateLabel,
            time: panelAppt?.startTime ?? '09:00:00',
          })
          setNewOpen(true)
        }}
        onCharge={() => toast('Open POS to charge', { icon: '💳' })}
        onCancelAppointment={
          panelAppt
            ? async () => {
                const id = panelAppt.id
                const res = await fetch(`/api/appointments/${id}`, {
                  method: 'PATCH',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'cancelled' }),
                })
                const j = await res.json().catch(() => ({}))
                if (!res.ok) {
                  toast.error((j as { error?: string }).error || 'Could not cancel')
                  return
                }
                toast.success('Appointment cancelled')
                setPanelAppt(null)
                void refresh()
              }
            : undefined
        }
        onAddProducts={() => toast('Add products from the POS screen', { icon: '🧴' })}
      />

      <NewAppointmentModal
        open={newOpen}
        onClose={() => {
          setNewOpen(false)
          void refresh()
        }}
        role="admin"
        barberOptions={linkedBarberSelectOptions}
        initialBarberId={prefill.barberId}
        initialDate={prefill.date}
        initialTime={prefill.time}
      />

      <BlockTimeModal
        key={blockOpen ? `${prefill.barberId ?? ''}-${prefill.date}-${prefill.time}` : 'closed'}
        open={blockOpen}
        onClose={() => {
          setBlockOpen(false)
          void refresh()
        }}
        role="admin"
        barberOptions={linkedBarberSelectOptions}
        initialBarberId={prefill.barberId ?? firstLinkedStaffId ?? ''}
        initialDate={prefill.date}
        initialTime={prefill.time}
      />
    </div>
  )
}
