'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type Row = {
  id: string
  barberName: string
  customerName: string
  serviceName: string
  appointmentDate: string
  timeSlot: string
  servicePrice: string
  noShowFee: string
  waivedAt: string | null
  status: string
}

function formatMoney(s: string) {
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return s
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatTime(ts: string) {
  const t = ts.slice(0, 5)
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return ts
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function NoShowsClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [waiving, setWaiving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/no-shows', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const waive = async (id: string) => {
    setWaiving(id)
    try {
      const res = await fetch(`/api/admin/no-shows/${id}/waive`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success('Fee waived')
      setRows((r) =>
        r.map((x) =>
          x.id === id
            ? { ...x, noShowFee: '0', waivedAt: new Date().toISOString() }
            : x
        )
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setWaiving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">No-shows</h1>
        <p className="text-sm text-headz-gray mt-1">
          Appointments flagged as no-show (including automated nightly detection). Waive fees when appropriate.
        </p>
      </div>

      <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-headz-gray text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-headz-gray text-sm">No no-show appointments.</div>
        ) : (
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-black/10 bg-headz-black/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-headz-gray">
                <th className="py-3 px-4">Barber</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Service price</th>
                <th className="py-3 px-4 text-right">No-show fee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const waived = r.waivedAt != null || parseFloat(r.noShowFee) === 0
                return (
                  <tr key={r.id} className="border-b border-black/5 hover:bg-headz-cream/30">
                    <td className="py-3 px-4 font-medium">{r.barberName}</td>
                    <td className="py-3 px-4">{r.customerName}</td>
                    <td className="py-3 px-4">{r.serviceName}</td>
                    <td className="py-3 px-4 tabular-nums">{r.appointmentDate}</td>
                    <td className="py-3 px-4">{formatTime(r.timeSlot)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatMoney(r.servicePrice)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatMoney(r.noShowFee)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-900">
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      {waived && (
                        <span className="ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-900">
                          Waived
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!waived ? (
                        <button
                          type="button"
                          disabled={waiving === r.id}
                          onClick={() => void waive(r.id)}
                          className="text-sm font-medium text-headz-red hover:underline disabled:opacity-50"
                        >
                          {waiving === r.id ? '…' : 'Waive fee'}
                        </button>
                      ) : (
                        <span className="text-headz-gray text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
