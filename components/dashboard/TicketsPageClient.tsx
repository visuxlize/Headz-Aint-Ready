'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Banknote,
  CalendarDays,
  CreditCard,
  Loader2,
  Pencil,
  ReceiptText,
  Scissors,
  Search,
  Check,
  X,
} from 'lucide-react'
import type { BarberOption } from '@/lib/dashboard/barber-option'
import type { ServiceOption } from '@/lib/dashboard/service-option'
import { InlineErrorAlert } from '@/components/errors/InlineErrorAlert'
import { publicMessageForFailedResponse, publicMessageFromUnknown } from '@/lib/errors/public-message'
import { useAnimatedCounter } from '@/lib/hooks/useAnimatedCounter'
import { formatMoney } from '@/lib/utils/format-money'
import { cn } from '@/lib/utils/cn'
import { HeadzFormSelect } from '@/components/dashboard/HeadzFormSelect'
import { ConfirmModal } from '@/components/barber/ConfirmModal'

function TicketsPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse text-headz-black">
      <div className="h-8 w-48 rounded-lg bg-black/10" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-black/[0.06]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="h-96 rounded-2xl bg-black/[0.06]" />
        <div className="h-80 rounded-2xl bg-black/[0.06]" />
      </div>
    </div>
  )
}

type Ticket = {
  id: string
  customerName: string
  barberName: string
  barberId: string
  serviceId: string | null
  serviceName: string | null
  total: number
  tipAmount: number
  paymentMethod: string
  createdAt: string
  source: string
}

type BarberTotal = {
  barberId: string
  barberName: string
  cash: number
  card: number
  tickets: number
  total: number
}

type Totals = {
  cash: number
  card: number
  count: number
  byBarber: BarberTotal[]
}

