'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type BarberRow = {
  id: string
  email: string
  displayName: string
  isActive: boolean
  createdAt: string
}

type BlockingAppt = {
  id: string
  appointmentDate: string
  timeSlot: string
  customerName: string
}

function formatJoin(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York',
    })
  } catch {
    return iso
  }
}

function formatTimeSlot(ts: string) {
  const t = ts.slice(0, 5)
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return ts
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function BarbersSettingsClient() {
  const [rows, setRows] = useState<BarberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [blocking, setBlocking] = useState<BlockingAppt[] | null>(null)
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/barbers', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load barbers')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const addBarber = async () => {
    const n = name.trim()
    const em = email.trim().toLowerCase()
    if (!n || !em) {
      toast.error('Name and email are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/barbers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, email: em }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to invite')
      toast.success(json.message ?? 'Barber invited')
      setModalOpen(false)
      setName('')
      setEmail('')
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to invite')
    } finally {
      setSaving(false)
    }
  }

  const setActiveState = async (row: BarberRow, next: boolean) => {
    if (next === false) {
      setPendingToggleId(row.id)
      try {
        const res = await fetch(`/api/admin/barbers/${row.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        })
        const json = await res.json().catch(() => ({}))
        if (res.status === 409 && json.blockingAppointments) {
          setBlocking(json.blockingAppointments as BlockingAppt[])
          toast.error('Resolve future appointments first')
          return
        }
        if (!res.ok) throw new Error(json.error || 'Could not deactivate')
        toast.success('Barber deactivated')
        setRows((r) => r.map((x) => (x.id === row.id ? { ...x, isActive: false } : x)))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not deactivate')
      } finally {
        setPendingToggleId(null)
      }
      return
    }

    const prev = rows
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, isActive: true } : x)))
    setPendingToggleId(row.id)
    try {
      const res = await fetch(`/api/admin/barbers/${row.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not reactivate')
      toast.success('Barber reactivated')
      if (json.data) setRows((r) => r.map((x) => (x.id === row.id ? { ...x, isActive: true } : x)))
    } catch (e) {
      setRows(prev)
      toast.error(e instanceof Error ? e.message : 'Could not reactivate')
    } finally {
      setPendingToggleId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-headz-black">Barber management</h1>
          <p className="text-sm text-headz-gray mt-1">
            Invite barbers by email, deactivate when needed. Deactivation blocks login and public booking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-headz-red px-4 py-2.5 text-sm font-medium text-white hover:bg-headz-redDark shadow-sm"
        >
          Add barber
        </button>
      </div>

      {blocking && blocking.length > 0 && (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Cannot deactivate — future pending appointments</p>
          <p className="text-sm mt-1 mb-3">
            Reassign or cancel these in{' '}
            <Link href="/dashboard/schedule" className="underline font-medium text-headz-red">
              Schedule
            </Link>{' '}
            before deactivating this barber.
          </p>
          <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
            {blocking.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3 border-t border-amber-200/80 pt-2 first:border-t-0 first:pt-0">
                <span className="font-medium">{a.customerName}</span>
                <span className="text-amber-900/80">
                  {a.appointmentDate} · {formatTimeSlot(a.timeSlot)}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 text-sm font-medium text-headz-red hover:underline"
            onClick={() => setBlocking(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-headz-gray text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-headz-gray text-sm">No barbers yet.</div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-black/10 bg-headz-black/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-headz-gray">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-black/5 hover:bg-headz-cream/40">
                  <td className="py-3 px-4 font-medium text-headz-black">{b.displayName}</td>
                  <td className="py-3 px-4 text-headz-gray">{b.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-black/10 text-headz-gray'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-headz-gray">{formatJoin(b.createdAt)}</td>
                  <td className="py-3 px-4 text-right">
                    {b.isActive ? (
                      <button
                        type="button"
                        disabled={pendingToggleId === b.id}
                        onClick={() => void setActiveState(b, false)}
                        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                      >
                        {pendingToggleId === b.id ? '…' : 'Deactivate'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pendingToggleId === b.id}
                        onClick={() => void setActiveState(b, true)}
                        className="text-sm font-medium text-headz-red hover:underline disabled:opacity-50"
                      >
                        {pendingToggleId === b.id ? '…' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-black/10"
            role="dialog"
            aria-modal
            aria-labelledby="barber-modal-title"
          >
            <h2 id="barber-modal-title" className="text-lg font-semibold text-headz-black">
              Add barber
            </h2>
            <p className="text-sm text-headz-gray mt-1">
              We&apos;ll send a Supabase invite email so they can set their password. They&apos;ll be added to the
              staff allowlist automatically.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Name</label>
                <input
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-black/15 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void addBarber()}
                className="px-4 py-2 rounded-lg bg-headz-red text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
