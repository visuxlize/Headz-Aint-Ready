'use client'

import { useState } from 'react'

/** Mirror of barber fields we need in the client (avoids importing server schema) */
type BarberInfo = {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  email: string | null
}

type AvailabilityItem = {
  id: string
  dayOfWeek: number
  dayName: string
  startMinutes: number
  endMinutes: number
  startTime: string
  endTime: string
  startTime12?: string
  endTime12?: string
}

type TimeOffItem = {
  id: string
  startDate: string
  endDate: string
  type: string
  notes: string | null
}

type BarberData = {
  barber: BarberInfo
  availability: AvailabilityItem[]
  totalHours?: number
  timeOff: TimeOffItem[]
}

export function AvailabilityEditor({
  barberData,
  dayNames,
  dayShort,
}: {
  barberData: BarberData[]
  dayNames: string[]
  dayShort: string[]
}) {
  const [selectedBarberId, setSelectedBarberId] = useState(barberData[0]?.barber.id ?? '')
  const [availability, setAvailability] = useState<Record<string, AvailabilityItem[]>>(
    Object.fromEntries(barberData.map((d) => [d.barber.id, d.availability]))
  )
  const [timeOff, setTimeOff] = useState<Record<string, TimeOffItem[]>>(
    Object.fromEntries(barberData.map((d) => [d.barber.id, d.timeOff]))
  )
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'hours' | 'timeoff'>('hours')

  const currentBarber = barberData.find((d) => d.barber.id === selectedBarberId)
  const currentAvailability = availability[selectedBarberId] ?? []
  const currentTimeOff = timeOff[selectedBarberId] ?? []

  const refresh = () => window.location.reload()

  const addAvailability = async () => {
    const dayOfWeek = parseInt((document.getElementById('av-day') as HTMLSelectElement)?.value ?? '0', 10)
    const startStr = (document.getElementById('av-start') as HTMLInputElement)?.value ?? '09:00'
    const endStr = (document.getElementById('av-end') as HTMLInputElement)?.value ?? '17:00'
    const [sh, sm] = startStr.split(':').map(Number)
    const [eh, em] = endStr.split(':').map(Number)
    const startMinutes = sh * 60 + (isNaN(sm) ? 0 : sm)
    const endMinutes = eh * 60 + (isNaN(em) ? 0 : em)
    if (endMinutes <= startMinutes) return
    setSaving(true)
    try {
      const res = await fetch(`/api/barbers/${selectedBarberId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, startMinutes, endMinutes }),
      })
      if (res.ok) refresh()
      else throw new Error((await res.json()).error)
    } finally {
      setSaving(false)
    }
  }

  const deleteAvailability = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/barbers/${selectedBarberId}/availability?id=${id}`, { method: 'DELETE' })
      if (res.ok) refresh()
    } finally {
      setSaving(false)
    }
  }

  const addTimeOff = async () => {
    const startDate = (document.getElementById('to-start') as HTMLInputElement)?.value
    const endDate = (document.getElementById('to-end') as HTMLInputElement)?.value
    const type = (document.getElementById('to-type') as HTMLSelectElement)?.value ?? 'time_off'
    const notes = (document.getElementById('to-notes') as HTMLInputElement)?.value?.trim() || null
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/barbers/${selectedBarberId}/time-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, type, notes }),
      })
      if (res.ok) refresh()
      else throw new Error((await res.json()).error)
    } finally {
      setSaving(false)
    }
  }

  const deleteTimeOff = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/barbers/${selectedBarberId}/time-off?id=${id}`, { method: 'DELETE' })
      if (res.ok) refresh()
    } finally {
      setSaving(false)
    }
  }

  if (barberData.length === 0) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-8 shadow-sm text-center text-headz-gray">
        No barbers found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weekly grid: staff × days */}
      <div className="-mx-4 sm:mx-0">
        <p className="sm:hidden text-xs text-headz-gray mb-2 px-4">Scroll horizontally to see all days →</p>
        <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <div className="bg-headz-black/[0.04] px-4 py-3 border-b border-black/10">
            <h2 className="font-semibold text-headz-black text-sm">Weekly availability</h2>
            <p className="text-xs text-headz-gray mt-0.5">Recurring hours by barber. Closed = no availability set for that day.</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-black/10">
                <th className="w-52 p-4 text-left text-xs font-semibold uppercase tracking-wider text-headz-gray">
                  Staff
                </th>
                {dayShort.map((d, i) => (
                  <th key={i} className="p-3 text-center text-xs font-semibold text-headz-gray w-28">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barberData.map((d) => {
                const avByDay = new Map<number, AvailabilityItem[]>()
                for (const a of availability[d.barber.id] ?? []) {
                  const list = avByDay.get(a.dayOfWeek) ?? []
                  list.push(a)
                  avByDay.set(a.dayOfWeek, list)
                }
                const totalH = d.totalHours ?? 0
                return (
                  <tr key={d.barber.id} className="border-b border-black/5 hover:bg-headz-cream/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-headz-red/30 bg-headz-black/5">
                          {d.barber.avatarUrl ? (
                            <img src={d.barber.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-headz-red">
                              {d.barber.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-headz-black">{d.barber.name}</p>
                          <p className="text-xs text-headz-gray">Availability: {totalH}h</p>
                        </div>
                      </div>
                    </td>
                    {dayShort.map((_, dayIndex) => {
                      const slots = avByDay.get(dayIndex) ?? []
                      return (
                        <td key={dayIndex} className="p-2 align-top">
                          {slots.length === 0 ? (
                            <span className="inline-block rounded-lg bg-amber-50 text-amber-800 px-2 py-1.5 text-xs font-medium">
                              Closed
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {slots.map((a) => (
                                <span
                                  key={a.id}
                                  className="block rounded-lg bg-headz-red/10 text-headz-black px-2 py-1.5 text-xs font-medium border border-headz-red/20"
                                >
                                  {a.startTime12 ?? a.startTime} – {a.endTime12 ?? a.endTime}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Edit by barber */}
      <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 border-b border-black/10 px-4 py-3 bg-headz-black/[0.02]">
          <label className="flex items-center gap-2 text-sm font-medium text-headz-black">
            Barber
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="px-3 py-2 border border-black/15 rounded-lg bg-white text-headz-black focus:outline-none focus:ring-2 focus:ring-headz-red/30 min-w-[200px]"
            >
              {barberData.map((d) => (
                <option key={d.barber.id} value={d.barber.id}>{d.barber.name}</option>
              ))}
            </select>
          </label>
          <div className="flex rounded-lg border border-black/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveTab('hours')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'hours' ? 'bg-headz-red text-white' : 'bg-white text-headz-gray hover:bg-headz-cream/50'}`}
            >
              Working hours
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeoff')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'timeoff' ? 'bg-headz-red text-white' : 'bg-white text-headz-gray hover:bg-headz-cream/50'}`}
            >
              Time off
            </button>
          </div>
        </div>

        {currentBarber && (
          <div className="p-5">
            {activeTab === 'hours' && (
              <>
                <p className="text-sm text-headz-gray mb-4">
                  Add recurring hours (within store 9am–8pm). No entry for a day = Closed.
                </p>
                <ul className="mb-4 space-y-2">
                  {currentAvailability.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-2.5 text-sm bg-headz-cream/30">
                      <span className="font-medium text-headz-black">
                        {a.dayName} · {(a.startTime12 ?? a.startTime)} – {(a.endTime12 ?? a.endTime)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void deleteAvailability(a.id)}
                        disabled={saving}
                        className="text-headz-red hover:underline text-xs font-medium"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                  {currentAvailability.length === 0 && (
                    <li className="text-headz-gray text-sm py-2">No specific hours — available all store hours every day.</li>
                  )}
                </ul>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-medium text-headz-gray mb-1">Day</label>
                    <select id="av-day" className="px-3 py-2 border border-black/15 rounded-lg text-sm">
                      {dayNames.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-headz-gray mb-1">Start</label>
                    <input id="av-start" type="time" defaultValue="09:00" className="px-3 py-2 border border-black/15 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-headz-gray mb-1">End</label>
                    <input id="av-end" type="time" defaultValue="17:00" className="px-3 py-2 border border-black/15 rounded-lg text-sm" />
                  </div>
                  <button
                    type="button"
                    onClick={() => void addAvailability()}
                    disabled={saving}
                    className="px-4 py-2 bg-headz-red text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-headz-redDark"
                  >
                    Add
                  </button>
                </div>
              </>
            )}

            {activeTab === 'timeoff' && (
              <>
                <p className="text-sm text-headz-gray mb-4">
                  Date ranges when this barber is unavailable. Booking shows no slots for these days.
                </p>
                <ul className="mb-4 space-y-2">
                  {currentTimeOff.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-2.5 text-sm bg-headz-cream/30">
                      <span>
                        {t.startDate} – {t.endDate}
                        {t.type !== 'time_off' && <span className="ml-2 text-headz-gray">({t.type})</span>}
                        {t.notes && <span className="ml-2 text-headz-gray">— {t.notes}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => void deleteTimeOff(t.id)}
                        disabled={saving}
                        className="text-headz-red hover:underline text-xs font-medium"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-medium text-headz-gray mb-1">Start date</label>
                    <input id="to-start" type="date" className="px-3 py-2 border border-black/15 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-headz-gray mb-1">End date</label>
                    <input id="to-end" type="date" className="px-3 py-2 border border-black/15 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-headz-gray mb-1">Type</label>
                    <select id="to-type" className="px-3 py-2 border border-black/15 rounded-lg text-sm">
                      <option value="time_off">Time off</option>
                      <option value="sick">Sick</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-headz-gray mb-1">Notes</label>
                    <input id="to-notes" type="text" placeholder="Optional" className="px-3 py-2 border border-black/15 rounded-lg text-sm w-36" />
                  </div>
                  <button
                    type="button"
                    onClick={() => void addTimeOff()}
                    disabled={saving}
                    className="px-4 py-2 bg-headz-red text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-headz-redDark"
                  >
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
