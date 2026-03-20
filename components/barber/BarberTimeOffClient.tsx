'use client'

import { useEffect, useState } from 'react'

type ReqRow = {
  id: string
  requestedDate: string
  reason: string | null
  status: string
  denialReason: string | null
  createdAt: string
}

function badge(status: string) {
  const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium'
  if (status === 'pending') return `${base} bg-amber-100 text-amber-900`
  if (status === 'approved') return `${base} bg-emerald-100 text-emerald-900`
  if (status === 'denied') return `${base} bg-red-100 text-red-900`
  return `${base} bg-black/5 text-headz-gray`
}

export function BarberTimeOffClient() {
  const [rows, setRows] = useState<ReqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/barber/time-off', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (!json.data) throw new Error(json.error || 'Failed')
        setRows(json.data)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!date) {
      setError('Pick a date.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/barber/time-off', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedDate: date, reason: reason.trim() || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setDate('')
      setReason('')
      setError(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Time off</h1>
        <p className="text-headz-gray text-sm mt-1">Request days off. Management will review.</p>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-headz-black">New request</h2>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-headz-black mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-black/15 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-headz-black mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
              placeholder="e.g. family event"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="px-5 py-2.5 rounded-lg bg-headz-red text-white text-sm font-medium hover:bg-headz-redDark disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </div>

      <div>
        <h2 className="font-semibold text-headz-black mb-3">Your requests</h2>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-black/5 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-headz-gray">No requests yet.</p>
        ) : (
          <ul className="rounded-xl border border-black/10 bg-white divide-y divide-black/5">
            {rows.map((r) => (
              <li key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-medium text-headz-black">{r.requestedDate}</p>
                  {r.reason && <p className="text-sm text-headz-gray mt-0.5">{r.reason}</p>}
                  {r.status === 'denied' && r.denialReason && (
                    <p className="text-sm text-red-800 mt-1">
                      <span className="font-medium">Response:</span> {r.denialReason}
                    </p>
                  )}
                </div>
                <span className={badge(r.status)}>{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
