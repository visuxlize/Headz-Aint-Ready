'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronLeft, Loader2, XCircle } from 'lucide-react'
import { SquirePOSStatus } from '@/components/pos/SquirePOSStatus'
import { SQUIRE } from '@/lib/squire-config'

type ServiceRow = { id: string; name: string; price: string }
type BootstrapPayload = {
  viewerId?: string
  services?: ServiceRow[]
}

function parsePrice(s: string) {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export default function BarberSquirePosPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<BootstrapPayload | null>(null)
  const [squireConnected, setSquireConnected] = useState(false)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'pending' | 'processing' | 'complete' | 'cancelled'>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [bootRes, stRes] = await Promise.all([
        fetch('/api/pos/bootstrap', { credentials: 'include' }),
        fetch('/api/squire/status', { credentials: 'include' }),
      ])
      const bootJson = (await bootRes.json().catch(() => ({}))) as BootstrapPayload & { error?: string }
      if (!bootRes.ok) throw new Error(bootJson.error || 'Could not load POS data')
      setData(bootJson)
      const stJson = await stRes.json().catch(() => ({}))
      setSquireConnected(stRes.ok && Boolean((stJson as { connected?: boolean }).connected))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const defaultService = useMemo(() => data?.services?.[0] ?? null, [data])

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopPoll()
  }, [stopPoll])

  useEffect(() => {
    if (!checkoutId || phase !== 'processing') {
      stopPoll()
      return
    }

    const tick = async () => {
      try {
        const r = await fetch(`/api/squire/checkout/${encodeURIComponent(checkoutId)}`, { credentials: 'include' })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) return
        const st = String(j.status ?? '').toUpperCase()
        if (st === 'COMPLETED' || st === 'COMPLETE' || st === 'PAID') {
          stopPoll()
          setPhase('complete')
          setCheckoutId(null)
        } else if (st === 'CANCELED' || st === 'CANCELLED') {
          stopPoll()
          setPhase('cancelled')
          setCheckoutId(null)
        }
      } catch {
        /* ignore */
      }
    }

    void tick()
    pollRef.current = setInterval(() => void tick(), 3000)
    return () => stopPoll()
  }, [checkoutId, phase, stopPoll])

  const runCardCheckout = async () => {
    const barberId = data?.viewerId
    const svc = defaultService
    if (!barberId || !svc) {
      setErr('Missing barber or service — contact admin.')
      return
    }
    setErr(null)
    setPhase('pending')
    const total = parsePrice(svc.price)

    try {
      const createRes = await fetch('/api/pos/create-transaction', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          customerName: 'Walk-in',
          items: [{ serviceId: svc.id, name: svc.name, price: svc.price }],
          subtotal: total,
          tipAmount: 0,
          total,
          paymentMethod: 'card',
        }),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok) throw new Error((createJson as { error?: string }).error || 'Could not start sale')

      const transactionId = (createJson as { id: string }).id

      const tcRes = await fetch('/api/squire/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          serviceId: svc.id,
          amount: total,
          transactionId,
        }),
      })
      const tcJson = await tcRes.json().catch(() => ({}))
      if (!tcRes.ok) throw new Error((tcJson as { error?: string }).error || 'Squire checkout failed')

      const cid = (tcJson as { checkoutId?: string }).checkoutId
      if (!cid) throw new Error('No checkout id returned')

      setCheckoutId(cid)
      setPhase('processing')
    } catch (e) {
      setPhase('idle')
      setCheckoutId(null)
      setErr(e instanceof Error ? e.message : 'Charge failed')
    }
  }

  const runCash = async () => {
    const barberId = data?.viewerId
    const svc = defaultService
    if (!barberId || !svc) {
      setErr('Missing barber or service — contact admin.')
      return
    }
    setErr(null)
    const total = parsePrice(svc.price)
    try {
      const createRes = await fetch('/api/pos/create-transaction', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          customerName: 'Walk-in',
          items: [{ serviceId: svc.id, name: svc.name, price: svc.price }],
          subtotal: total,
          tipAmount: 0,
          total,
          paymentMethod: 'cash',
        }),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok) throw new Error((createJson as { error?: string }).error || 'Could not start sale')
      const transactionId = (createJson as { id: string }).id

      const cashRes = await fetch('/api/squire/record-cash', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(total * 100),
          cashGivenCents: Math.round(total * 100),
          transactionId,
        }),
      })
      if (!cashRes.ok) {
        const j = await cashRes.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || 'Cash record failed')
      }
      setPhase('complete')
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Cash failed')
    }
  }

  if (loading) {
    return (
      <div className="-mx-4 flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-headz-black px-4 sm:-mx-6 sm:px-6">
        <Loader2 className="h-8 w-8 animate-spin text-headz-red/80" />
        <p className="text-sm text-white/50">Loading checkout…</p>
      </div>
    )
  }

  return (
    <div className="-mx-4 min-h-[calc(100vh-8rem)] bg-headz-black px-4 pb-12 pt-4 sm:-mx-6 sm:px-6">
      <Link
        href="/dashboard/barber"
        className="inline-flex items-center gap-1 text-sm font-medium text-white/60 transition hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-white">Checkout</h1>
        <SquirePOSStatus connected={squireConnected} variant="dark" />
      </div>

      <a
        href={SQUIRE.adminAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center rounded-2xl bg-headz-red py-4 text-center text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-headz-red/30 transition hover:bg-headz-redDark"
      >
        Open Squire POS Terminal
      </a>

      {defaultService ? (
        <p className="mt-3 text-center text-xs text-white/45">
          Device checkout uses your first active service ({defaultService.name} · ${parsePrice(defaultService.price).toFixed(2)}).
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-amber-200/90">Add active services in the dashboard for device checkout.</p>
      )}

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Or charge from this device</p>
        {err ? <p className="mt-3 text-sm text-red-300">{err}</p> : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={!defaultService || phase === 'processing' || phase === 'pending' || !squireConnected}
            onClick={() => void runCardCheckout()}
            className="w-full rounded-xl bg-headz-red py-3.5 text-sm font-bold text-white transition enabled:hover:bg-headz-redDark disabled:cursor-not-allowed disabled:opacity-45"
          >
            Charge Card
          </button>
          <button
            type="button"
            disabled={!defaultService || phase === 'processing' || phase === 'pending'}
            onClick={() => void runCash()}
            className="w-full rounded-xl border-2 border-white/20 py-3.5 text-sm font-bold text-white transition hover:border-headz-red hover:text-headz-red disabled:cursor-not-allowed disabled:opacity-45"
          >
            Record Cash Payment
          </button>
        </div>

        {phase === 'idle' && !squireConnected ? (
          <p className="mt-4 text-xs text-amber-200/90">
            Configure <code className="text-white/80">SQUIRE_API_KEY</code> to enable card checkout.
          </p>
        ) : null}

        {phase === 'pending' ? (
          <div className="mt-8 flex flex-col items-center gap-2 text-white/80">
            <Loader2 className="h-8 w-8 animate-spin text-headz-red/90" />
            <p className="text-sm font-medium">Pending</p>
          </div>
        ) : null}

        {phase === 'processing' ? (
          <div className="mt-8 flex flex-col items-center gap-2 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-headz-red" />
            <p className="text-sm font-medium">Processing</p>
            <p className="text-center text-xs text-white/50">Checking Squire every 3s…</p>
          </div>
        ) : null}

        {phase === 'complete' ? (
          <div className="mt-8 flex flex-col items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-12 w-12" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-white">Complete</p>
            <button
              type="button"
              onClick={() => {
                setPhase('idle')
                void load()
              }}
              className="mt-2 text-xs text-white/50 underline hover:text-white"
            >
              Done
            </button>
          </div>
        ) : null}

        {phase === 'cancelled' ? (
          <div className="mt-8 flex flex-col items-center gap-2 text-red-400">
            <XCircle className="h-12 w-12" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-white">Failed</p>
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="mt-2 text-xs text-white/50 underline hover:text-white"
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
