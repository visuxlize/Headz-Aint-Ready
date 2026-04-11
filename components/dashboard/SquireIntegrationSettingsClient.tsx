'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Copy, ExternalLink, Tablet } from 'lucide-react'
import toast from 'react-hot-toast'
import { SquirePOSStatus } from '@/components/pos/SquirePOSStatus'

export function SquireIntegrationSettingsClient() {
  const [connected, setConnected] = useState(false)
  const [hasLocationId, setHasLocationId] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/squire/status', { credentials: 'include' })
      const j = (await res.json().catch(() => ({}))) as { connected?: boolean; hasLocationId?: boolean }
      if (res.ok) {
        setConnected(Boolean(j.connected))
        setHasLocationId(typeof j.hasLocationId === 'boolean' ? j.hasLocationId : null)
      }
    } catch {
      setConnected(false)
      setHasLocationId(null)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const webhookUrl = `${origin}/api/squire/webhook`

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      toast.success('Webhook URL copied')
    } catch {
      toast.error('Could not copy')
    }
  }

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
          <h1 className="font-serif text-3xl font-bold tracking-tight text-headz-black">Squire Integration</h1>
          <p className="mt-2 max-w-lg text-headz-gray">
            Card payments, booking, and POS run through{' '}
            <a
              href="https://www.getsquire.com"
              className="text-headz-red hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Squire
            </a>
            . This page shows whether your server credentials are set and the webhook URL to paste in the Squire
            partner portal.
          </p>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-black/[0.07] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-serif text-lg font-semibold text-headz-black">Integration health</h2>
        <ul className="mt-4 space-y-4 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-4">
            <span className="font-medium text-headz-black">API key</span>
            <span className="inline-flex items-center gap-1.5">
              {connected ? (
                <>
                  <span className="text-emerald-600" aria-hidden>
                    ✓
                  </span>
                  <span className="text-emerald-800">SQUIRE_API_KEY detected</span>
                </>
              ) : (
                <>
                  <span className="text-red-600" aria-hidden>
                    ✗
                  </span>
                  <span className="text-red-800">Missing SQUIRE_API_KEY</span>
                </>
              )}
            </span>
          </li>
          <li className="border-b border-black/5 pb-4">
            <span className="font-medium text-headz-black">Webhook URL</span>
            <p className="mt-2 text-headz-gray text-xs">Register this URL in Squire webhook settings.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="block flex-1 min-w-0 overflow-x-auto rounded-lg bg-black/[0.06] px-3 py-2 text-xs">
                {webhookUrl || '…'}
              </code>
              <button
                type="button"
                onClick={() => void copyWebhook()}
                className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium hover:bg-black/[0.03]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </button>
            </div>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-headz-black">Location ID</span>
            <span className="inline-flex items-center gap-1.5">
              {hasLocationId === true && (
                <>
                  <span className="text-emerald-600">✓</span>
                  <span className="text-emerald-800">SQUIRE_LOCATION_ID set</span>
                </>
              )}
              {hasLocationId === false && (
                <>
                  <span className="text-amber-600">⚠</span>
                  <span className="text-amber-900">SQUIRE_LOCATION_ID not set</span>
                </>
              )}
              {hasLocationId === null && <span className="text-headz-gray">Checking…</span>}
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-6 flex justify-center sm:justify-start">
        <SquirePOSStatus connected={connected} />
      </div>

      <div className="mt-10 space-y-6 rounded-3xl border border-black/[0.07] bg-gradient-to-b from-white to-[#f7f5f2] p-8 shadow-sm sm:p-10">
        <h2 className="font-serif text-lg font-semibold text-headz-black">Setup</h2>
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
            <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">SQUIRE_LOCATION_ID</code> to your hosting
            environment (e.g. Netlify), then redeploy.
          </li>
          <li>
            Point Squire webhooks to <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">/api/squire/webhook</code>{' '}
            on your production domain (full URL above).
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
        </div>
      </div>
    </div>
  )
}
