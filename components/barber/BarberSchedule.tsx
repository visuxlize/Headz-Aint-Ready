'use client'

import { useCallback, useEffect, useState } from 'react'
import { ConfirmModal } from '@/components/barber/ConfirmModal'
import { appointmentEndUtc, appointmentStartUtc } from '@/lib/appointments/time'

type ApptRow = {
  id: string
  customerName: string
  serviceName: string
  appointmentDate: string
  timeSlot: string
  status: string
  checkedOff: boolean
  serviceId: string
  durationMinutes: number
}

function formatTimeSlot(ts: string) {
  const t = ts.slice(0, 5)
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return ts
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function statusBadge(status: string) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
  switch (status) {
    case 'pending':
      return `${base} bg-amber-100 text-amber-900`
    case 'completed':
      return `${base} bg-emerald-100 text-emerald-900`
    case 'cancelled':
      return `${base} bg-black/10 text-headz-gray`
    case 'no_show':
      return `${base} bg-red-100 text-red-900`
    default:
      return `${base} bg-black/5 text-headz-black`
  }
}

export function BarberSchedule() {
  const [date, setDate] = useState(todayStr)
  const [rows, setRows] = useState<ApptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeId, setCompleteId] = useState<string | null>(null)
  const [completeLoading, setCompleteLoading] = useState(false)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [reschedule, setReschedule] = useState<ApptRow | null>(null)
  const [resDate, setResDate] = useState('')
  const [resSlots, setResSlots] = useState<string[]>([])
  const [resSlot, setResSlot] = useState('')
  const [resLoading, setResLoading] = useState(false)
  const [resSaving, setResSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/barber/appointments?date=${encodeURIComponent(date)}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void load()
  }, [load])

  const openComplete = (id: string) => {
    setCompleteId(id)
    setCompleteOpen(true)
  }

  const doComplete = async () => {
    if (!completeId) return
    setCompleteLoading(true)
    try {
      const res = await fetch(`/api/barber/appointments/${completeId}/complete`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed')
      }
      setCompleteOpen(false)
      setCompleteId(null)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setCompleteLoading(false)
    }
  }

  const openCancel = (id: string) => {
    setCancelId(id)
    setCancelOpen(true)
  }

  const doCancel = async () => {
    if (!cancelId) return
    setCancelLoading(true)
    try {
      const res = await fetch(`/api/barber/appointments/${cancelId}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed')
      }
      setCancelOpen(false)
      setCancelId(null)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setCancelLoading(false)
    }
  }

  const openReschedule = (a: ApptRow) => {
    setReschedule(a)
    setResDate(a.appointmentDate)
    setResSlots([])
    setResSlot('')
  }

  useEffect(() => {
    if (!reschedule || !resDate) return
    let cancelled = false
    setResLoading(true)
    setError(null)
    const params = new URLSearchParams({
      date: resDate,
      durationMinutes: String(reschedule.durationMinutes),
      excludeAppointmentId: reschedule.id,
    })
    fetch(`/api/barber/slots?${params}`, { credentials: 'include' })
      .then((res) => res.json().then((json) => ({ res, json })))
      .then(({ res, json }) => {
        if (cancelled) return
        if (!res.ok) throw new Error(json.error || 'Failed slots')
        const slots: string[] = json.slots ?? []
        setResSlots(slots)
        setResSlot(slots[0] ?? '')
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load slots')
          setResSlots([])
        }
      })
      .finally(() => {
        if (!cancelled) setResLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reschedule, resDate])

  const doReschedule = async () => {
    if (!reschedule || !resSlot) return
    setResSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/barber/appointments/${reschedule.id}/reschedule`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: resSlot }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to reschedule')
      setReschedule(null)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setResSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Schedule</h1>
        <p className="text-headz-gray text-sm mt-1">Your appointments for the selected day.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-headz-black">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-black/15 rounded-lg bg-white text-headz-black focus:outline-none focus:ring-2 focus:ring-headz-red/30"
          />
        </label>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-black/5 rounded-xl border border-black/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-white p-10 text-center text-headz-gray text-sm">
          No appointments today.
        </div>
      ) : (
        <div className="rounded-xl border border-black/10 bg-white overflow-hidden shadow-sm">
          <ul className="divide-y divide-black/5">
            {rows.map((a) => {
              const now = Date.now()
              const startMs = appointmentStartUtc({
                appointmentDate: a.appointmentDate,
                timeSlot: a.timeSlot,
              }).getTime()
              const endMs = appointmentEndUtc(
                { appointmentDate: a.appointmentDate, timeSlot: a.timeSlot },
                a.durationMinutes
              ).getTime()
              const slotStarted = startMs <= now
              const awaitingCheckoff = a.status === 'pending' && !a.checkedOff && endMs < now
              const markDoneProminent = a.status === 'pending' && slotStarted

              return (
              <li
                key={a.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                  awaitingCheckoff ? 'border-2 border-amber-400 bg-amber-50/40' : ''
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-headz-black truncate">{a.customerName}</p>
                  <p className="text-sm text-headz-gray">
                    {a.serviceName} · {formatTimeSlot(a.timeSlot)} ·{' '}
                    <span className={statusBadge(a.status)}>{a.status.replace(/_/g, ' ')}</span>
                  </p>
                  {awaitingCheckoff && (
                    <p className="text-xs font-medium text-amber-900">Awaiting check-off</p>
                  )}
                </div>
                {a.status === 'pending' && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openComplete(a.id)}
                      className={`px-4 py-2 rounded-lg bg-headz-red text-white font-medium hover:bg-headz-redDark ${
                        markDoneProminent ? 'text-base shadow-md ring-2 ring-headz-red/30' : 'text-sm'
                      }`}
                    >
                      Mark as Done
                    </button>
                    <button
                      type="button"
                      onClick={() => openReschedule(a)}
                      className="px-3 py-1.5 rounded-lg border border-black/15 text-sm font-medium hover:bg-headz-cream/80"
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => openCancel(a.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        </div>
      )}

      <ConfirmModal
        open={completeOpen}
        title="Mark this appointment as done?"
        message="This sets the appointment to completed and checked off."
        confirmLabel="Mark as Done"
        loading={completeLoading}
        onClose={() => {
          setCompleteOpen(false)
          setCompleteId(null)
        }}
        onConfirm={doComplete}
      />

      <ConfirmModal
        open={cancelOpen}
        title="Cancel this appointment?"
        message="The client will no longer see this booking on the schedule."
        confirmLabel="Cancel appointment"
        danger
        loading={cancelLoading}
        onClose={() => {
          setCancelOpen(false)
          setCancelId(null)
        }}
        onConfirm={doCancel}
      />

      {reschedule && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-black/10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-headz-black">Reschedule</h3>
            <p className="text-sm text-headz-gray mt-1">
              {reschedule.customerName} · {reschedule.serviceName}
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Date</label>
                <input
                  type="date"
                  value={resDate}
                  onChange={(e) => setResDate(e.target.value)}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Time</label>
                {resLoading ? (
                  <p className="text-sm text-headz-gray">Loading times…</p>
                ) : resSlots.length === 0 ? (
                  <p className="text-sm text-headz-gray">No slots available for this date.</p>
                ) : (
                  <select
                    value={resSlot}
                    onChange={(e) => setResSlot(e.target.value)}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                  >
                    {resSlots.map((s) => (
                      <option key={s} value={s}>
                        {new Date(s).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                          timeZone: 'America/New_York',
                        })}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setReschedule(null)}
                className="px-4 py-2 rounded-lg border border-black/15 text-sm"
              >
                Close
              </button>
              <button
                type="button"
                disabled={resSaving || !resSlot || resLoading}
                onClick={() => void doReschedule()}
                className="px-4 py-2 rounded-lg bg-headz-red text-white text-sm font-medium disabled:opacity-50"
              >
                {resSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