type TicketsPayload = {
  tickets: Ticket[]
  totals: Totals
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return `${p[0]![0]}${p[1]![0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function parsePrice(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function serviceDropdownLabel(s: ServiceOption): string {
  const money = formatMoney(parsePrice(s.price))
  const o = s.priceDisplayOverride?.trim()
  return o ? `${s.name} — ${o} (${money})` : `${s.name} — ${money}`
}

export function TicketsPageClient({
  barbers,
  services,
}: {
  barbers: BarberOption[]
  services: ServiceOption[]
}) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [barberProfileId, setBarberProfileId] = useState<string>('')
  const [serviceId, setServiceId] = useState<string>('')
  const [tipStr, setTipStr] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null)
  const [customerName, setCustomerName] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [successFlash, setSuccessFlash] = useState(false)
  const [newTicketId, setNewTicketId] = useState<string | null>(null)
  const [pulseStat, setPulseStat] = useState<'cash' | 'card' | 'count' | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [voidTicketId, setVoidTicketId] = useState<string | null>(null)
  const [voidLoading, setVoidLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editBarberId, setEditBarberId] = useState('')
  const [editServiceId, setEditServiceId] = useState('')
  const [editTipStr, setEditTipStr] = useState('')
  const [editPayment, setEditPayment] = useState<'cash' | 'card'>('cash')
  const [editCustomer, setEditCustomer] = useState('')
  const [q, setQ] = useState('')
  /** Defer interactive markup until after mount so browser extensions don’t mutate SSR DOM before hydrate. */
  const [uiReady, setUiReady] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/tickets', { credentials: 'include' })
      let j: { error?: string } & Partial<TicketsPayload>
      try {
        j = (await res.json()) as { error?: string } & Partial<TicketsPayload>
      } catch {
        setErr(publicMessageFromUnknown(new TypeError('json')))
        return
      }
      if (!res.ok) {
        setErr(publicMessageForFailedResponse(res))
        return
      }
      setTickets(j.tickets ?? [])
      setTotals(j.totals ?? null)
      setLastUpdated(new Date())
      setErr(null)
    } catch (e) {
      setErr(publicMessageFromUnknown(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setUiReady(true)
  }, [])

  useEffect(() => {
    if (!uiReady) return
    void load()
  }, [load, uiReady])

  useEffect(() => {
    if (!uiReady) return
    const id = window.setInterval(() => void load(), 30_000)
    return () => clearInterval(id)
  }, [load, uiReady])

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  )
  const barberSelectOptions = useMemo(
    () => barbers.map((b) => ({ value: b.id, label: b.name, avatarUrl: b.avatarUrl })),
    [barbers]
  )
  const serviceSelectOptions = useMemo(
    () => services.map((s) => ({ value: s.id, label: serviceDropdownLabel(s) })),
    [services]
  )
  const amount = selectedService ? parsePrice(selectedService.price) : 0
  const tip = Number.parseFloat(tipStr) || 0

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return tickets
    return tickets.filter(
      (t) =>
        t.customerName.toLowerCase().includes(s) ||
        t.barberName.toLowerCase().includes(s) ||
        (t.serviceName?.toLowerCase().includes(s) ?? false)
    )
  }, [tickets, q])

  const cashAnim = useAnimatedCounter(totals?.cash ?? 0, 600)
  const cardAnim = useAnimatedCounter(totals?.card ?? 0, 600)
  const countAnim = useAnimatedCounter(totals?.count ?? 0, 600)

  const eodCash = useAnimatedCounter(totals?.cash ?? 0, 600)
  const eodCard = useAnimatedCounter(totals?.card ?? 0, 600)
  const eodGrand = useAnimatedCounter((totals?.cash ?? 0) + (totals?.card ?? 0), 600)

  const cashPct =
    totals && totals.cash + totals.card > 0
      ? (100 * totals.cash) / (totals.cash + totals.card)
      : 50
  const cardPct = 100 - cashPct

  const submit = async () => {
    if (!barberProfileId || !serviceId || amount <= 0 || !paymentMethod) return
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/dashboard/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberProfileId,
          serviceId,
          customerName: customerName.trim() || undefined,
          paymentMethod,
          tipAmount: tip > 0 ? tip : undefined,
        }),
      })
      const j = (await res.json()) as {
        error?: string
        ticket?: Ticket
        totals?: Totals
      }
      if (!res.ok) {
        setErr(publicMessageForFailedResponse(res))
        return
      }
      if (j.totals) setTotals(j.totals)
      if (j.ticket) {
        setTickets((prev) => [j.ticket!, ...prev.filter((x) => x.id !== j.ticket!.id)])
        setNewTicketId(j.ticket.id)
        window.setTimeout(() => setNewTicketId(null), 2000)
      } else {
        void load()
      }
      setPulseStat(paymentMethod === 'cash' ? 'cash' : paymentMethod === 'card' ? 'card' : 'count')
      window.setTimeout(() => setPulseStat(null), 2000)
      setSuccessFlash(true)
      window.setTimeout(() => setSuccessFlash(false), 1500)
      setBarberProfileId('')
      setServiceId('')
      setTipStr('')
      setTipOpen(false)
      setCustomerName('')
    } catch (e) {
      setErr(publicMessageFromUnknown(e))
    } finally {
      setSubmitting(false)
    }
  }

  const executeVoidTicket = async () => {
    const id = voidTicketId
    if (!id) return
    setVoidLoading(true)
    setRemovingId(id)
    try {
      const res = await fetch(`/api/dashboard/tickets/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        setErr(publicMessageForFailedResponse(res))
        return
      }
      await res.json().catch(() => null)
      setEditingId((eid) => (eid === id ? null : eid))
      setTickets((prev) => prev.filter((t) => t.id !== id))
      setVoidTicketId(null)
      void load()
    } catch (e) {
      setErr(publicMessageFromUnknown(e))
    } finally {
      setRemovingId(null)
      setVoidLoading(false)
    }
  }

  const openEdit = (t: Ticket) => {
    setErr(null)
    setEditingId(t.id)
    setEditBarberId(t.barberId)
    setEditServiceId(t.serviceId ?? '')
    setEditTipStr(t.tipAmount > 0 ? String(t.tipAmount) : '')
    setEditPayment(t.paymentMethod === 'card' ? 'card' : 'cash')
    setEditCustomer(t.customerName)
  }

  const saveEdit = async () => {
    if (!editingId || !editBarberId || !editServiceId) return
    const editSvc = services.find((s) => s.id === editServiceId)
    const amt = editSvc ? parsePrice(editSvc.price) : 0
    if (amt <= 0) return
    const tip = Number.parseFloat(editTipStr) || 0
    if (tip < 0) return
    setEditSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/api/dashboard/tickets/${editingId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberProfileId: editBarberId,
          serviceId: editServiceId,
          paymentMethod: editPayment,
          tipAmount: tip,
          customerName: editCustomer.trim() || undefined,
        }),
      })
      if (!res.ok) {
        setErr(publicMessageForFailedResponse(res))
        return
      }
      await res.json().catch(() => null)
      setEditingId(null)
      await load()
    } catch (e) {
      setErr(publicMessageFromUnknown(e))
    } finally {
      setEditSaving(false)
    }
  }

  const byBarberSorted = useMemo(
    () => [...(totals?.byBarber ?? [])].sort((a, b) => b.total - a.total),
    [totals]
  )

  const formDisabled = services.length === 0

  if (!uiReady) {
    return <TicketsPageSkeleton />
  }

  return (
    <div className="space-y-8 text-headz-black">
      <div>
        <h1 className="font-serif text-2xl font-bold md:text-3xl">Tickets</h1>
        <p className="mt-1 text-sm text-headz-gray">Record walk-in sales for the daily report.</p>
      </div>

      {err ? <InlineErrorAlert message={err} onDismiss={() => setErr(null)} /> : null}

      {/* ZONE A — stats aligned with Headz cream / brand */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-headz-red/10 bg-gradient-to-b from-headz-cream/80 to-[#FAFAF8]/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            className={cn(
              'rounded-2xl border border-teal-200/70 bg-gradient-to-br from-white to-teal-50/35 p-5 shadow-sm transition-all',
              pulseStat === 'cash' && 'ring-2 ring-teal-300/60 ring-offset-2 ring-offset-headz-cream'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700/75">Cash today</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums text-teal-800">{formatMoney(cashAnim)}</p>
              </div>
              <span className="rounded-xl bg-teal-100/90 p-2.5 text-teal-800">
                <Banknote className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-teal-900/10">
              <div className="h-full w-[72%] rounded-full bg-teal-400/90 transition-all" />
            </div>
          </div>
          <div
            className={cn(
              'rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white to-sky-50/40 p-5 shadow-sm transition-all',
              pulseStat === 'card' && 'ring-2 ring-sky-300/60 ring-offset-2 ring-offset-headz-cream'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700/75">Card today</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums text-sky-800">{formatMoney(cardAnim)}</p>
              </div>
              <span className="rounded-xl bg-sky-100/90 p-2.5 text-sky-800">
                <CreditCard className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-sky-900/10">
              <div className="h-full w-[72%] rounded-full bg-sky-400/90 transition-all" />
            </div>
          </div>
          <div
            className={cn(
              'rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/35 p-5 shadow-sm transition-all',
              pulseStat === 'count' && 'ring-2 ring-rose-300/55 ring-offset-2 ring-offset-headz-cream'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700/80">Tickets today</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums text-rose-800">{Math.round(countAnim)}</p>
              </div>
              <span className="rounded-xl bg-rose-100/90 p-2.5 text-rose-800">
                <ReceiptText className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-rose-900/10">
              <div className="h-full w-[72%] rounded-full bg-rose-400/85 transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* Shop day + search — directly under KPIs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-headz-red/15 bg-gradient-to-r from-white to-headz-cream/40 px-4 py-3 shadow-sm shadow-black/[0.03]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-headz-red/10 text-headz-red">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-headz-gray">Shop day</p>
            <p className="truncate font-serif text-base font-bold text-headz-black sm:text-lg">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-rose-200/90 px-3 py-1.5 font-mono text-sm font-black tabular-nums text-rose-950 shadow-sm">
            {tickets.length}
          </span>
        </div>
        <div className="relative w-full sm:max-w-md lg:max-w-lg">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
            <Search className="h-4 w-4 shrink-0 text-headz-gray" aria-hidden />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search barber or customer…"
            className="w-full rounded-2xl border-2 border-black/[0.08] bg-white py-3 pl-11 pr-4 text-sm shadow-inner shadow-black/[0.02] transition-colors focus:border-headz-red/40 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
          />
        </div>
      </div>

      {/* Left: add ticket · Right: list + end of day */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-10">
        <div className="lg:sticky lg:top-24">
          <h2 className="mb-3 font-serif text-xl font-bold text-headz-black">Add ticket</h2>
          <div className="space-y-5 rounded-2xl border-2 border-headz-red/20 bg-gradient-to-b from-white via-white to-headz-cream/35 p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] ring-1 ring-headz-red/10">
            {formDisabled ? (
              <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                No active services in the catalog. Add services in the database or admin tools, then refresh this page.
              </p>
            ) : null}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Barber</label>
              <div className="mt-2">
                <HeadzFormSelect
                  variant="barber"
                  value={barberProfileId}
                  onChange={setBarberProfileId}
                  options={barberSelectOptions}
                  placeholder="Select barber…"
                  disabled={formDisabled}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Service</label>
              <div className="mt-2">
                <HeadzFormSelect
                  value={serviceId}
                  onChange={setServiceId}
                  options={serviceSelectOptions}
                  placeholder="Choose a service…"
                  disabled={formDisabled}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Service total</label>
              <div
                className={cn(
                  'mt-2 flex items-baseline justify-between rounded-xl border-2 border-dashed border-headz-red/25 bg-headz-black/[0.03] px-4 py-3',
                  selectedService && 'border-headz-red/35 bg-headz-red/[0.04]'
                )}
              >
                <span className="text-xs text-headz-gray">Subtotal (from catalog)</span>
                <span className="font-mono text-xl font-bold tabular-nums text-headz-black">
                  {selectedService ? formatMoney(amount) : '—'}
                </span>
              </div>
              {tip > 0 ? (
                <p className="mt-2 text-xs text-headz-gray">
                  With tip: <span className="font-semibold text-headz-black">{formatMoney(amount + tip)}</span>
                </p>
              ) : null}
            </div>

            <div>
              {!tipOpen ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-headz-red transition hover:underline"
                  onClick={() => setTipOpen(true)}
                >
                  + Add tip
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-headz-black">Tip amount</p>
                  <div className="relative max-w-[160px]">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-headz-gray">
                      $
                    </span>
                    <input
                      value={tipStr}
                      onChange={(e) => setTipStr(e.target.value)}
                      inputMode="decimal"
                      className="w-full rounded-xl border-2 border-black/[0.08] bg-white py-2.5 pl-8 pr-3 text-sm transition-colors focus:border-headz-red/40 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
                    />
                  </div>
                  {tip > 0 ? (
                    <span className="inline-block rounded-full bg-headz-red/10 px-2.5 py-1 text-xs font-medium text-headz-red">
                      Tip {formatMoney(tip)}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Payment</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold uppercase tracking-wide transition-all',
                    paymentMethod === 'cash'
                      ? 'bg-teal-600/90 text-white shadow-lg shadow-teal-900/15 ring-2 ring-teal-300/70 ring-offset-2'
                      : 'border-2 border-black/10 bg-white text-headz-gray hover:border-teal-400/40 hover:bg-teal-50/60'
                  )}
                >
                  <Banknote className="h-5 w-5 shrink-0" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold uppercase tracking-wide transition-all',
                    paymentMethod === 'card'
                      ? 'bg-sky-600/90 text-white shadow-lg shadow-sky-900/15 ring-2 ring-sky-300/70 ring-offset-2'
                      : 'border-2 border-black/10 bg-white text-headz-gray hover:border-sky-400/40 hover:bg-sky-50/60'
                  )}
                >
                  <CreditCard className="h-5 w-5 shrink-0" />
                  Card
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Customer (optional)</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in"
                disabled={formDisabled}
                className="mt-2 w-full rounded-xl border-2 border-black/[0.08] bg-white px-4 py-3 text-sm transition-colors focus:border-headz-red/40 focus:outline-none focus:ring-4 focus:ring-headz-red/10 disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              disabled={submitting || formDisabled || !barberProfileId || !serviceId || amount <= 0 || !paymentMethod}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-headz-red py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-headz-red/25 transition-all hover:bg-headz-redDark disabled:opacity-45"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Adding…
                </>
              ) : successFlash ? (
                <>
                  <Check className="h-5 w-5 text-white" />
                  Saved
                </>
              ) : (
                'Add ticket'
              )}
            </button>
            <p className="text-center text-xs text-headz-gray/90">Tickets are recorded to the daily report.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3">
              <h2 className="font-serif text-xl font-bold text-headz-black">Today&apos;s tickets</h2>
              {lastUpdated ? (
                <span className="text-xs text-headz-gray/80">
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              ) : null}
            </div>

          {loading && !tickets.length ? (
            <div className="py-12 text-center text-headz-gray">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-headz-red/10 bg-gradient-to-b from-white to-headz-cream/20 py-16 text-center shadow-sm">
              <Scissors className="mb-3 text-4xl text-headz-red/25" aria-hidden />
              <p className="text-sm text-headz-gray">No tickets yet today. Add the first one.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => {
                const isNew = t.id === newTicketId
                return (
                  <li
                    key={t.id}
                    className={cn(
                      'rounded-xl border border-black/[0.07] bg-white p-3 shadow-sm transition-all',
                      removingId === t.id && 'opacity-40',
                      isNew && 'border-headz-red/30 shadow-md'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-headz-red/10 text-xs font-bold text-headz-red">
                        {initials(t.customerName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-headz-black">{t.customerName}</p>
                            <p className="text-xs text-headz-gray">{t.barberName}</p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                              t.paymentMethod === 'cash'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-sky-100 text-sky-800'
                            )}
                          >
                            {t.paymentMethod === 'cash' ? 'CASH' : 'CARD'}
                          </span>
                        </div>
                        {t.serviceName ? (
                          <p className="mt-1 text-xs text-headz-gray">{t.serviceName}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-bold tabular-nums text-headz-black">{formatMoney(t.total)}</span>
                            {t.tipAmount > 0 ? (
                              <span className="ml-2 text-xs text-headz-gray">+ {formatMoney(t.tipAmount)} tip</span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-headz-gray">
                              {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                            </span>
                            {t.source === 'manual' ? (
                              <button
                                type="button"
                                aria-label="Edit ticket"
                                disabled={removingId === t.id || editSaving}
                                onClick={() => (editingId === t.id ? setEditingId(null) : openEdit(t))}
                                className={cn(
                                  'rounded p-1 text-headz-gray/50 transition hover:bg-headz-red/10 hover:text-headz-red disabled:opacity-50',
                                  editingId === t.id && 'bg-headz-red/10 text-headz-red'
                                )}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              aria-label="Void ticket"
                              disabled={removingId === t.id}
                              onClick={() => setVoidTicketId(t.id)}
                              className="rounded p-1 text-headz-gray/40 transition hover:bg-red-50 hover:text-headz-red disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {editingId === t.id ? (
                          <div className="mt-4 space-y-3 rounded-xl border border-headz-red/20 bg-headz-cream/40 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Edit ticket</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-headz-gray">Barber</label>
                                <div className="mt-1">
                                  <HeadzFormSelect
                                    variant="barber"
                                    size="sm"
                                    value={editBarberId}
                                    onChange={setEditBarberId}
                                    options={barberSelectOptions}
                                    placeholder="Select barber…"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-headz-gray">Service</label>
                                <div className="mt-1">
                                  <HeadzFormSelect
                                    size="sm"
                                    value={editServiceId}
                                    onChange={setEditServiceId}
                                    options={serviceSelectOptions}
                                    placeholder="Select…"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-headz-gray">Tip ($)</label>
                                <input
                                  value={editTipStr}
                                  onChange={(e) => setEditTipStr(e.target.value)}
                                  inputMode="decimal"
                                  className="mt-1 w-full rounded-lg border-2 border-black/[0.08] bg-white px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-headz-gray">Customer</label>
                                <input
                                  value={editCustomer}
                                  onChange={(e) => setEditCustomer(e.target.value)}
                                  className="mt-1 w-full rounded-lg border-2 border-black/[0.08] bg-white px-3 py-2 text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-headz-gray">Payment</p>
                              <div className="mt-1 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditPayment('cash')}
                                  className={cn(
                                    'rounded-lg py-2 text-xs font-bold uppercase',
                                    editPayment === 'cash'
                                      ? 'bg-teal-600/90 text-white'
                                      : 'border border-black/10 bg-white text-headz-gray'
                                  )}
                                >
                                  Cash
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditPayment('card')}
                                  className={cn(
                                    'rounded-lg py-2 text-xs font-bold uppercase',
                                    editPayment === 'card'
                                      ? 'bg-sky-600/90 text-white'
                                      : 'border border-black/10 bg-white text-headz-gray'
                                  )}
                                >
                                  Card
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={editSaving || !editBarberId || !editServiceId}
                                onClick={() => void saveEdit()}
                                className="rounded-lg bg-headz-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
                              >
                                {editSaving ? 'Saving…' : 'Save changes'}
                              </button>
                              <button
                                type="button"
                                disabled={editSaving}
                                onClick={() => setEditingId(null)}
                                className="rounded-lg border border-black/15 px-4 py-2 text-sm text-headz-gray"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          </div>

          {/* End of day — right column under list */}
          <div className="rounded-2xl border-2 border-black/[0.06] bg-gradient-to-br from-white to-headz-cream/30 p-1 shadow-lg shadow-black/[0.06]">
            <div className="rounded-[14px] border border-white/80 bg-white/90 p-5 backdrop-blur-sm">
              <h2 className="font-serif text-lg font-bold text-headz-black">
                End of day summary
                <span className="ml-2 text-sm font-normal text-headz-gray">· {format(new Date(), 'MMM d, yyyy')}</span>
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/70 to-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700/80">Total cash</p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-teal-800 sm:text-3xl">{formatMoney(eodCash)}</p>
                </div>
                <div className="rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/70 to-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700/80">Total card</p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-sky-800 sm:text-3xl">{formatMoney(eodCard)}</p>
                </div>
                <div className="rounded-xl border border-rose-200/70 bg-gradient-to-br from-rose-50/60 to-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800/80">Grand total</p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-rose-900 sm:text-3xl">{formatMoney(eodGrand)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-black/[0.03] px-4 py-3">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/5">
                  <div className="h-full bg-teal-400/90 transition-all duration-700" style={{ width: `${cashPct}%` }} />
                  <div className="h-full bg-sky-400/90 transition-all duration-700" style={{ width: `${cardPct}%` }} />
                </div>
                <p className="mt-2 text-center text-[11px] text-headz-gray">
                  Cash {formatMoney(totals?.cash ?? 0)} · Card {formatMoney(totals?.card ?? 0)} · {cashPct.toFixed(0)}% /{' '}
                  {cardPct.toFixed(0)}%
                </p>
              </div>

              <div className="mt-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-headz-gray">By barber</h3>
                <div className="overflow-x-auto rounded-xl border border-black/5">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-black/5 bg-headz-cream/40 text-left text-[10px] font-bold uppercase tracking-wider text-headz-gray">
                        <th className="px-3 py-2">Barber</th>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Cash</th>
                        <th className="px-3 py-2">Card</th>
                        <th className="px-3 py-2">Tips</th>
                        <th className="px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byBarberSorted.map((r) => {
                        const tipRow = tickets
                          .filter((t) => t.barberId === r.barberId)
                          .reduce((s, t) => s + t.tipAmount, 0)
                        return (
                          <tr key={r.barberId} className="border-b border-black/[0.04] last:border-0">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-headz-red/10 text-[10px] font-bold text-headz-red">
                                  {initials(r.barberName)}
                                </span>
                                <span className="font-medium">{r.barberName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="rounded-md bg-headz-black/[0.06] px-1.5 font-mono text-xs font-bold">{r.tickets}</span>
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-teal-800">{formatMoney(r.cash)}</td>
                            <td className="px-3 py-2.5 font-semibold text-sky-800">{formatMoney(r.card)}</td>
                            <td className="px-3 py-2.5 text-headz-gray">{formatMoney(tipRow)}</td>
                            <td className="px-3 py-2.5 font-bold text-headz-black">{formatMoney(r.total)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-headz-black/[0.03] font-bold">
                        <td className="px-3 py-2.5">Totals</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-md bg-headz-black/10 px-1.5 font-mono text-xs">{totals?.count ?? 0}</span>
                        </td>
                        <td className="px-3 py-2.5 text-teal-800">{formatMoney(totals?.cash ?? 0)}</td>
                        <td className="px-3 py-2.5 text-sky-800">{formatMoney(totals?.card ?? 0)}</td>
                        <td className="px-3 py-2.5 text-headz-gray">
                          {formatMoney(tickets.reduce((s, t) => s + t.tipAmount, 0))}
                        </td>
                        <td className="px-3 py-2.5">{formatMoney((totals?.cash ?? 0) + (totals?.card ?? 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-headz-gray transition hover:bg-black/[0.04]"
                  >
                    Print summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={voidTicketId !== null}
        title="Void this ticket?"
        message="This removes the sale from today’s cash and card totals. You can’t undo this from the dashboard."
        confirmLabel="Void ticket"
        danger
        loading={voidLoading}
        onClose={() => {
          if (!voidLoading) setVoidTicketId(null)
        }}
        onConfirm={executeVoidTicket}
        overlayClassName="backdrop-blur-[2px]"
        panelClassName="w-full max-w-md rounded-2xl border border-headz-red/20 bg-gradient-to-b from-white to-headz-cream/50 p-6 shadow-2xl shadow-black/20"
      />
    </div>
  )
}
