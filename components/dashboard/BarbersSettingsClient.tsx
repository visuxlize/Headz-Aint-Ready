'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type BarberRow = {
  barberProfileId: string
  userId: string | null
  staffUserId: string | null
  linked: boolean
  displayName: string
  email: string | null
  avatarUrl?: string | null
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
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState('')

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

  const savePlaceholderEmail = async (row: BarberRow) => {
    const em = emailDraft.trim().toLowerCase()
    if (!em) {
      toast.error('Enter an email')
      return
    }
    try {
      const res = await fetch(`/api/admin/barber-profiles/${row.barberProfileId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayEmail: em }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success('Email saved — they can sign up with this address to claim their profile.')
      setEditingEmailId(null)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const setActiveState = async (row: BarberRow, next: boolean) => {
    if (next === false) {
      if (row.linked && row.staffUserId) {
        setPendingToggleId(row.staffUserId)
        try {
          const res = await fetch(`/api/admin/barbers/${row.staffUserId}`, {
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
          setRows((r) =>
            r.map((x) =>
              x.barberProfileId === row.barberProfileId ? { ...x, isActive: false } : x
            )
          )
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Could not deactivate')
        } finally {
          setPendingToggleId(null)
        }
        return
      }

      setPendingToggleId(row.barberProfileId)
      try {
        const res = await fetch(`/api/admin/barber-profiles/${row.barberProfileId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Could not deactivate')
        toast.success('Profile hidden from marketing')
        setRows((r) =>
          r.map((x) =>
            x.barberProfileId === row.barberProfileId ? { ...x, isActive: false } : x
          )
        )
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not deactivate')
      } finally {
        setPendingToggleId(null)
      }
      return
    }

    const prev = rows
    setRows((r) =>
      r.map((x) =>
        x.barberProfileId === row.barberProfileId ? { ...x, isActive: true } : x
      )
    )

    if (row.linked && row.staffUserId) {
      setPendingToggleId(row.staffUserId)
      try {
        const res = await fetch(`/api/admin/barbers/${row.staffUserId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Could not reactivate')
        toast.success('Barber reactivated')
        if (json.data) {
          setRows((r) =>
            r.map((x) =>
              x.barberProfileId === row.barberProfileId ? { ...x, isActive: true } : x
            )
          )
        }
      } catch (e) {
        setRows(prev)
        toast.error(e instanceof Error ? e.message : 'Could not reactivate')
      } finally {
        setPendingToggleId(null)
      }
      return
    }

    setPendingToggleId(row.barberProfileId)
    try {
      const res = await fetch(`/api/admin/barber-profiles/${row.barberProfileId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not reactivate')
      toast.success('Profile active')
      if (json.data) void load()
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
          <p className="text-sm text-headz-gray mt-1 max-w-2xl">
            Team profiles appear here (including Dream Team from seed). Add a <strong>work email</strong> on profiles
            without a login so barbers can sign up at <strong>/auth/signup</strong> with the same email — their account
            links automatically. Or invite a new barber to receive email onboarding.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-headz-red px-4 py-2.5 text-sm font-medium text-white hover:bg-headz-redDark shadow-sm"
        >
          Invite new barber
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
              <li
                key={a.id}
                className="flex flex-wrap gap-x-3 border-t border-amber-200/80 pt-2 first:border-t-0 first:pt-0"
              >
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

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-black/10 bg-white p-5 h-48 animate-pulse bg-headz-black/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-white p-10 text-center text-headz-gray text-sm space-y-2">
          <p>No barber profiles yet.</p>
          <p className="text-xs max-w-md mx-auto">
            Run <code className="bg-black/5 px-1 rounded">npm run seed:all</code> to load Dream Team + demo accounts, or
            invite someone above.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((b) => (
            <div
              key={b.barberProfileId}
              className="rounded-2xl border border-black/10 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-headz-cream border border-black/10 shrink-0">
                    {b.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-headz-red font-bold text-lg">
                        {b.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-headz-black leading-tight">{b.displayName}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {b.linked ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-900">
                          Staff linked
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-900">
                          Awaiting signup
                        </span>
                      )}
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          b.isActive ? 'bg-black/5 text-headz-gray' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-sm space-y-2">
                  {b.linked ? (
                    <p className="text-headz-gray truncate" title={b.email ?? ''}>
                      <span className="text-headz-black/60">Email:</span> {b.email ?? '—'}
                    </p>
                  ) : editingEmailId === b.barberProfileId ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-headz-gray">Work email for signup</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        placeholder="name@email.com"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-headz-red"
                          onClick={() => void savePlaceholderEmail(b)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="text-sm text-headz-gray"
                          onClick={() => setEditingEmailId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-headz-gray truncate text-xs" title={b.email ?? ''}>
                        {b.email ? (
                          <>
                            <span className="text-headz-black/60">Email:</span> {b.email}
                          </>
                        ) : (
                          <span className="text-amber-800">No email — add one so they can sign up</span>
                        )}
                      </p>
                      <button
                        type="button"
                        className="text-xs font-medium text-headz-red shrink-0"
                        onClick={() => {
                          setEditingEmailId(b.barberProfileId)
                          setEmailDraft(b.email ?? '')
                        }}
                      >
                        {b.email ? 'Edit' : 'Add'}
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-headz-gray">
                    {b.linked ? 'Joined' : 'Profile'} · {formatJoin(b.createdAt)}
                  </p>
                </div>

                <div className="mt-auto pt-2 flex flex-wrap gap-2 border-t border-black/5">
                  {b.isActive ? (
                    <button
                      type="button"
                      disabled={
                        pendingToggleId === b.staffUserId || pendingToggleId === b.barberProfileId
                      }
                      onClick={() => void setActiveState(b, false)}
                      className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                    >
                      {pendingToggleId ? '…' : 'Deactivate'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        pendingToggleId === b.staffUserId || pendingToggleId === b.barberProfileId
                      }
                      onClick={() => void setActiveState(b, true)}
                      className="text-sm font-medium text-headz-red hover:underline disabled:opacity-50"
                    >
                      {pendingToggleId ? '…' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-black/10"
            role="dialog"
            aria-modal
            aria-labelledby="barber-modal-title"
          >
            <h2 id="barber-modal-title" className="text-lg font-semibold text-headz-black">
              Invite barber
            </h2>
            <p className="text-sm text-headz-gray mt-1">
              We&apos;ll send a Supabase invite email so they can set their password. They&apos;ll be added to the staff
              allowlist automatically.
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
