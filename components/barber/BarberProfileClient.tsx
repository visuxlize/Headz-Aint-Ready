'use client'

import { useCallback, useState } from 'react'

type Props = {
  initialName: string
  initialAvatarUrl: string | null
}

export function BarberProfileClient({ initialName, initialAvatarUrl }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [urlInput, setUrlInput] = useState(initialAvatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
                {initialName.slice(0, 2)}
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
