'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

type RequestRow = {
  id: string
  barberId: string
  barberProfileId: string | null
  barberName: string
  requestedDate: string
  reason: string | null
  status: string
  denialReason: string | null
  createdAt: string
  reviewedAt: string | null
}

type ConflictRow = {
  id: string
  appointmentDate: string
  timeSlot: string
  customerName: string
  serviceName: string
}

type BarberOption = {
  id: string
  barberProfileId: string | null
  displayName: string
  isActive: boolean
}

function formatTimeSlot(ts: string) {
  const t = ts.slice(0, 5)
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return ts
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatSubmitted(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    })
  } catch {
    return iso
  }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AdminTimeOffClient() {
  const [tab, setTab] = useState<'pending' | 'calendar' | 'history'>('pending')
  const [pending, setPending] = useState<RequestRow[]>([])
  const [history, setHistory] = useState<RequestRow[]>([])
  const [barbers, setBarbers] = useState<BarberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [historyBarberId, setHistoryBarberId] = useState('')

  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1)
  const [calDays, setCalDays] = useState<Record<string, { pending: number; approvedBlock: boolean }>>({})
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayRequests, setDayRequests] = useState<RequestRow[]>([])

  const [denyId, setDenyId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState('')

  const [conflictModal, setConflictModal] = useState<{
    requestId: string
    conflicts: ConflictRow[]
  } | null>(null)
  const [reassignMap, setReassignMap] = useState<Record<string, string>>({})

  const loadBarbers = useCallback(async () => {
    const res = await fetch('/api/admin/barbers', { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return
    setBarbers(json.data ?? [])
  }, [])

  const loadPending = useCallback(async () => {
    const res = await fetch('/api/admin/time-off/requests?status=pending', { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Failed')
    setPending(json.data ?? [])
  }, [])

  const loadHistory = useCallback(async () => {
    let url = `/api/admin/time-off/requests?status=resolved&month=${encodeURIComponent(historyMonth)}`
    if (historyBarberId) url += `&barberId=${encodeURIComponent(historyBarberId)}`
    const res = await fetch(url, { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Failed')
    setHistory(json.data ?? [])
  }, [historyMonth, historyBarberId])

  const loadCalendar = useCallback(async () => {
    const res = await fetch(
      `/api/admin/time-off/calendar?year=${calYear}&month=${calMonth}`,
      { credentials: 'include' }
    )
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Failed')
    setCalDays(json.data?.days ?? {})
  }, [calYear, calMonth])

  useEffect(() => {
    void loadBarbers()
  }, [loadBarbers])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadPending(), loadCalendar()])
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [loadPending, loadCalendar])

  useEffect(() => {
    if (tab !== 'history') return
    setLoading(true)
    loadHistory()
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [tab, loadHistory, historyMonth, historyBarberId])

  useEffect(() => {
    if (tab !== 'calendar') return
    void loadCalendar()
  }, [tab, loadCalendar, calYear, calMonth])

  const calendarGrid = useMemo(() => {
    const firstDow = new Date(calYear, calMonth - 1, 1).getDay()
    const lastDate = new Date(calYear, calMonth, 0).getDate()
    const cells: { dateStr: string | null; dayNum: number | null }[] = []
    for (let i = 0; i < firstDow; i++) cells.push({ dateStr: null, dayNum: null })
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ dateStr, dayNum: d })
    }
    while (cells.length % 7 !== 0) cells.push({ dateStr: null, dayNum: null })
    return cells
  }, [calYear, calMonth])

  const openDay = async (dateStr: string) => {
    setSelectedDay(dateStr)
    try {
      const res = await fetch(`/api/admin/time-off/requests?date=${encodeURIComponent(dateStr)}`, {
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed')
      setDayRequests(json.data ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
      setDayRequests([])
    }
  }

  const approveFirst = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/time-off/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 409 && json.conflicts?.length) {
        setConflictModal({ requestId: id, conflicts: json.conflicts })
        setReassignMap(Object.fromEntries(json.conflicts.map((c: ConflictRow) => [c.id, ''])))
        return
      }
      if (!res.ok) throw new Error(json.error || 'Approve failed')
      toast.success('Time off approved')
      setConflictModal(null)
      void loadPending()
      void loadCalendar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed')
    }
  }

  const approveResolve = async (resolution: 'keep' | 'cancel_all' | 'reassign') => {
    if (!conflictModal) return
    const { requestId, conflicts } = conflictModal
    const body: {
      conflictResolution: typeof resolution
      reassignments?: Record<string, string>
    } = { conflictResolution: resolution }
    if (resolution === 'reassign') {
      const map: Record<string, string> = {}
      for (const c of conflicts) {
        const pid = reassignMap[c.id]
        if (!pid) {
          toast.error('Choose a barber for each appointment')
          return
        }
        map[c.id] = pid
      }
      body.reassignments = map
    }
    try {
      const res = await fetch(`/api/admin/time-off/${requestId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Approve failed')
      toast.success('Time off approved')
      setConflictModal(null)
      void loadPending()
      void loadCalendar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed')
    }
  }

  const submitDeny = async () => {
    if (!denyId) return
    try {
      const res = await fetch(`/api/admin/time-off/${denyId}/deny`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denialReason: denyReason.trim() || null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Deny failed')
      toast.success('Request denied')
      setDenyId(null)
      setDenyReason('')
      void loadPending()
      void loadCalendar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Deny failed')
    }
  }

  const reassignOptions = (excludeProfileId: string | null) =>
    barbers.filter((b) => b.isActive && b.barberProfileId && b.barberProfileId !== excludeProfileId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Time off requests</h1>
        <p className="text-sm text-headz-gray mt-1">Review barber requests, approve blocks on the schedule, or deny.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-black/10 pb-3">
        {(
          [
            ['pending', 'Pending'],
            ['calendar', 'Calendar'],
            ['history', 'History'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === k ? 'bg-headz-red text-white' : 'bg-black/5 text-headz-gray hover:bg-black/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-headz-gray text-sm">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="p-10 text-center text-headz-gray text-sm">No pending requests.</div>
          ) : (
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-black/10 bg-headz-black/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-headz-gray">
                  <th className="py-3 px-4">Barber</th>
                  <th className="py-3 px-4">Requested date</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id} className="border-b border-black/5 hover:bg-headz-cream/40">
                    <td className="py-3 px-4 font-medium text-headz-black">{r.barberName}</td>
                    <td className="py-3 px-4 tabular-nums">{r.requestedDate}</td>
                    <td className="py-3 px-4 text-headz-gray max-w-[220px] truncate" title={r.reason ?? ''}>
                      {r.reason || '—'}
                    </td>
                    <td className="py-3 px-4 text-headz-gray text-xs">{formatSubmitted(r.createdAt)}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => void approveFirst(r.id)}
                        className="text-sm font-medium text-emerald-700 hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setDenyId(r.id)}
                        className="text-sm font-medium text-red-700 hover:underline"
                      >
                        Deny
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'calendar' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-2 py-1 rounded border border-black/15 text-sm"
                  onClick={() => {
                    if (calMonth === 1) {
                      setCalYear((y) => y - 1)
                      setCalMonth(12)
                    } else setCalMonth((m) => m - 1)
                  }}
                >
                  ←
                </button>
                <span className="font-semibold text-headz-black min-w-[140px] text-center">
                  {new Date(calYear, calMonth - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  className="px-2 py-1 rounded border border-black/15 text-sm"
                  onClick={() => {
                    if (calMonth === 12) {
                      setCalYear((y) => y + 1)
                      setCalMonth(1)
                    } else setCalMonth((m) => m + 1)
                  }}
                >
                  →
                </button>
              </div>
              <div className="flex gap-4 text-xs text-headz-gray">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-amber-200 border border-amber-400" /> Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-400" /> Approved off
                </span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-headz-gray mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((cell, i) => {
                const ds = cell.dateStr
                if (!ds || cell.dayNum == null) {
                  return <div key={`e-${i}`} className="aspect-square" />
                }
                const info = calDays[ds] ?? { pending: 0, approvedBlock: false }
                const pendingFlag = info.pending > 0
                const approvedFlag = info.approvedBlock
                let bg = 'bg-white border-black/10'
                if (pendingFlag) bg = 'bg-amber-100 border-amber-300'
                else if (approvedFlag) bg = 'bg-red-100 border-red-300'
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => void openDay(ds)}
                    className={`aspect-square rounded-lg border text-sm font-medium flex flex-col items-center justify-center hover:opacity-90 ${bg} ${
                      selectedDay === ds ? 'ring-2 ring-headz-red' : ''
                    }`}
                  >
                    <span>{cell.dayNum}</span>
                    {pendingFlag && info.pending > 1 && (
                      <span className="text-[10px] text-amber-900">{info.pending}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm min-h-[200px]">
            <h3 className="font-semibold text-headz-black mb-2">
              {selectedDay ? `Requests — ${selectedDay}` : 'Select a day'}
            </h3>
            {!selectedDay ? (
              <p className="text-sm text-headz-gray">Click a calendar day to see requests.</p>
            ) : dayRequests.length === 0 ? (
              <p className="text-sm text-headz-gray">No requests on this day.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {dayRequests.map((r) => (
                  <li key={r.id} className="border-b border-black/5 pb-2 last:border-0">
                    <p className="font-medium text-headz-black">{r.barberName}</p>
                    <p className="text-headz-gray text-xs">{r.status}</p>
                    {r.reason && <p className="text-headz-gray mt-1">{r.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-headz-gray mb-1">Month</label>
              <input
                type="month"
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="px-3 py-2 border border-black/15 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-headz-gray mb-1">Barber</label>
              <select
                value={historyBarberId}
                onChange={(e) => setHistoryBarberId(e.target.value)}
                className="px-3 py-2 border border-black/15 rounded-lg text-sm min-w-[180px]"
              >
                <option value="">All</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center text-headz-gray text-sm">Loading…</div>
            ) : history.length === 0 ? (
              <div className="p-10 text-center text-headz-gray text-sm">No history for these filters.</div>
            ) : (
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-black/10 bg-headz-black/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-headz-gray">
                    <th className="py-3 px-4">Barber</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Denial / notes</th>
                    <th className="py-3 px-4">Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} className="border-b border-black/5">
                      <td className="py-3 px-4 font-medium">{r.barberName}</td>
                      <td className="py-3 px-4 tabular-nums">{r.requestedDate}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.status === 'approved' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-headz-gray max-w-[200px] truncate">{r.reason || '—'}</td>
                      <td className="py-3 px-4 text-headz-gray max-w-[200px] truncate text-xs">
                        {r.denialReason || '—'}
                      </td>
                      <td className="py-3 px-4 text-headz-gray text-xs">
                        {r.reviewedAt ? formatSubmitted(r.reviewedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {denyId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-black/10" role="dialog">
            <h3 className="text-lg font-semibold text-headz-black">Deny request</h3>
            <p className="text-sm text-headz-gray mt-1">Optional message shown to the barber in their history.</p>
            <textarea
              className="mt-4 w-full px-3 py-2 border border-black/15 rounded-lg text-sm min-h-[100px]"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Reason for denial"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-black/15 text-sm"
                onClick={() => {
                  setDenyId(null)
                  setDenyReason('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-headz-red text-white text-sm font-medium"
                onClick={() => void submitDeny()}
              >
                Deny request
              </button>
            </div>
          </div>
        </div>
      )}

      {conflictModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-black/10 my-8">
            <h3 className="text-lg font-semibold text-headz-black">Pending appointments that day</h3>
            <p className="text-sm text-headz-gray mt-1">
              This barber still has bookings on {conflictModal.conflicts[0]?.appointmentDate}. Choose how to proceed.
            </p>
            <ul className="mt-4 space-y-3 max-h-56 overflow-y-auto text-sm">
              {conflictModal.conflicts.map((c) => (
                <li key={c.id} className="border border-black/10 rounded-lg p-3">
                  <p className="font-medium text-headz-black">{c.customerName}</p>
                  <p className="text-headz-gray text-xs">
                    {c.serviceName} · {formatTimeSlot(c.timeSlot)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-headz-gray uppercase tracking-wide">Reassign each to</p>
              {conflictModal.conflicts.map((c) => {
                const req = pending.find((p) => p.id === conflictModal.requestId)
                return (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <span className="text-headz-gray shrink-0 truncate max-w-[120px]">{c.customerName}</span>
                    <select
                      className="flex-1 px-2 py-1.5 border border-black/15 rounded-lg text-sm"
                      value={reassignMap[c.id] ?? ''}
                      onChange={(e) =>
                        setReassignMap((m) => ({
                          ...m,
                          [c.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select barber…</option>
                      {reassignOptions(req?.barberProfileId ?? null).map((b) => (
                        <option key={b.id} value={b.barberProfileId ?? ''}>
                          {b.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                className="w-full py-2.5 rounded-lg bg-headz-red text-white text-sm font-medium"
                onClick={() => void approveResolve('reassign')}
              >
                Reassign &amp; approve
              </button>
              <button
                type="button"
                className="w-full py-2.5 rounded-lg border border-red-200 text-red-800 text-sm font-medium"
                onClick={() => void approveResolve('cancel_all')}
              >
                Cancel all appointments &amp; approve
              </button>
              <button
                type="button"
                className="w-full py-2.5 rounded-lg border border-black/15 text-sm font-medium"
                onClick={() => void approveResolve('keep')}
              >
                Keep appointments &amp; approve time off
              </button>
              <button
                type="button"
                className="w-full py-2 text-headz-gray text-sm"
                onClick={() => setConflictModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
