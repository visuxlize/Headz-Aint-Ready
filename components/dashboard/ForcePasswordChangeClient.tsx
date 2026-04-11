'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function ForcePasswordChangeClient({ email, role }: { email: string; role: string }) {
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) {
      toast.error('Use at least 8 characters.')
      return
    }
    if (pw !== pw2) {
      toast.error('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/account/mandatory-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pw }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not update password')
      toast.success('Password updated.')
      router.replace(role === 'admin' ? '/dashboard' : '/dashboard/barber')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-lg">
      <h1 className="text-xl font-bold text-headz-black">Choose a new password</h1>
      <p className="mt-2 text-sm text-headz-gray">
        Your account ({email}) is using a temporary password. Set a new password you’ll use from now on to continue
        to the dashboard.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-headz-black mb-1">New password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-headz-black mb-1">Confirm password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-headz-red py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
