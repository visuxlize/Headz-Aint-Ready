'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, ChevronLeft, Loader2, Smartphone, Tablet, Unplug, X } from 'lucide-react'

type DeviceRow = {
  id: string
  deviceId: string | null
  deviceCodeId: string | null
  deviceName: string
  status: string
  pairedAt: string | null
  createdAt: string
}

export default function SquareDevicesPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [name, setName] = useState('Front Counter')
  const [code, setCode] = useState<{ code: string; pairBy: string | null; deviceCodeId: string } | null>(null)
  const [expiresIn, setExpiresIn] = useState(300)
  const [pairingId, setPairingId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/square/devices', { credentials: 'include' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          j.error ||
          (res.status === 403 ? 'Admin access required to manage devices.' : `Request failed (${res.status})`)
        setLoadError(msg)
        setDevices([])
        return
      }
      setDevices(j.devices ?? [])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Network error')
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!code) return
    setExpiresIn(300)
    const t = setInterval(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [code])

  useEffect(() => {
    if (!pairingId) return
    const id = setInterval(async () => {
      const res = await fetch(`/api/square/devices/${pairingId}`, { credentials: 'include' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) return
      const st = j.device?.status
      if (st === 'paired') {
        toast.success('Terminal connected!')
        setPanelOpen(false)
        setCode(null)
        setPairingId(null)
        void load()
      }
    }, 8000)
    return () => clearInterval(id)
  }, [pairingId, load])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/square/devices', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: name.trim() || 'Square Terminal' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(j.error || 'Could not create pairing code. Check Square env vars and try again.')
        return
      }
      setCode({ code: j.code, pairBy: j.pairBy ?? null, deviceCodeId: j.deviceCodeId })
      const listRes = await fetch('/api/square/devices', { credentials: 'include' })
      const listJson = await listRes.json().catch(() => ({}))
      const row = (listJson.devices ?? []).find((d: DeviceRow) => d.deviceCodeId === j.deviceCodeId)
      setDevices(listJson.devices ?? [])
      setPairingId(row?.id ?? null)
    } finally {
      setGenerating(false)
    }
  }

  const unlink = async (id: string) => {
    if (!confirm('Remove this device from the POS?')) return
    const res = await fetch(`/api/square/devices/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || 'Failed')
      return
    }
    toast.success('Device removed')
    void load()
  }

  const paired = devices.filter((d) => d.status === 'paired')
  const mm = Math.floor(expiresIn / 60)
  const ss = String(expiresIn % 60).padStart(2, '0')

  return (
    <div className="mx-auto max-w-3xl pb-16 pt-2 sm:pt-4">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-headz-gray transition hover:text-headz-black"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back to dashboard
      </Link>

      {/* Header — icon left of title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-headz-red/15 to-headz-red/5 ring-1 ring-headz-red/20">
          <Tablet className="h-8 w-8 text-headz-red" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-headz-black">Square Terminal</h1>
          <p className="mt-2 max-w-lg text-headz-gray">
            Pair your physical Square Terminal so the POS can send card payments to the counter. Cash is still
            recorded here and in Square separately.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/90 p-6 shadow-sm">
          <p className="font-medium text-amber-950">Couldn’t load devices</p>
          <p className="mt-1 text-sm text-amber-900/85">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-lg bg-headz-black px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !loadError ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-headz-red/70" />
          <p className="text-sm text-headz-gray">Loading devices…</p>
        </div>
      ) : !loadError && paired.length === 0 ? (
        /* Empty state — centered, inviting */
        <div className="mt-10">
          <div className="relative overflow-hidden rounded-3xl border border-black/[0.07] bg-gradient-to-b from-white to-[#f7f5f2] p-10 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.15)] sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-headz-red/[0.06] blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#c9a227]/10 blur-2xl" />

            <div className="relative mx-auto max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-black/5 bg-white shadow-sm">
                <Smartphone className="h-10 w-10 text-headz-gray/80" strokeWidth={1.25} />
              </div>
              <h2 className="font-serif text-xl font-semibold text-headz-black">No terminal paired yet</h2>
              <p className="mt-3 text-sm leading-relaxed text-headz-gray">
                When you pair a device, card charges from the POS go straight to your Square Terminal. You’ll
                enter a short code on the device once — after that it stays connected.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPanelOpen(true)
                  setCode(null)
                }}
                className="mt-8 inline-flex min-w-[200px] items-center justify-center rounded-xl bg-headz-red px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-headz-red/25 transition hover:bg-headz-redDark"
              >
                Pair a terminal
              </button>

              <div className="mt-10 border-t border-black/5 pt-8 text-left">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-headz-gray">
                  How it works
                </p>
                <ol className="mt-6 space-y-4">
                  {[
                    'Tap “Pair a terminal” and name this register (e.g. Front Counter).',
                    'We show a one-time code — enter it on the Square Terminal under Settings → Account.',
                    'When the device pairs, the POS shows “Terminal ready” and you can take card payments.',
                  ].map((text, i) => (
                    <li key={i} className="flex gap-4 text-sm text-headz-black/85">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-headz-black text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : !loadError ? (
        /* Has devices */
        <div className="mt-10 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-lg font-semibold text-headz-black">Your devices</h2>
            <button
              type="button"
              onClick={() => {
                setPanelOpen(true)
                setCode(null)
              }}
              className="inline-flex items-center justify-center rounded-xl border-2 border-headz-red/30 bg-white px-5 py-2.5 text-sm font-semibold text-headz-red transition hover:bg-headz-red/5"
            >
              + Pair another terminal
            </button>
          </div>

          <ul className="space-y-3">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-4 rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      d.status === 'paired' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {d.status === 'paired' ? (
                      <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
                    ) : (
                      <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-headz-black">{d.deviceName}</p>
                    <p className="mt-1 text-sm text-headz-gray">
                      {d.status === 'paired' && d.pairedAt
                        ? `Paired ${new Date(d.pairedAt).toLocaleString()}`
                        : d.status === 'unpaired'
                          ? 'Waiting for you to enter the code on the terminal…'
                          : d.status}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      d.status === 'paired'
                        ? 'bg-emerald-100 text-emerald-800'
                        : d.status === 'unpaired'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {d.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => void unlink(d.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  >
                    <Unplug className="h-4 w-4" />
                    Unlink
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Pairing modal — centered */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#FAFAF8] p-6 shadow-2xl ring-1 ring-black/10 sm:p-8"
            role="dialog"
            aria-labelledby="pair-title"
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-2 text-headz-gray hover:bg-black/5 hover:text-headz-black"
              onClick={() => {
                setPanelOpen(false)
                setCode(null)
              }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 id="pair-title" className="font-serif text-xl font-bold text-headz-black pr-10">
              {code ? 'Enter this code on the terminal' : 'Pair a Square Terminal'}
            </h2>
            {!code && (
              <p className="mt-2 text-sm text-headz-gray">
                Name helps you tell registers apart if you add more than one later.
              </p>
            )}

            {!code ? (
              <>
                <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-headz-gray">
                  Display name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-inner focus:border-headz-red/40 focus:outline-none focus:ring-2 focus:ring-headz-red/20"
                  placeholder="e.g. Front Counter"
                />
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void generate()}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-headz-red py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-headz-red/20 disabled:opacity-60"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    'Generate pairing code'
                  )}
                </button>
              </>
            ) : (
              <div className="mt-8 space-y-6">
                <div className="rounded-2xl border-2 border-dashed border-headz-red/35 bg-white px-4 py-8 text-center shadow-inner">
                  <p className="font-mono text-4xl font-bold tracking-[0.2em] text-headz-black sm:text-5xl">
                    {code.code}
                  </p>
                  <p className="mt-4 text-sm text-headz-gray">
                    Expires in{' '}
                    <span className="font-mono font-semibold text-headz-black">
                      {mm}:{ss}
                    </span>
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-amber-800">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                  </span>
                  <span className="text-sm font-medium">Waiting for device…</span>
                </div>
                <div className="rounded-xl border border-black/8 bg-white p-5 text-sm leading-relaxed text-headz-gray shadow-sm">
                  <p className="font-semibold text-headz-black">On the Square Terminal</p>
                  <ol className="mt-3 list-decimal space-y-2 pl-5">
                    <li>Swipe from the left edge → <strong>Settings</strong> → <strong>Account</strong></li>
                    <li>Tap <strong>Sign in</strong> → <strong>Use a device code</strong></li>
                    <li>Type the code above using the on-screen keyboard</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
