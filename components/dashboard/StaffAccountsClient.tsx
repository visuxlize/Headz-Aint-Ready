'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { toastApiError, toastUnexpected } from '@/lib/errors/toast-safe'
import { Copy } from 'lucide-react'

type StaffRow = {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: string
  isActive: boolean
  mustChangePassword: boolean
  barberProfileId: string | null
  displayName: string
}

export function StaffAccountsClient() {
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState<StaffRow | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [resetFor, setResetFor] = useState<StaffRow | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteTempPassword, setInviteTempPassword] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/staff', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        setRows([])
        return
      }
      setRows(json.data ?? [])
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

  const openEdit = (r: StaffRow) => {
    setEditRow(r)
    setFullName(r.fullName ?? r.displayName)
    setEmail(r.email)
    setPhone(r.phone ?? '')
  }

  const saveEdit = async () => {
    if (!editRow) return
    const fn = fullName.trim()
    const em = email.trim().toLowerCase()
    if (!fn || !em) {
      toast.error('Name and email are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/staff/${editRow.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fn,
          email: em,
          phone: phone.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        return
      }
      toast.success('Account updated')
      setEditRow(null)
      void load()
    } catch (e) {
      toastUnexpected(e)
    } finally {
      setSaving(false)
    }
  }

  const sendAdminInvite = async () => {
    const fn = inviteName.trim()
    const em = inviteEmail.trim().toLowerCase()
    if (!fn || !em) {
      toast.error('Name and email are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fn, email: em }),
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
        setInviteOpen(false)
        setInviteName('')
        setInviteEmail('')
      }
      void load()
    } catch (e) {
      toastUnexpected(e)
    } finally {
      setSaving(false)
    }
  }

  const setStaffActive = async (r: StaffRow, next: boolean) => {
    const verb = next ? 'reactivate' : 'deactivate'
    if (!window.confirm(`${next ? 'Reactivate' : 'Deactivate'} ${r.displayName}?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/staff/${r.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        return
      }
      toast.success(next ? 'Account reactivated' : 'Account deactivated')
      void load()
    } catch (e) {
      toastUnexpected(e)
    } finally {
      setSaving(false)
    }
  }

  const doReset = async () => {
    if (!resetFor) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/staff/${resetFor.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApiError(res)
        return
      }
      setTempPassword(json.temporaryPassword as string)
      toast.success('Temporary password generated')
      void load()
    } catch (e) {
      toastUnexpected(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-headz-gray text-sm py-8">Loading staff…</div>
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-headz-gray max-w-2xl">
        Add admin accounts with an auto-generated password (they change it on first sign-in), edit login details,
        deactivate accounts, or reset passwords. Barber roster cards
        and public photos are managed under{' '}
        <a href="/dashboard/settings/barbers" className="font-medium text-headz-red hover:underline">
          Barber management
        </a>
        .
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setInviteOpen(true)
            setInviteName('')
            setInviteEmail('')
            setInviteTempPassword(null)
          }}
          className="inline-flex items-center rounded-lg bg-headz-red px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-headz-redDark"
        >
          Add admin
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-black/[0.03] text-headz-gray text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium min-w-[10rem]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-black/[0.02]">
                <td className="px-4 py-3 font-medium text-headz-black">{r.displayName}</td>
                <td className="px-4 py-3 text-headz-gray break-all">{r.email}</td>
                <td className="px-4 py-3 text-headz-gray">{r.phone || '—'}</td>
                <td className="px-4 py-3 capitalize">{r.role}</td>
                <td className="px-4 py-3">
                  <span className={r.isActive ? 'text-emerald-700' : 'text-headz-gray'}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {r.mustChangePassword && (
                    <span className="ml-2 text-xs font-medium text-amber-700">Must change password</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="text-headz-red font-medium hover:underline"
                    >
                      Edit
                    </button>
                    {r.isActive ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void setStaffActive(r, false)}
                        className="text-headz-gray font-medium hover:underline disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void setStaffActive(r, true)}
                        className="text-headz-red font-medium hover:underline disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setResetFor(r)
                        setTempPassword(null)
                      }}
                      className="text-headz-black/80 font-medium hover:underline"
                    >
                      Reset password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-black/10" role="dialog">
            <h2 className="text-lg font-semibold text-headz-black">Edit account</h2>
            <p className="text-sm text-headz-gray mt-1">{editRow.displayName}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Full name</label>
                <input
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Email (login)</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setEditRow(null)} className="px-4 py-2 rounded-lg border border-black/15 text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEdit()}
                className="px-4 py-2 rounded-lg bg-headz-red text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl" role="dialog">
            <h2 className="text-lg font-semibold text-headz-black">Add admin</h2>
            <p className="mt-1 text-sm text-headz-gray">
              Creates their login immediately. They use the temporary password once, then set a new password (same as
              password reset flow).
            </p>
            {inviteTempPassword ? (
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
                  <label className="mb-1 block text-sm font-medium text-headz-black">Full name</label>
                  <input
                    className="w-full rounded-lg border border-black/15 px-3 py-2"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-headz-black">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-black/15 px-3 py-2"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setInviteOpen(false)
                  setInviteTempPassword(null)
                  setInviteName('')
                  setInviteEmail('')
                }}
                className="rounded-lg border border-black/15 px-4 py-2 text-sm"
              >
                {inviteTempPassword ? 'Done' : 'Cancel'}
              </button>
              {!inviteTempPassword && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void sendAdminInvite()}
                  className="rounded-lg bg-headz-red px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {resetFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-black/10" role="dialog">
            <h2 className="text-lg font-semibold text-headz-black">Reset password</h2>
            <p className="text-sm text-headz-gray mt-1">
              Generate a temporary password for <strong>{resetFor.displayName}</strong>. Share it securely; they must
              pick a new password after signing in.
            </p>
            {tempPassword ? (
              <div className="mt-4 p-3 rounded-lg bg-headz-cream border border-black/10">
                <p className="text-xs text-headz-gray mb-2">One-time password (copy now):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm break-all font-mono bg-white px-2 py-1 rounded border">{tempPassword}</code>
                  <button
                    type="button"
                    className="p-2 rounded-lg border border-black/15 hover:bg-black/5"
                    onClick={() => {
                      void navigator.clipboard.writeText(tempPassword)
                      toast.success('Copied')
                    }}
                    aria-label="Copy password"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setResetFor(null)
                  setTempPassword(null)
                }}
                className="px-4 py-2 rounded-lg border border-black/15 text-sm"
              >
                {tempPassword ? 'Done' : 'Cancel'}
              </button>
              {!tempPassword && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void doReset()}
                  className="px-4 py-2 rounded-lg bg-headz-red text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '…' : 'Generate password'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
