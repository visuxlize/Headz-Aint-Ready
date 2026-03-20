'use client'

import { useEffect, useMemo, useState } from 'react'

/** Monday-first display order; values are JS day-of-week (Sun=0 … Sat=6). */
const WEEK: { label: string; dayOfWeek: number }[] = [
  { label: 'Monday', dayOfWeek: 1 },
  { label: 'Tuesday', dayOfWeek: 2 },
  { label: 'Wednesday', dayOfWeek: 3 },
  { label: 'Thursday', dayOfWeek: 4 },
  { label: 'Friday', dayOfWeek: 5 },
  { label: 'Saturday', dayOfWeek: 6 },
  { label: 'Sunday', dayOfWeek: 0 },
]

type StoreDay = {
  dayOfWeek: number
  openMin: number
  closeMin: number
  isOpen: boolean
}

type AvRow = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

function minToTimeInput(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function timeInputToMinutes(s: string) {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

function storeLabel(sh: StoreDay | undefined) {
  if (!sh) return 'Store hours: 9:00 AM – 8:00 PM (default)'
  if (!sh.isOpen) return 'Store closed this day'
  return `Store hours: ${minToTimeInput(sh.openMin)} – ${minToTimeInput(sh.closeMin)}`
}

export function BarberAvailabilityClient() {
  const [storeHours, setStoreHours] = useState<StoreDay[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [form, setForm] = useState<
    Record<number, { enabled: boolean; start: string; end: string }>
  >(() => {
    const init: Record<number, { enabled: boolean; start: string; end: string }> = {}
    for (const { dayOfWeek } of WEEK) {
      init[dayOfWeek] = { enabled: false, start: '09:00', end: '17:00' }
    }
    return init
  })

  const storeByDay = useMemo(() => new Map(storeHours.map((s) => [s.dayOfWeek, s])), [storeHours])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/barber/availability', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (!json.data) throw new Error(json.error || 'Failed')
        setStoreHours(json.data.storeHours ?? [])
        const rows: AvRow[] = json.data.availability ?? []
        const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]))
        setForm((prev) => {
          const next = { ...prev }
          for (const { dayOfWeek } of WEEK) {
            const row = byDay.get(dayOfWeek)
            if (row) {
              const st = String(row.startTime).slice(0, 5)
              const en = String(row.endTime).slice(0, 5)
              next[dayOfWeek] = { enabled: row.isActive, start: st, end: en }
            } else {
              next[dayOfWeek] = { enabled: false, start: '09:00', end: '17:00' }
            }
          }
          return next
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const days = WEEK.map(({ dayOfWeek }) => {
        const f = form[dayOfWeek]
        return {
          dayOfWeek,
          enabled: f.enabled,
          startMinutes: f.enabled ? timeInputToMinutes(f.start) : undefined,
          endMinutes: f.enabled ? timeInputToMinutes(f.end) : undefined,
        }
      })
      const res = await fetch('/api/barber/availability', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed')
      setOk('Saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-black/5 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Availability</h1>
        <p className="text-headz-gray text-sm mt-1">
          Set your weekly hours. Times must stay within the store schedule for each day.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}
      {ok && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">{ok}</div>}

      <div className="rounded-xl border border-black/10 bg-white overflow-hidden divide-y divide-black/5">
        {WEEK.map(({ label, dayOfWeek }) => {
          const sh = storeByDay.get(dayOfWeek)
          const f = form[dayOfWeek]
          return (
            <div key={dayOfWeek} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="sm:w-36 shrink-0">
                  <p className="font-semibold text-headz-black">{label}</p>
                  <p className="text-xs text-headz-gray mt-1">{storeLabel(sh)}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [dayOfWeek]: { ...prev[dayOfWeek], enabled: e.target.checked },
                      }))
                    }
                    className="rounded border-black/20"
                  />
                  <span>Available</span>
                </label>
                {f.enabled && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      value={f.start}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [dayOfWeek]: { ...prev[dayOfWeek], start: e.target.value },
                        }))
                      }
                      className="px-2 py-1.5 border border-black/15 rounded-lg text-sm"
                    />
                    <span className="text-headz-gray">to</span>
                    <input
                      type="time"
                      value={f.end}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [dayOfWeek]: { ...prev[dayOfWeek], end: e.target.value },
                        }))
                      }
                      className="px-2 py-1.5 border border-black/15 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="px-5 py-2.5 rounded-lg bg-headz-red text-white text-sm font-medium hover:bg-headz-redDark disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save availability'}
      </button>
    </div>
  )
}
