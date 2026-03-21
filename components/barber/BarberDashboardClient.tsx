'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarGrid,
  type CalendarAppointment,
  type CalendarColumn,
} from '@/components/dashboard/CalendarGrid'
import { DateNavigator } from '@/components/dashboard/DateNavigator'
import { BlockTimeModal } from '@/components/dashboard/BlockTimeModal'
import { NewAppointmentModal } from '@/components/dashboard/NewAppointmentModal'
import { AppointmentPanel } from '@/components/dashboard/AppointmentPanel'
import toast from 'react-hot-toast'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'
import { Area, AreaChart, ResponsiveContainer, XAxis } from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function BarberDashboardClient({
  userId,
  barberColumn,
  displayName,
}: {
  userId: string
  barberColumn: { id: string; name: string; initials: string; avatarUrl: string | null }
  displayName: string
}) {
  const [tab, setTab] = useState<'day' | 'week'>('day')
  const [date, setDate] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [blockedRaw, setBlockedRaw] = useState<
    { id: string; barberId: string; date: string; startTime: string; endTime: string; reason: string }[]
  >([])
  const [newOpen, setNewOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [prefill, setPrefill] = useState({ date: todayStr(), time: '09:00:00' })
  const [panelAppt, setPanelAppt] = useState<CalendarAppointment | null>(null)
  const [stats, setStats] = useState<{ day: string; count: number }[]>([])
  const [unchecked, setUnchecked] = useState(0)

  const range = useMemo(() => {
    if (tab === 'day') {
      const d = format(date, 'yyyy-MM-dd')
      return { start: d, end: d }
    }
    const mon = startOfWeek(date, { weekStartsOn: 1 })
    return { start: format(mon, 'yyyy-MM-dd'), end: format(addDays(mon, 6), 'yyyy-MM-dd') }
  }, [date, tab])

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
      if (!res.ok) throw new Error(j.error || 'Failed')
      setAppointments(j.appointments ?? [])
      setBlockedRaw(j.blockedTimes ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
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
      .channel('barber-cal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        void refresh()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [refresh])

  useEffect(() => {
    void fetch(`/api/barber/appointments?date=${encodeURIComponent(todayStr())}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        const rows = (j.data ?? []) as { status: string; checkedOff: boolean }[]
        const n = rows.filter((x) => x.status === 'pending' && !x.checkedOff).length
        setUnchecked(n)
      })
      .catch(() => {})
  }, [refresh])

  useEffect(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i)
      return format(d, 'yyyy-MM-dd')
    })
    void Promise.all(
      days.map((d) =>
        fetch(`/api/barber/appointments?date=${encodeURIComponent(d)}`, { credentials: 'include' }).then((r) =>
          r.json()
        )
      )
    ).then((results) => {
      const spark = results.map((j, i) => ({
        day: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i] ?? 'D',
        count: Array.isArray(j.data) ? j.data.length : 0,
      }))
      setStats(spark)
    })
  }, [refresh])

  const columns: CalendarColumn[] = useMemo(() => {
    if (tab === 'day') {
      return [
        {
          kind: 'barber',
          id: barberColumn.id,
          staffUserId: barberColumn.id,
          name: barberColumn.name,
          initials: barberColumn.initials,
          avatarUrl: barberColumn.avatarUrl,
        },
      ]
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
  }, [tab, date, barberColumn])

  const anchorDateLabel = format(date, 'yyyy-MM-dd')
  const anchorIsToday = anchorDateLabel === todayStr() && tab === 'day'

  const blockedTimes = blockedRaw.map((b) => ({
    id: b.id,
    barberId: b.barberId,
    startTime: b.startTime,
    endTime: b.endTime,
    label: b.reason,
    date: b.date,
  }))

  async function markDone(id: string) {
    const res = await fetch(`/api/barber/appointments/${id}/complete`, { method: 'POST', credentials: 'include' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || 'Failed')
      return
    }
    toast.success('Marked complete')
    void refresh()
  }

  async function cancelAppt(id: string) {
    const res = await fetch(`/api/barber/appointments/${id}/cancel`, { method: 'PATCH', credentials: 'include' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || 'Failed')
      return
    }
    toast.success('Cancelled')
    void refresh()
  }

  return (
    <div className="space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-serif text-2xl text-headz-black">
          Good morning, {displayName}
        </h1>
        <p className="text-headz-gray text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-headz-gray">
          <span className="rounded-full bg-black/5 px-2 py-1">
            {appointments.filter((a) => a.date === todayStr()).length} appointments today
          </span>
          <span className="rounded-full bg-black/5 px-2 py-1">
            $
            {appointments
              .filter((a) => a.date === todayStr())
              .reduce((s, a) => s + a.price, 0)
              .toFixed(2)}{' '}
            expected
          </span>
          <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-1">{unchecked} awaiting check-off</span>
        </div>
      </div>

      {unchecked > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          You have {unchecked} appointment(s) from earlier today awaiting check-off.
        </div>
      )}

      <div className="flex gap-2 border-b border-black/10 pb-3">
        <button
          type="button"
          onClick={() => setTab('day')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'day' ? 'bg-headz-red text-white' : 'bg-black/5 text-headz-gray'
          }`}
        >
          My Day
        </button>
        <button
          type="button"
          onClick={() => setTab('week')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'week' ? 'bg-headz-red text-white' : 'bg-black/5 text-headz-gray'
          }`}
        >
          My Week
        </button>
      </div>

      <div className="rounded-xl border border-black/10 bg-[#111] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <DateNavigator
            date={date}
            viewMode={tab === 'day' ? 'day' : 'week'}
            onChange={setDate}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPrefill({ date: anchorDateLabel, time: '12:00:00' })
                setBlockOpen(true)
              }}
              className="rounded-lg border border-white/25 px-3 py-2 text-sm text-white/90"
            >
              Block time
            </button>
            <button
              type="button"
              onClick={() => {
                setPrefill({ date: anchorDateLabel, time: '09:00:00' })
                setNewOpen(true)
              }}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-bold text-white"
            >
              New appointment
            </button>
          </div>
        </div>

        {loading ? (
          <Skeleton variant="chart-bar" />
        ) : (
          <CalendarGrid
            columns={columns}
            appointments={appointments}
            blockedTimes={blockedTimes}
            anchorDateLabel={anchorDateLabel}
            anchorIsToday={anchorIsToday}
            onAppointmentClick={(a) => setPanelAppt(a)}
            onSlotClick={({ date: d, time }) => {
              setPrefill({ date: d, time })
              setNewOpen(true)
            }}
            onBlockSlot={({ date: d, time }) => {
              setPrefill({ date: d, time })
              setBlockOpen(true)
            }}
            viewMode={tab === 'day' ? 'day' : 'week'}
            currentUserRole="barber"
            currentUserId={userId}
            variant="barber"
            onMarkDone={markDone}
            onCancel={cancelAppt}
          />
        )}
      </div>

      <details className="rounded-xl border border-black/10 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-headz-black">My stats (this week)</summary>
        <div className="mt-4 h-32">
          {stats.length === 0 ? (
            <Skeleton variant="chart-bar" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="count" stroke="#C0392B" fill="#C0392B33" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </details>

      <AppointmentPanel
        appointment={panelAppt}
        open={!!panelAppt}
        onClose={() => setPanelAppt(null)}
        onBlockTime={() => {
          setPrefill({ date: panelAppt?.date ?? anchorDateLabel, time: panelAppt?.startTime ?? '09:00:00' })
          setBlockOpen(true)
        }}
        onNewAppointment={() => {
          setPrefill({ date: panelAppt?.date ?? anchorDateLabel, time: panelAppt?.startTime ?? '09:00:00' })
          setNewOpen(true)
        }}
        onCharge={() => toast('Open POS to charge', { icon: '💳' })}
        onCancelAppointment={
          panelAppt
            ? async () => {
                const res = await fetch(`/api/barber/appointments/${panelAppt.id}/cancel`, {
                  method: 'PATCH',
                  credentials: 'include',
                })
                const j = await res.json().catch(() => ({}))
                if (!res.ok) {
                  toast.error((j as { error?: string }).error || 'Could not cancel')
                  return
                }
                toast.success('Cancelled')
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
        role="barber"
        barberOptions={[{ id: userId, name: barberColumn.name }]}
        initialBarberId={userId}
        initialDate={prefill.date}
        initialTime={prefill.time}
      />

      <BlockTimeModal
        open={blockOpen}
        onClose={() => {
          setBlockOpen(false)
          void refresh()
        }}
        role="barber"
        barberOptions={[{ id: userId, name: barberColumn.name }]}
        initialBarberId={userId}
        initialDate={prefill.date}
        initialTime={prefill.time}
      />
    </div>
  )
}
