'use client'

import { useCallback, useState } from 'react'

type Props = {
  initialName: string
  initialAvatarUrl: string | null
  initialEmail: string
  initialPhone: string
}

export function BarberProfileClient({ initialName, initialAvatarUrl, initialEmail, initialPhone }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [urlInput, setUrlInput] = useState(initialAvatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(initialPhone)
  const [accountSaving, setAccountSaving] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      setError(null)
      setMessage(null)
      setUploading(true)
      try {
        const fd = new FormData()
        fd.set('file', file)
        const res = await fetch('/api/barber/profile', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Upload failed')
        const next = json.data?.avatarUrl as string
        setAvatarUrl(next)
        setUrlInput(next)
        setMessage('Profile photo updated.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    []
  )

  const saveAccount = async () => {
    const n = fullName.trim()
    const em = email.trim().toLowerCase()
    if (!n || !em) {
      setError('Name and email are required')
      return
    }
    setAccountSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/barber/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: n,
          email: em,
          phone: phone.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not save')
      setMessage('Account details saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setAccountSaving(false)
    }
  }

  const savePassword = async () => {
    if (newPw.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPw !== newPw2) {
      setError('New passwords do not match.')
      return
    }
    setPwSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not update password')
      setCurrentPw('')
      setNewPw('')
      setNewPw2('')
      setMessage('Password updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setPwSaving(false)
    }
  }

  const saveUrl = async () => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      setError('Enter a valid image URL, or upload a file.')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/barber/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: trimmed }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not save')
      const next = json.data?.avatarUrl as string
      setAvatarUrl(next)
      setMessage('Photo URL saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-headz-black">Account</h2>
        <p className="text-sm text-headz-gray mt-1">
          Your name, email, and phone as shown to the shop. Email is what you use to sign in.
        </p>
        <div className="mt-4 grid gap-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-headz-black mb-1">Display name</label>
            <input
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-headz-black mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-headz-black mb-1">Phone</label>
            <input
              type="tel"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <button
            type="button"
            onClick={() => void saveAccount()}
            disabled={accountSaving}
            className="w-fit rounded-lg bg-headz-red text-white px-4 py-2 text-sm font-medium hover:opacity-95 disabled:opacity-50"
          >
            {accountSaving ? 'Saving…' : 'Save account'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-headz-black">Change password</h2>
        <p className="text-sm text-headz-gray mt-1">Enter your current password, then choose a new one.</p>
        <div className="mt-4 grid gap-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-headz-black mb-1">Current password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-headz-black mb-1">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-headz-black mb-1">Confirm new password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              minLength={8}
            />
          </div>
          <button
            type="button"
            onClick={() => void savePassword()}
            disabled={pwSaving}
            className="w-fit rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-medium hover:bg-black/[0.03] disabled:opacity-50"
          >
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-headz-black">Profile photo</h2>
        <p className="text-sm text-headz-gray mt-1">
          This photo appears on the website team section and booking flow. Upload a new image or paste a
          direct link (JPEG, PNG, WebP, or GIF — max 2MB for uploads).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="shrink-0">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-headz-black/10 border-2 border-black/10">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied or storage URLs
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-headz-gray text-2xl font-medium">
                {fullName.slice(0, 2)}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-4 w-full min-w-0">
          <div>
            <label className="block text-sm font-medium text-headz-black mb-2">Upload from device</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onFile}
              disabled={uploading}
              className="text-sm text-headz-gray file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-black/15 file:bg-white file:text-headz-black"
            />
            {uploading && <p className="text-sm text-headz-gray mt-2">Uploading…</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-headz-black mb-2">Or image URL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void saveUrl()}
                disabled={saving}
                className="rounded-lg bg-headz-red text-white px-4 py-2 text-sm font-medium hover:opacity-95 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save URL'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</p>}
      {error && <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
    </div>
  )
}
