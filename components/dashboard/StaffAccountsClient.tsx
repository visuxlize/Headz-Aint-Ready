'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/staff', { credentials: 'include' })
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
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success('Account updated')
      setEditRow(null)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
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
      if (!res.ok) throw new Error(json.error || 'Reset failed')
      setTempPassword(json.temporaryPassword as string)
      toast.success('Temporary password generated')
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reset failed')
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
        Edit names, emails, and phone numbers for every admin and barber account. Use <strong>Reset password</strong> to
        set a one-time password — they sign in with it once, then choose their own password.
      </p>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-black/[0.03] text-headz-gray text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium w-40" />
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="text-headz-red font-medium hover:underline"
                    >
                      Edit
                    </button>
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
