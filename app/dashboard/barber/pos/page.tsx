'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronLeft, Loader2, XCircle } from 'lucide-react'
import { SquirePOSStatus } from '@/components/pos/SquirePOSStatus'

type BootstrapAppointment = {
  id: string
  customerName: string
  barberId: string
  serviceId: string
  serviceName: string
  servicePrice: string
}

type BootstrapPayload = {
  viewerId?: string
  viewerRole?: string
  appointments?: BootstrapAppointment[]
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
      if (!bootRes.ok) throw new Error(bootJson.error || 'Could not load appointments')
      setData(bootJson)
      const stJson = await stRes.json().catch(() => ({}))
      setSquireConnected(stRes.ok && Boolean(stJson.connected))
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

  const nextAppt = useMemo(() => {
    const list = data?.appointments ?? []
    const role = data?.viewerRole
    const vid = data?.viewerId
    const mine = role === 'barber' && vid ? list.filter((a) => a.barberId === vid) : list
    return mine[0] ?? null
  }, [data])

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

  const chargeCustomer = async () => {
    if (!nextAppt) return
    setErr(null)
    setPhase('pending')
    const subtotal = parsePrice(nextAppt.servicePrice)
    const total = subtotal

    try {
      const createRes = await fetch('/api/pos/create-transaction', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: nextAppt.barberId,
          customerName: nextAppt.customerName,
          appointmentId: nextAppt.id,
          items: [
            {
              serviceId: nextAppt.serviceId,
              name: nextAppt.serviceName,
              price: nextAppt.servicePrice,
            },
          ],
          subtotal,
          tipAmount: 0,
          total,
          paymentMethod: 'card',
        }),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok) throw new Error(createJson.error || 'Could not start sale')

      const transactionId = createJson.id as string

      const tcRes = await fetch('/api/squire/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: nextAppt.barberId,
          serviceId: nextAppt.serviceId,
          appointmentId: nextAppt.id,
          amount: total,
          transactionId,
        }),
      })
      const tcJson = await tcRes.json().catch(() => ({}))
      if (!tcRes.ok) throw new Error(tcJson.error || 'Squire checkout failed')

      const cid = tcJson.checkoutId as string | undefined
      if (!cid) throw new Error('No checkout id returned')

      setCheckoutId(cid)
      setPhase('processing')
    } catch (e) {
      setPhase('idle')
      setCheckoutId(null)
      setErr(e instanceof Error ? e.message : 'Charge failed')
    }
  }

  const recordCash = async () => {
    if (!nextAppt) return
    setErr(null)
    const subtotal = parsePrice(nextAppt.servicePrice)
    const total = subtotal
    try {
      const createRes = await fetch('/api/pos/create-transaction', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: nextAppt.barberId,
          customerName: nextAppt.customerName,
          appointmentId: nextAppt.id,
          items: [
            {
              serviceId: nextAppt.serviceId,
              name: nextAppt.serviceName,
              price: nextAppt.servicePrice,
            },
          ],
          subtotal,
          tipAmount: 0,
          total,
          paymentMethod: 'cash',
        }),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok) throw new Error(createJson.error || 'Could not start sale')
      const transactionId = createJson.id as string

      const cashRes = await fetch('/api/squire/record-cash', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(total * 100),
          cashGivenCents: Math.round(total * 100),
          transactionId,
          appointmentId: nextAppt.id,
        }),
      })
      if (!cashRes.ok) {
        const j = await cashRes.json().catch(() => ({}))
        throw new Error(j.error || 'Cash record failed')
      }
      setPhase('complete')
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Cash failed')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-headz-gray">
        <Loader2 className="h-8 w-8 animate-spin text-headz-red/80" />
        <p className="text-sm">Loading checkout…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 pb-16 pt-2">
      <Link
        href="/dashboard/barber"
        className="inline-flex items-center gap-1 text-sm font-medium text-white/60 transition hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <div className="rounded-2xl border border-white/10 bg-[#111] p-6 shadow-xl ring-1 ring-headz-red/15">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-bold text-white">Checkout</h1>
          <SquirePOSStatus connected={squireConnected} variant="dark" />
        </div>
        <p className="mt-2 text-sm text-white/60">Squire terminal — charge the next guest on the books.</p>

        {err ? <p className="mt-4 text-sm text-red-300">{err}</p> : null}

        {nextAppt ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4 text-white">
            <p className="text-xs uppercase tracking-widest text-headz-red">Next appointment</p>
            <p className="mt-2 text-lg font-semibold">{nextAppt.customerName}</p>
            <p className="text-sm text-white/70">{nextAppt.serviceName}</p>
            <p className="mt-2 text-xl font-bold text-headz-red">${parsePrice(nextAppt.servicePrice).toFixed(2)}</p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/55">No pending appointments for you today.</p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={!nextAppt || phase === 'processing' || phase === 'pending' || !squireConnected}
            onClick={() => void chargeCustomer()}
            className="w-full rounded-xl bg-headz-red py-4 text-sm font-bold uppercase tracking-wide text-white transition enabled:hover:bg-headz-redDark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === 'processing' ? 'Processing…' : 'Charge customer'}
          </button>
          <button
            type="button"
            disabled={!nextAppt || phase === 'processing' || phase === 'pending'}
            onClick={() => void recordCash()}
            className="w-full rounded-xl border-2 border-white/20 py-4 text-sm font-bold uppercase tracking-wide text-white transition hover:border-headz-red hover:text-headz-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            Record cash payment
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
            <p className="text-center text-xs text-white/50">Starting Squire checkout…</p>
          </div>
        ) : null}

        {phase === 'processing' ? (
          <div className="mt-8 flex flex-col items-center gap-2 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-headz-red" />
            <p className="text-sm font-medium">Processing</p>
            <p className="text-center text-xs text-white/50">Waiting for Squire terminal (polling every 3s)</p>
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
            <p className="text-sm font-semibold text-white">Cancelled</p>
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
