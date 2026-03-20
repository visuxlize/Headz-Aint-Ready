'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadStripeTerminal } from '@stripe/terminal-js'
import type { Terminal } from '@stripe/terminal-js/types/terminal'

type ServiceRow = {
  id: string
  name: string
  price: string
  displayPrice?: string
  durationMinutes: number
  category: string | null
}

type BarberRow = { id: string; name: string; email: string }

type ApptRow = {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  timeSlot: string
  barberId: string
  serviceId: string
  serviceName: string
  servicePrice: string
  barberName: string
  isWalkIn: boolean
}

type CartItem = { serviceId: string; name: string; price: string }

function money(n: number) {
  return n.toFixed(2)
}

function parsePrice(s: string) {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function HeadzPOS({ onBack }: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [today, setToday] = useState('')
  const [services, setServices] = useState<ServiceRow[]>([])
  const [barbers, setBarbers] = useState<BarberRow[]>([])
  const [todayAppts, setTodayAppts] = useState<ApptRow[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedAppt, setSelectedAppt] = useState<ApptRow | null>(null)
  const [barberId, setBarberId] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [tip, setTip] = useState('0')
  const [receiptEmail, setReceiptEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [terminalWarning, setTerminalWarning] = useState<string | null>(null)
  const [terminalReady, setTerminalReady] = useState(false)
  const terminalRef = useRef<Terminal | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/pos/bootstrap', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load POS data')
      setToday(json.today ?? '')
      setServices(json.services ?? [])
      setBarbers(json.barbers ?? [])
      setTodayAppts(json.appointments ?? [])
      setBarberId((prev) => prev || json.barbers?.[0]?.id || '')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + parsePrice(i.price), 0),
    [cart]
  )
  const tipNum = Number.parseFloat(tip) || 0
  const total = subtotal + tipNum

  useEffect(() => {
    let cancelled = false
    async function initTerminal() {
      setTerminalWarning(null)
      try {
        const StripeTerminal = await loadStripeTerminal()
        if (!StripeTerminal || cancelled) return
        const terminal = StripeTerminal.create({
          onFetchConnectionToken: async () => {
            const r = await fetch('/api/stripe/connection-token', {
              method: 'POST',
              credentials: 'include',
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j.error || 'Connection token failed')
            return j.secret as string
          },
        })
        terminalRef.current = terminal
        const disc = await terminal.discoverReaders({ simulated: true })
        if (cancelled) return
        if ('error' in disc && disc.error) {
          setTerminalWarning(
            disc.error.message ?? 'Stripe Terminal could not discover a reader. Card payments may be unavailable.'
          )
          return
        }
        const readers = 'discoveredReaders' in disc ? disc.discoveredReaders : []
        if (readers.length > 0) {
          const conn = await terminal.connectReader(readers[0])
          if ('error' in conn && conn.error) {
            setTerminalWarning(conn.error.message ?? 'Could not connect reader.')
            return
          }
        }
        setTerminalReady(true)
      } catch (e) {
        if (!cancelled) {
          setTerminalWarning(
            e instanceof Error
              ? e.message
              : 'Stripe Terminal did not initialize. Cash still works.'
          )
        }
      }
    }
    void initTerminal()
    return () => {
      cancelled = true
    }
  }, [])

  const addService = (s: ServiceRow) => {
    setCart((c) => [...c, { serviceId: s.id, name: s.name, price: s.price }])
  }

  const pickAppointment = (a: ApptRow) => {
    setSelectedAppt(a)
    setCustomerName(a.customerName)
    setBarberId(a.barberId)
    setCart([{ serviceId: a.serviceId, name: a.serviceName, price: a.servicePrice }])
    if (a.customerEmail) setReceiptEmail(a.customerEmail)
  }

  const clearCart = () => {
    setSelectedAppt(null)
    setCart([])
    setCustomerName('')
    setTip('0')
  }

  const runCardCharge = async (): Promise<string | undefined> => {
    const terminal = terminalRef.current
    if (!terminal || !terminalReady) {
      throw new Error('Terminal not ready — use cash or check Stripe configuration.')
    }
    const amountCents = Math.round(total * 100)
    if (amountCents < 50) throw new Error('Amount too small')

    const piRes = await fetch('/api/stripe/payment-intent', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents }),
    })
    const piJson = await piRes.json().catch(() => ({}))
    if (!piRes.ok) throw new Error(piJson.error || 'PaymentIntent failed')
    const clientSecret = piJson.clientSecret as string

    const collected = await terminal.collectPaymentMethod(clientSecret)
    if ('error' in collected && collected.error) {
      throw new Error(collected.error.message ?? 'collectPaymentMethod failed')
    }
    if (!('paymentIntent' in collected)) throw new Error('No payment intent from reader')

    const processed = await terminal.processPayment(collected.paymentIntent)
    if ('error' in processed && processed.error) {
      throw new Error(processed.error.message ?? 'processPayment failed')
    }
    if (!('paymentIntent' in processed)) throw new Error('No payment result')

    const pi = processed.paymentIntent
    const ch = pi.latest_charge
    return typeof ch === 'string' ? ch : ch && typeof ch === 'object' && 'id' in ch ? String((ch as { id: string }).id) : undefined
  }

  const completeTransaction = async (paymentMethod: 'cash' | 'card') => {
    if (!barberId || cart.length === 0) {
      alert('Choose a barber and add at least one service.')
      return
    }
    if (!customerName.trim()) {
      alert('Enter customer name.')
      return
    }

    setSubmitting(true)
    try {
      let stripeChargeId: string | undefined
      if (paymentMethod === 'card') {
        stripeChargeId = await runCardCharge()
      }

      const body = {
        mode: selectedAppt ? ('appointment' as const) : ('walk_in' as const),
        appointmentId: selectedAppt?.id,
        customerName: customerName.trim(),
        barberId,
        items: cart,
        subtotal,
        tip: tipNum,
        total,
        paymentMethod,
        stripeChargeId,
        receiptEmail: receiptEmail.trim() || undefined,
      }

      const res = await fetch('/api/pos/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to complete sale')

      clearCart()
      await refresh()
      alert('Sale recorded.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const sendReceiptOnly = async () => {
    if (!receiptEmail.trim()) {
      alert('Enter receipt email.')
      return
    }
    if (cart.length === 0) {
      alert('Add items first.')
      return
    }
    try {
      const res = await fetch('/api/receipts/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: receiptEmail.trim(),
          customerName: customerName || 'Customer',
          items: cart.map((i) => ({ name: i.name, price: i.price })),
          subtotal,
          tip: tipNum,
          total,
          barber: barbers.find((b) => b.id === barberId)?.name ?? 'Staff',
          date: today,
          paymentMethod: 'pending',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Send failed')
      alert('Receipt sent.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-8 text-center text-headz-gray text-sm">
        Loading POS…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 text-sm">
        {loadError}
        <button type="button" className="ml-4 underline" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    )
  }

  const noStaffBarbers = services.length > 0 && barbers.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-headz-black">Point of sale</h1>
          <p className="text-sm text-headz-gray mt-0.5">
            Today ({today}) · {todayAppts.length} pending on calendar
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-headz-gray hover:text-headz-black"
          >
            ← Back
          </button>
        )}
      </div>

      {noStaffBarbers && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 text-sm">
          <strong>No barber accounts for checkout.</strong> The register only lists staff who have a linked barber
          profile and active login. An admin should open <strong>Dashboard → Settings → Barbers</strong> and invite
          barbers, or run <code className="text-xs bg-amber-100 px-1 rounded">npm run seed:all</code> in development
          (demo users + Dream Team + full pricelist).
        </div>
      )}

      {services.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 text-sm">
          <strong>No services in the database.</strong> An admin can add them under{' '}
          <strong>Dashboard → Settings → Services</strong>, or run{' '}
          <code className="text-xs bg-amber-100 px-1 rounded">npm run restore:services</code>.
        </div>
      )}

      {terminalWarning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 text-sm">
          <strong>Stripe Terminal:</strong> {terminalWarning} Cash payments still work.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-black/10 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-headz-black">Today&apos;s appointments</h2>
          <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
            {todayAppts.length === 0 ? (
              <li className="text-headz-gray">No pending appointments for today.</li>
            ) : (
              todayAppts.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => pickAppointment(a)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                      selectedAppt?.id === a.id
                        ? 'border-headz-red bg-red-50'
                        : 'border-black/10 hover:bg-headz-cream/50'
                    }`}
                  >
                    <span className="font-medium text-headz-black">{a.customerName}</span>
                    <span className="text-headz-gray"> · {a.timeSlot.slice(0, 5)}</span>
                    <div className="text-xs text-headz-gray mt-0.5">
                      {a.serviceName} · {a.barberName}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-headz-black">Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addService(s)}
                className="text-left rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-headz-cream/50"
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-headz-gray">
                  {s.displayPrice ?? `$${money(parsePrice(s.price))}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-headz-black">Checkout</h2>
          <label className="block text-xs font-medium text-headz-gray">Barber</label>
          <select
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm mb-2"
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-headz-gray">Customer name</label>
          <input
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm mb-2"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Walk-in name"
          />
          <div className="border border-black/10 rounded-lg divide-y divide-black/5 text-sm">
            {cart.length === 0 ? (
              <div className="p-3 text-headz-gray">Cart is empty.</div>
            ) : (
              cart.map((i, idx) => (
                <div key={`${i.serviceId}-${idx}`} className="p-2 flex justify-between gap-2">
                  <span>{i.name}</span>
                  <span className="tabular-nums">${money(parsePrice(i.price))}</span>
                </div>
              ))
            )}
            <div className="p-2 flex justify-between font-medium">
              <span>Subtotal</span>
              <span className="tabular-nums">${money(subtotal)}</span>
            </div>
          </div>
          <label className="block text-xs font-medium text-headz-gray mt-2">Tip ($)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm tabular-nums"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
          />
          <div className="flex justify-between text-lg font-bold pt-1">
            <span>Total</span>
            <span className="tabular-nums">${money(total)}</span>
          </div>
          <label className="block text-xs font-medium text-headz-gray">Receipt email (optional)</label>
          <input
            type="email"
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm mb-2"
            value={receiptEmail}
            onChange={(e) => setReceiptEmail(e.target.value)}
            placeholder="customer@email.com"
          />
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void completeTransaction('cash')}
              className="rounded-lg bg-headz-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cash · ${money(total)}
            </button>
            <button
              type="button"
              disabled={submitting || !terminalReady}
              onClick={() => void completeTransaction('card')}
              className="rounded-lg bg-headz-red text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              title={!terminalReady ? 'Connect Stripe Terminal first' : undefined}
            >
              Card · ${money(total)}
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void sendReceiptOnly()}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm"
            >
              Email receipt only
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
