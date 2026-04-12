'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { toastApiError, toastUnexpected } from '@/lib/errors/toast-safe'
import Link from 'next/link'
import { Copy } from 'lucide-react'

type BarberRow = {
  kind: 'linked' | 'placeholder'
  userId: string | null
  barberProfileId: string
  displayName: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  isActive: boolean
  showOnHomepage: boolean
  sortOrder: number
  createdAt: string
}

type BlockingAppt = {
  id: string
  appointmentDate: string
  timeSlot: string
  customerName: string
}

type ModalMode = 'invite' | 'roster' | 'edit' | null

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
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [blocking, setBlocking] = useState<BlockingAppt[] | null>(null)
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<BarberRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [editShowOnHomepage, setEditShowOnHomepage] = useState(true)
  const [editSortOrder, setEditSortOrder] = useState('0')
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null)
  const [inviteTempPassword, setInviteTempPassword] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/barbers', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        setRows([])
        return
      }
      const raw = (json.data ?? []) as BarberRow[]
      setRows(
        raw.map((b) => ({
          ...b,
          showOnHomepage: b.showOnHomepage ?? true,
          sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : 0,
        }))
      )
    } catch (e) {
      toastUnexpected(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetModal = () => {
    setModalMode(null)
    setEditRow(null)
    setName('')
    setEmail('')
    setAvatarUrl('')
    setInviteTempPassword(null)
  }

  const openEditProfile = (row: BarberRow) => {
    setEditRow(row)
    setEditName(row.displayName)
    setEditAvatarUrl(row.avatarUrl ?? '')
    setEditShowOnHomepage(row.showOnHomepage)
    setEditSortOrder(String(row.sortOrder ?? 0))
    setModalMode('edit')
  }

  const saveProfileEdit = async () => {
    if (!editRow) return
    const n = editName.trim()
    const so = Number.parseInt(editSortOrder, 10)
    if (!n || Number.isNaN(so) || so < 0) {
      toast.error('Enter a valid name and a sort order (0 or higher).')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/barbers/record/${editRow.barberProfileId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: n,
          avatarUrl: editAvatarUrl.trim() || '',
          showOnHomepage: editShowOnHomepage,
          sortOrder: so,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        return
      }
      toast.success('Profile updated')
      resetModal()
      void load()
    } catch (e) {
      toastUnexpected(e)
    } finally {
      setSaving(false)
    }
  }

  const setShowOnWebsite = async (row: BarberRow, next: boolean) => {
    setVisibilitySavingId(row.barberProfileId)
    try {
      const res = await fetch(`/api/admin/barbers/record/${row.barberProfileId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnHomepage: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        return
      }
      setRows((prev) =>
        prev.map((x) => (x.barberProfileId === row.barberProfileId ? { ...x, showOnHomepage: next } : x))
      )
      toast.success(next ? 'Shown on public site' : 'Hidden from homepage & booking picker')
    } catch (e) {
      toastUnexpected(e)
    } finally {
      setVisibilitySavingId(null)
    }
  }

  const sendInvite = async () => {
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
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        temporaryPassword?: string
        message?: string
      }
      if (!res.ok) {
        toastApiError(res)
        return
      }
      const pw = json.temporaryPassword
      if (typeof pw === 'string' && pw.length > 0) {
        setInviteTempPassword(pw)
        toast.success(json.message ?? 'Account created')
      } else {
        toast.success(json.message ?? 'Account created')
        resetModal()
      }
      void load()
    } catch (e) {
      toastUnexpected(e)
    } finally {
      setSaving(false)
    }
  }

  const addToRoster = async () => {
    const n = name.trim()
    const em = email.trim().toLowerCase()
    if (!n || !em) {
      toast.error('Name and email are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/barbers/placeholder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: n,
          email: em,
          avatarUrl: avatarUrl.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        return
      }
      toast.success(json.message ?? 'Added to roster')
      resetModal()
      void load()
    } catch (e) {
      toastUnexpected(e)
    } finally {
      setSaving(false)
    }
  }

  const patchUrl = (row: BarberRow) =>
    row.kind === 'linked' && row.userId
      ? `/api/admin/barbers/${row.userId}`
      : `/api/admin/barbers/profile/${row.barberProfileId}`

  const removeBarber = async (row: BarberRow) => {
    if (
      !window.confirm(
        `Permanently remove ${row.displayName} from the roster? This cannot be undone. Linked accounts are deleted from login; roster-only rows are deleted from the list.`
      )
    ) {
      return
    }
    const url =
      row.kind === 'linked' && row.userId
        ? `/api/admin/barbers/${row.userId}`
        : `/api/admin/barbers/profile/${row.barberProfileId}`
    try {
      const res = await fetch(url, { method: 'DELETE', credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        return
      }
      toast.success('Barber removed')
      void load()
    } catch (e) {
      toastUnexpected(e)
    }
  }

  const setActiveState = async (row: BarberRow, next: boolean) => {
    if (next === false && row.kind === 'linked') {
      setPendingToggleId(row.barberProfileId)
      try {
        const res = await fetch(patchUrl(row), {
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
        if (!res.ok) {
          toastApiError(res)
          return
        }
        toast.success('Barber deactivated')
        setRows((r) =>
          r.map((x) =>
            x.barberProfileId === row.barberProfileId ? { ...x, isActive: false } : x
          )
        )
      } catch (e) {
        toastUnexpected(e)
      } finally {
        setPendingToggleId(null)
      }
      return
    }

    if (next === false && row.kind === 'placeholder') {
      setPendingToggleId(row.barberProfileId)
      try {
        const res = await fetch(patchUrl(row), {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          toastApiError(res)
          return
        }
        toast.success('Removed from active roster')
        setRows((r) =>
          r.map((x) =>
            x.barberProfileId === row.barberProfileId ? { ...x, isActive: false } : x
          )
        )
      } catch (e) {
        toastUnexpected(e)
      } finally {
        setPendingToggleId(null)
      }
      return
    }

    const prev = rows
    setRows((r) =>
      r.map((x) => (x.barberProfileId === row.barberProfileId ? { ...x, isActive: true } : x))
    )
    setPendingToggleId(row.barberProfileId)
    try {
      const res = await fetch(patchUrl(row), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        return
      }
      toast.success('Barber reactivated')
      if (json.data) void load()
    } catch (e) {
      setRows(prev)
      toastUnexpected(e)
    } finally {
      setPendingToggleId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-headz-black">Barber management</h1>
          <p className="text-sm text-headz-gray mt-1 max-w-xl">
            Add, remove, and edit barber profiles here. <strong>Show on website</strong> controls the public homepage
            team grid and the barber list on <strong>/book</strong> (hide test or internal accounts). Login email and
            password tools live under{' '}
            <a href="/dashboard/settings/staff" className="font-medium text-headz-red hover:underline">
              Staff accounts
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModalMode('roster')}
            className="inline-flex items-center rounded-lg border border-headz-red text-headz-red px-4 py-2.5 text-sm font-medium hover:bg-headz-red/5"
          >
            Add to roster
          </button>
          <button
            type="button"
            onClick={() => {
              setInviteTempPassword(null)
              setModalMode('invite')
            }}
            className="inline-flex items-center rounded-lg bg-headz-red px-4 py-2.5 text-sm font-medium text-white hover:bg-headz-redDark shadow-sm"
          >
            Add barber login
          </button>
        </div>
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

      {loading ? (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 rounded-2xl border border-black/5 bg-black/5 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-headz-gray text-sm space-y-2">
          <p>No barbers on the roster yet.</p>
          <p className="text-xs max-w-md mx-auto">
            Use <strong>Add to roster</strong> for display-only profiles, or <strong>Add barber login</strong> to create
            their account immediately (temporary password, change on first sign-in). Run{' '}
            <code className="bg-black/5 px-1 rounded">npm run seed:all</code> locally to load the Dream Team + demo accounts.
          </p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((b) => (
            <article
              key={b.barberProfileId}
              className="flex min-w-0 flex-col rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-colors hover:border-headz-red/25 hover:shadow-md"
            >
              <div className="flex min-w-0 gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-black/10 bg-headz-cream">
                  {b.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-lg font-bold text-headz-red">
                        {b.displayName
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-base font-semibold leading-snug text-headz-black">{b.displayName}</h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        b.kind === 'placeholder'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {b.kind === 'placeholder' ? 'Awaiting signup' : 'Linked'}
                    </span>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        b.isActive
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'bg-black/[0.06] text-headz-gray'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        b.showOnHomepage
                          ? 'border border-sky-200 bg-sky-50 text-sky-900'
                          : 'border border-black/10 bg-black/[0.04] text-headz-gray'
                      }`}
                    >
                      {b.showOnHomepage ? 'On website' : 'Hidden on site'}
                    </span>
                  </div>
                  <p className="text-sm text-headz-gray break-words" title={b.email || undefined}>
                    {b.email || '—'}
                  </p>
                  {b.phone ? (
                    <p className="text-xs text-headz-gray/90 break-words">{b.phone}</p>
                  ) : null}
                  <p className="text-xs text-headz-gray/90">
                    <span className="text-headz-gray/70">Joined</span>{' '}
                    <span className="whitespace-nowrap">{formatJoin(b.createdAt)}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 border-t border-black/[0.06] pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-headz-black">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-black/20 text-headz-red focus:ring-headz-red"
                    checked={b.showOnHomepage}
                    disabled={visibilitySavingId === b.barberProfileId}
                    onChange={(e) => void setShowOnWebsite(b, e.target.checked)}
                  />
                  <span>Show on public website (home + book)</span>
                </label>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button
                    type="button"
                    onClick={() => openEditProfile(b)}
                    className="rounded-md px-1 py-0.5 text-sm font-medium text-headz-red underline-offset-2 hover:underline"
                  >
                    Edit profile
                  </button>
                  {b.isActive ? (
                    <button
                      type="button"
                      disabled={pendingToggleId === b.barberProfileId}
                      onClick={() => void setActiveState(b, false)}
                      className="rounded-md px-1 py-0.5 text-sm font-medium text-headz-gray underline-offset-2 hover:text-headz-black hover:underline disabled:opacity-50"
                    >
                      {pendingToggleId === b.barberProfileId ? '…' : 'Deactivate'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingToggleId === b.barberProfileId}
                      onClick={() => void setActiveState(b, true)}
                      className="rounded-md px-1 py-0.5 text-sm font-medium text-headz-red underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {pendingToggleId === b.barberProfileId ? '…' : 'Reactivate'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeBarber(b)}
                    className="rounded-md px-1 py-0.5 text-sm font-medium text-red-700 underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalMode && modalMode !== 'edit' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-black/10"
            role="dialog"
            aria-modal
            aria-labelledby="barber-modal-title"
          >
            <h2 id="barber-modal-title" className="text-lg font-semibold text-headz-black">
              {modalMode === 'invite' ? 'Add barber login' : 'Add to roster'}
            </h2>
            <p className="text-sm text-headz-gray mt-1">
              {modalMode === 'invite'
                ? 'Creates Supabase auth + staff profile now. Share the temporary password; they must set a new password after signing in.'
                : 'They’ll appear here immediately. When they sign up with this exact email, their account links to this profile.'}
            </p>
            {modalMode === 'invite' && inviteTempPassword ? (
              <div className="mt-4 rounded-lg border border-headz-red/20 bg-headz-cream p-4">
                <p className="text-xs font-medium text-headz-black">Temporary password — copy now (shown once)</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 break-all rounded border border-black/10 bg-white px-2 py-2 font-mono text-sm">
                    {inviteTempPassword}
                  </code>
                  <button
                    type="button"
                    className="rounded-lg border border-black/15 p-2 hover:bg-black/5"
                    onClick={() => {
                      void navigator.clipboard.writeText(inviteTempPassword)
                      toast.success('Copied')
                    }}
                    aria-label="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
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
                {modalMode === 'roster' && (
                  <div>
                    <label className="block text-sm font-medium text-headz-black mb-1">Photo URL (optional)</label>
                    <input
                      className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetModal}
                className="px-4 py-2 rounded-lg border border-black/15 text-sm"
              >
                {modalMode === 'invite' && inviteTempPassword ? 'Done' : 'Cancel'}
              </button>
              {!(modalMode === 'invite' && inviteTempPassword) && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void (modalMode === 'invite' ? sendInvite() : addToRoster())}
                  className="px-4 py-2 rounded-lg bg-headz-red text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : modalMode === 'invite' ? 'Create account' : 'Add to roster'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {modalMode === 'edit' && editRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal
            aria-labelledby="barber-edit-title"
          >
            <h2 id="barber-edit-title" className="text-lg font-semibold text-headz-black">
              Edit barber profile
            </h2>
            <p className="mt-1 text-sm text-headz-gray">
              Public name, photo, sort order, and website visibility. Linked accounts also update the staff display name.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-headz-black">Display name</label>
                <input
                  className="w-full rounded-lg border border-black/15 px-3 py-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-headz-black">Photo URL (optional)</label>
                <input
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-headz-black">Sort order</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-black/15 px-3 py-2"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                />
                <p className="mt-1 text-xs text-headz-gray">Lower numbers appear first on the team grid.</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-headz-black">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-black/20 text-headz-red focus:ring-headz-red"
                  checked={editShowOnHomepage}
                  onChange={(e) => setEditShowOnHomepage(e.target.checked)}
                />
                <span>Show on public website</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={resetModal} className="rounded-lg border border-black/15 px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveProfileEdit()}
                className="rounded-lg bg-headz-red px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
