'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils/cn'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'

type DayMode = 'unavailable' | 'open' | 'custom'

type StoreDay = {
  dayOfWeek: number
  openMin: number
  closeMin: number
  isOpen: boolean
}

type IntervalDraft = { localId: string; startMinutes: number; endMinutes: number }

type DayDraft = { mode: DayMode; intervals: IntervalDraft[] }

/** Monday-first display; values are JS getDay() (Sun=0 … Sat=6). */
const WEEK: { label: string; dayOfWeek: number }[] = [
  { label: 'Mon.', dayOfWeek: 1 },
  { label: 'Tue.', dayOfWeek: 2 },
  { label: 'Wed.', dayOfWeek: 3 },
  { label: 'Thu.', dayOfWeek: 4 },
  { label: 'Fri.', dayOfWeek: 5 },
  { label: 'Sat.', dayOfWeek: 6 },
  { label: 'Sun.', dayOfWeek: 0 },
]

function minToTime(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Display label for shop hours / summaries (12-hour, e.g. 9:00 AM – 8:00 PM). */
function minutesTo12hLabel(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  const d = new Date(2000, 0, 1, h, min, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function timeToMin(s: string) {
  const [a, b] = s.split(':').map((x) => parseInt(x, 10))
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return a * 60 + b
}

function storeLine(sh: StoreDay | undefined) {
  if (!sh) return 'Default shop hours'
  if (!sh.isOpen) return 'Shop closed'
  return `${minutesTo12hLabel(sh.openMin)} – ${minutesTo12hLabel(sh.closeMin)}`
}

function emptyDraftForDay(store: StoreDay | undefined): DayDraft {
  if (!store?.isOpen) return { mode: 'unavailable', intervals: [] }
  return {
    mode: 'open',
    intervals: [{ localId: crypto.randomUUID(), startMinutes: store.openMin, endMinutes: store.closeMin }],
  }
}

export function WeeklyAvailabilityEditor(
  props:
    | { scope: 'admin'; barberProfileId: string; barberName: string }
    | { scope: 'barber' }
) {
  const title = props.scope === 'admin' ? props.barberName : 'Your weekly hours'
  const adminProfileId = props.scope === 'admin' ? props.barberProfileId : ''
  const apiUrl =
    props.scope === 'admin'
      ? `/api/admin/barbers/${props.barberProfileId}/schedule`
      : '/api/barber/availability'

  const [storeHours, setStoreHours] = useState<StoreDay[]>([])
  const [draft, setDraft] = useState<Record<number, DayDraft> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copyFrom, setCopyFrom] = useState<number | null>(null)
  const [copyTargets, setCopyTargets] = useState<Set<number>>(new Set())

  const storeByDay = useMemo(() => new Map(storeHours.map((s) => [s.dayOfWeek, s])), [storeHours])

  const load = useCallback(async () => {
    if (props.scope === 'admin' && !adminProfileId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(apiUrl, { credentials: 'include' })
      const json = await parseJsonResponse<{ data?: { storeHours: StoreDay[]; days: { dayOfWeek: number; mode: DayMode; intervals: { id: string; startMinutes: number; endMinutes: number }[] }[] } }>(
        res
      )
      if (!res.ok) throw new Error((json as { error?: string }).error || 'Failed to load')
      const data = json.data
      if (!data) throw new Error('No data')
      setStoreHours(data.storeHours ?? [])
      const byDay = new Map((data.storeHours ?? []).map((s) => [s.dayOfWeek, s]))
      const next: Record<number, DayDraft> = {}
      for (const d of data.days) {
        const intervals: IntervalDraft[] =
          d.mode === 'custom'
            ? d.intervals.map((iv) => ({
                localId: iv.id ?? crypto.randomUUID(),
                startMinutes: iv.startMinutes,
                endMinutes: iv.endMinutes,
              }))
            : []
        next[d.dayOfWeek] = { mode: d.mode, intervals }
      }
      for (const { dayOfWeek } of WEEK) {
        if (!next[dayOfWeek]) {
          next[dayOfWeek] = emptyDraftForDay(byDay.get(dayOfWeek))
        }
      }
      setDraft(next)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load schedule'
      setLoadError(msg)
      toast.error(msg)
      setDraft(null)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, adminProfileId, props.scope])

  useEffect(() => {
    void load()
  }, [load])

  const updateDay = (dayOfWeek: number, patch: Partial<DayDraft> | ((prev: DayDraft) => DayDraft)) => {
    setDraft((prev) => {
      if (!prev) return prev
      const cur = prev[dayOfWeek] ?? emptyDraftForDay(storeByDay.get(dayOfWeek))
      const nextPatch = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }
      return { ...prev, [dayOfWeek]: nextPatch }
    })
  }

  const setMode = (dayOfWeek: number, mode: DayMode) => {
    const sh = storeByDay.get(dayOfWeek)
    if (mode === 'unavailable') {
      updateDay(dayOfWeek, { mode: 'unavailable', intervals: [] })
      return
    }
    if (mode === 'open') {
      updateDay(dayOfWeek, { mode: 'open', intervals: [] })
      return
    }
    const start = sh?.isOpen ? sh.openMin : 9 * 60
    const end = sh?.isOpen ? sh.closeMin : 17 * 60
    updateDay(dayOfWeek, {
      mode: 'custom',
      intervals: [{ localId: crypto.randomUUID(), startMinutes: start, endMinutes: end }],
    })
  }

  const addInterval = (dayOfWeek: number) => {
    const sh = storeByDay.get(dayOfWeek)
    const start = sh?.isOpen ? sh.openMin : 9 * 60
    const end = sh?.isOpen ? sh.closeMin : 17 * 60
    updateDay(dayOfWeek, (prev) => ({
      ...prev,
      mode: 'custom',
      intervals: [...prev.intervals, { localId: crypto.randomUUID(), startMinutes: start, endMinutes: end }],
    }))
  }

  const removeInterval = (dayOfWeek: number, localId: string) => {
    updateDay(dayOfWeek, (prev) => {
      const intervals = prev.intervals.filter((i) => i.localId !== localId)
      if (intervals.length === 0 && prev.mode === 'custom') {
        return { mode: 'open', intervals: [] }
      }
      return { ...prev, intervals }
    })
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const days = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
        const d = draft[dayOfWeek] ?? emptyDraftForDay(storeByDay.get(dayOfWeek))
        if (d.mode === 'custom') {
          return {
            dayOfWeek,
            mode: 'custom' as const,
            intervals: d.intervals.map((iv) => ({
              startMinutes: iv.startMinutes,
              endMinutes: iv.endMinutes,
            })),
          }
        }
        return { dayOfWeek, mode: d.mode, intervals: [] as { startMinutes: number; endMinutes: number }[] }
      })
      const res = await fetch(apiUrl, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })
      const j = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(j.error || 'Save failed')
      toast.success('Schedule saved')
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const applyCopy = (sourceDay: number) => {
    if (!draft) return
    const src = draft[sourceDay]
    if (!src) return
    setDraft((prev) => {
      if (!prev) return prev
      const next = { ...prev }
      for (const t of copyTargets) {
        if (t === sourceDay) continue
        next[t] = {
          mode: src.mode,
          intervals: src.intervals.map((i) => ({
            localId: crypto.randomUUID(),
            startMinutes: i.startMinutes,
            endMinutes: i.endMinutes,
          })),
        }
      }
      return next
    })
    setCopyFrom(null)
    setCopyTargets(new Set())
    toast.success('Copied to selected days')
  }

  if (props.scope === 'admin' && !adminProfileId) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-8 text-center text-headz-gray shadow-sm">
        Select a barber to edit their hours.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-12 text-center text-headz-gray shadow-sm">
        Loading schedule…
      </div>
    )
  }

  if (loadError || !draft) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center shadow-sm">
        <p className="font-medium text-red-900">Couldn&apos;t load schedule</p>
        <p className="mt-2 text-sm text-red-800/90">{loadError ?? 'Unknown error'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-6 rounded-lg bg-headz-black px-5 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white shadow-[0_2px_24px_rgba(0,0,0,0.06)]">
      <div className="border-b border-black/8 px-6 py-4">
        <h2 className="font-serif text-lg font-bold text-headz-black">{title}</h2>
        <p className="mt-1 text-sm text-headz-gray">
          N/A = off · Open = full shop hours that day · Custom = one or more shifts (within shop hours).
        </p>
      </div>

      <div className="divide-y divide-black/8 px-4 py-2 sm:px-6">
        {WEEK.map(({ label, dayOfWeek }) => {
          const sh = storeByDay.get(dayOfWeek)
          const d = draft[dayOfWeek]!
          const shopClosed = !sh?.isOpen

          return (
            <div
              key={dayOfWeek}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="w-14 shrink-0 pt-2 font-semibold text-headz-black">{label}</div>

              <div className="min-w-0 flex-1 space-y-2">
                {shopClosed && (
                  <p className="text-xs font-medium text-amber-800">Shop closed — mark N/A.</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={shopClosed ? 'unavailable' : d.mode}
                    disabled={shopClosed}
                    onChange={(e) => setMode(dayOfWeek, e.target.value as DayMode)}
                    className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium text-headz-black shadow-sm focus:outline-none focus:ring-2 focus:ring-headz-red/25 disabled:opacity-60"
                  >
                    <option value="unavailable">N/A</option>
                    {!shopClosed && <option value="open">Open (shop hours)</option>}
                    {!shopClosed && <option value="custom">Custom</option>}
                  </select>
                  {!shopClosed && d.mode === 'open' && (
                    <span className="text-sm text-headz-gray">{storeLine(sh)}</span>
                  )}
                  {d.mode === 'unavailable' && !shopClosed && (
                    <span className="text-sm text-headz-gray">Unavailable</span>
                  )}
                </div>

                {!shopClosed && d.mode === 'custom' && (
                  <div className="space-y-2">
                    {d.intervals.map((iv) => (
                      <div key={iv.localId} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={minToTime(iv.startMinutes)}
                          min={sh ? minToTime(sh.openMin) : undefined}
                          max={sh ? minToTime(sh.closeMin) : undefined}
                          onChange={(e) =>
                            updateDay(dayOfWeek, (prev) => ({
                              ...prev,
                              intervals: prev.intervals.map((x) =>
                                x.localId === iv.localId ? { ...x, startMinutes: timeToMin(e.target.value) } : x
                              ),
                            }))
                          }
                          className="rounded-lg border border-black/12 px-2 py-1.5 text-sm"
                        />
                        <span className="text-headz-gray">–</span>
                        <input
                          type="time"
                          value={minToTime(iv.endMinutes)}
                          min={sh ? minToTime(sh.openMin) : undefined}
                          max={sh ? minToTime(sh.closeMin) : undefined}
                          onChange={(e) =>
                            updateDay(dayOfWeek, (prev) => ({
                              ...prev,
                              intervals: prev.intervals.map((x) =>
                                x.localId === iv.localId ? { ...x, endMinutes: timeToMin(e.target.value) } : x
                              ),
                            }))
                          }
                          className="rounded-lg border border-black/12 px-2 py-1.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeInterval(dayOfWeek, iv.localId)}
                          className="rounded-lg p-2 text-headz-gray hover:bg-black/5 hover:text-headz-red"
                          aria-label="Remove interval"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:flex-col sm:items-end sm:pt-2">
                {!shopClosed && d.mode === 'custom' && (
                  <button
                    type="button"
                    onClick={() => addInterval(dayOfWeek)}
                    className="rounded-lg p-2 text-headz-gray hover:bg-black/5"
                    title="Add interval"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setCopyFrom(copyFrom === dayOfWeek ? null : dayOfWeek)
                      setCopyTargets(new Set())
                    }}
                    className={cn(
                      'rounded-lg p-2 text-headz-gray hover:bg-black/5',
                      copyFrom === dayOfWeek && 'bg-black/5 text-headz-black'
                    )}
                    title="Copy hours to…"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  {copyFrom === dayOfWeek && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-black/10 bg-white p-3 shadow-xl">
                      <p className="mb-2 text-xs font-semibold text-headz-black">Copy hours to…</p>
                      <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                        {WEEK.map(({ dayOfWeek: dow, label: lab }) => (
                          <li key={dow}>
                            <label className="flex cursor-pointer items-center gap-2 py-0.5">
                              <input
                                type="checkbox"
                                checked={copyTargets.has(dow)}
                                disabled={dow === dayOfWeek}
                                onChange={() => {
                                  setCopyTargets((prev) => {
                                    const n = new Set(prev)
                                    if (n.has(dow)) n.delete(dow)
                                    else n.add(dow)
                                    return n
                                  })
                                }}
                              />
                              <span className={dow === dayOfWeek ? 'text-headz-gray' : ''}>{lab}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => applyCopy(dayOfWeek)}
                        disabled={copyTargets.size === 0}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-headz-black py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        <Check className="h-4 w-4" />
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end border-t border-black/8 px-6 py-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-headz-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-headz-black/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
    </div>
  )
}
