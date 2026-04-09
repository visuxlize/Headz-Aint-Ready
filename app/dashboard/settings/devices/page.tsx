'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ExternalLink, Tablet } from 'lucide-react'
import { SquirePOSStatus } from '@/components/pos/SquirePOSStatus'

export default function SquireTerminalSettingsPage() {
  const [connected, setConnected] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/squire/status', { credentials: 'include' })
      const j = await res.json().catch(() => ({}))
      if (res.ok) setConnected(Boolean(j.connected))
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-3xl pb-16 pt-2 sm:pt-4">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-headz-gray transition hover:text-headz-black"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back to dashboard
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-headz-red/15 to-headz-red/5 ring-1 ring-headz-red/20">
          <Tablet className="h-8 w-8 text-headz-red" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-headz-black">Squire Terminal</h1>
          <p className="mt-2 max-w-lg text-headz-gray">
            Card payments and appointments run through{' '}
            <a href="https://www.getsquire.com" className="text-headz-red hover:underline" target="_blank" rel="noreferrer">
              Squire
            </a>
            . Pair terminals and manage POS from the Squire dashboard — this screen links you there and shows
            whether your server has a Squire API key configured.
          </p>
          <div className="mt-4 flex justify-center sm:justify-start">
            <SquirePOSStatus connected={connected} />
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6 rounded-3xl border border-black/[0.07] bg-gradient-to-b from-white to-[#f7f5f2] p-8 shadow-sm sm:p-10">
        <h2 className="font-serif text-lg font-semibold text-headz-black">Configuration</h2>
        <ol className="list-decimal space-y-4 pl-5 text-sm text-headz-black/85">
          <li>
            Sign in to{' '}
            <a
              href="https://app.getsquire.com/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-headz-red hover:underline"
            >
              app.getsquire.com/settings
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>{' '}
            and complete terminal / location setup in Squire.
          </li>
          <li>
            Add <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">SQUIRE_API_KEY</code>,{' '}
            <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">SQUIRE_WEBHOOK_SECRET</code>, and{' '}
            <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">SQUIRE_LOCATION_ID</code> to your
            hosting environment (e.g. Netlify / Vercel), then redeploy.
          </li>
          <li>
            Point Squire webhooks to{' '}
            <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">/api/squire/webhook</code> on your
            production domain.
          </li>
        </ol>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://app.getsquire.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-headz-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-headz-red/20 transition hover:bg-headz-redDark"
          >
            Open Squire app
          </a>
          <Link
            href="/dashboard/pos"
            className="inline-flex items-center justify-center rounded-xl border-2 border-headz-red/30 bg-white px-6 py-3 text-sm font-semibold text-headz-red transition hover:bg-headz-red/5"
          >
            Admin POS overview
          </Link>
        </div>
      </div>
    </div>
  )
}
