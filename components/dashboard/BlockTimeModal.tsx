'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'

export function BlockTimeModal({
  open,
  onClose,
  role,
  barberOptions,
  initialBarberId,
  initialDate,
  initialTime,
}: {
  open: boolean
  onClose: () => void
  role: 'admin' | 'barber'
  barberOptions: { id: string; name: string }[]
  initialBarberId: string
  initialDate: string
  initialTime: string
}) {
  const [barberId, setBarberId] = useState(initialBarberId)
  const [date, setDate] = useState(initialDate)
  const [start, setStart] = useState(initialTime.slice(0, 5))
  const [end, setEnd] = useState(() => {
    const [h, m] = initialTime.slice(0, 5).split(':').map(Number)
    const eh = h + 1
    return `${String(eh).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })
  const [reason, setReason] = useState('Lunch')
  const [loading, setLoading] = useState(false)
  const barberOptionsRef = useRef(barberOptions)
  barberOptionsRef.current = barberOptions

  useEffect(() => {
    if (!open) return
    const opts = barberOptionsRef.current
    const valid = new Set(opts.map((b) => b.id))
    const next = initialBarberId && valid.has(initialBarberId) ? initialBarberId : (opts[0]?.id ?? '')
    setBarberId(next)
    setDate(initialDate)
    setStart(initialTime.slice(0, 5))
    const [h, m] = initialTime.slice(0, 5).split(':').map(Number)
    const hh = Number.isNaN(h) ? 9 : h
    const mm = Number.isNaN(m) ? 0 : m
    const endH = (hh + 1) % 24
    setEnd(`${String(endH).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
    setReason('Lunch')
  }, [open, initialBarberId, initialDate, initialTime])

  if (!open) return null

  async function submit() {
    setLoading(true)
    try {
      const path = role === 'admin' ? '/api/admin/blocked-times' : '/api/barber/blocked-times'
      const body =
        role === 'admin'
          ? { barberId, date, startTime: start, endTime: end, reason }
          : { date, startTime: start, endTime: end, reason }
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const j = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(j.error || `Failed (${res.status})`)
      toast.success('Blocked')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="fixed left-1/2 top-1/2 z-[90] w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#111] p-6 text-white shadow-2xl">
        <h2 className="text-lg font-semibold">Block time</h2>
        <div className="mt-4 space-y-3">
          {role === 'admin' && (
            <label className="block text-sm">
              <span className="text-white/70">Barber</span>
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#1A1A1A] px-3 py-2"
              >
                {barberOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-white/70">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#1A1A1A] px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-white/70">Start</span>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#1A1A1A] px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/70">End</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#1A1A1A] px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-white/70">Reason</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#1A1A1A] px-3 py-2"
              placeholder="Lunch, Break, Closed…"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/80 hover:bg-white/10">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}
