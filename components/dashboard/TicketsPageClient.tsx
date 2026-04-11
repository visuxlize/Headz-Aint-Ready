'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Banknote,
  CreditCard,
  Loader2,
  Scissors,
  Search,
  Check,
  X,
} from 'lucide-react'
import type { BarberOption } from '@/lib/dashboard/barber-option'
import { useAnimatedCounter } from '@/lib/hooks/useAnimatedCounter'
import { formatMoney } from '@/lib/utils/format-money'
import { cn } from '@/lib/utils/cn'

type Ticket = {
  id: string
  customerName: string
  barberName: string
  barberId: string
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

export function TicketsPageClient({ barbers }: { barbers: BarberOption[] }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [barberId, setBarberId] = useState<string>('')
  const [serviceLabel, setServiceLabel] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [tipStr, setTipStr] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null)
  const [customerName, setCustomerName] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [successFlash, setSuccessFlash] = useState(false)
  const [newTicketId, setNewTicketId] = useState<string | null>(null)
  const [pulseStat, setPulseStat] = useState<'cash' | 'card' | 'count' | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/tickets', { credentials: 'include' })
      const j = (await res.json()) as { error?: string } & Partial<TicketsPayload>
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setTickets(j.tickets ?? [])
      setTotals(j.totals ?? null)
      setLastUpdated(new Date())
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(), 30_000)
    return () => clearInterval(id)
  }, [load])

  const amount = Number.parseFloat(amountStr) || 0
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
    if (!barberId || amount <= 0 || !paymentMethod) return
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/dashboard/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          customerName: customerName.trim() || undefined,
          paymentMethod,
          amount,
          tipAmount: tip > 0 ? tip : undefined,
          serviceLabel: serviceLabel.trim() || undefined,
        }),
      })
      const j = (await res.json()) as {
        error?: string
        ticket?: Ticket
        totals?: Totals
      }
      if (!res.ok) throw new Error(j.error || 'Failed')
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
      setServiceLabel('')
      setAmountStr('')
      setTipStr('')
      setTipOpen(false)
      setCustomerName('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const voidTicket = async (id: string) => {
    if (!window.confirm('Void this ticket?')) return
    setRemovingId(id)
    try {
      const res = await fetch(`/api/dashboard/tickets/${id}`, { method: 'DELETE', credentials: 'include' })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'Void failed')
      setTickets((prev) => prev.filter((t) => t.id !== id))
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Void failed')
    } finally {
      setRemovingId(null)
    }
  }

  const byBarberSorted = useMemo(
    () => [...(totals?.byBarber ?? [])].sort((a, b) => b.total - a.total),
    [totals]
  )

  return (
    <div className="space-y-8 text-headz-black">
      <div>
        <h1 className="font-serif text-2xl font-bold md:text-3xl">Tickets</h1>
        <p className="mt-1 text-sm text-headz-gray">Record walk-in sales for the daily report.</p>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900">
          {err}
        </div>
      )}

      {/* ZONE A */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-black/[0.06] bg-[#FAFAF8]/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className={cn(
              'rounded-2xl border border-emerald-500/20 bg-emerald-950/60 p-4 text-emerald-400 shadow-sm',
              pulseStat === 'cash' && 'animate-pulse-glow'
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200/90">Cash today</p>
            <p
              key={Math.round(cashAnim * 100)}
              className="animate-count-up mt-1 font-mono text-2xl font-black tabular-nums"
            >
              {formatMoney(cashAnim)}
            </p>
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-emerald-900/40">
              <div className="h-full w-[70%] rounded-full bg-emerald-400/80" />
            </div>
          </div>
          <div
            className={cn(
              'rounded-2xl border border-blue-400/20 bg-blue-950/60 p-4 text-blue-300 shadow-sm',
              pulseStat === 'card' && 'animate-pulse-glow'
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200/90">Card today</p>
            <p
              key={Math.round(cardAnim * 100)}
              className="animate-count-up mt-1 font-mono text-2xl font-black tabular-nums"
            >
              {formatMoney(cardAnim)}
            </p>
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-blue-900/40">
              <div className="h-full w-[70%] rounded-full bg-blue-400/80" />
            </div>
          </div>
          <div
            className={cn(
              'rounded-2xl border border-headz-red/20 bg-headz-red/10 p-4 text-headz-red shadow-sm',
              pulseStat === 'count' && 'animate-pulse-glow'
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-headz-red/90">Tickets today</p>
            <p key={Math.round(countAnim)} className="animate-count-up mt-1 font-mono text-2xl font-black tabular-nums">
              {Math.round(countAnim)}
            </p>
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-headz-red/20">
              <div className="h-full w-[70%] rounded-full bg-headz-red/70" />
            </div>
          </div>
        </div>
      </div>

      {/* ZONE B */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <div>
          <h2 className="mb-3 text-lg font-bold text-headz-black">Add Ticket</h2>
          <div className="space-y-5 rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-headz-gray">Who&apos;s cutting?</p>
              <div className="flex flex-wrap gap-2">
                {barbers.map((b) => {
                  const sel = barberId === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBarberId(b.id)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition',
                        sel
                          ? 'animate-pulse-glow border-headz-red bg-headz-red font-semibold text-white'
                          : 'border-black/10 text-headz-gray hover:border-headz-red/40'
                      )}
                    >
                      {b.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-headz-red/10 text-[10px] font-bold text-headz-red">
                          {initials(b.name).slice(0, 2)}
                        </span>
                      )}
                      {b.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-headz-black">Service &amp; Amount</p>
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <input
                  value={serviceLabel}
                  onChange={(e) => setServiceLabel(e.target.value)}
                  placeholder="e.g. Fade, Shape Up…"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm"
                />
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-headz-gray">$</span>
                  <input
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full rounded-xl border border-black/10 py-2 pl-6 pr-2 text-right font-mono text-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              {!tipOpen ? (
                <button type="button" className="text-sm font-medium text-headz-red hover:underline" onClick={() => setTipOpen(true)}>
                  ＋ Add Tip
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-headz-gray">Tip amount</p>
                  <div className="relative max-w-[140px]">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-headz-gray">$</span>
                    <input
                      value={tipStr}
                      onChange={(e) => setTipStr(e.target.value)}
                      inputMode="decimal"
                      className="w-full rounded-lg border border-black/10 py-2 pl-6 pr-2 text-sm"
                    />
                  </div>
                  {tip > 0 ? (
                    <span className="inline-block rounded-full bg-headz-black/5 px-2 py-0.5 text-xs text-headz-gray">
                      Tip: {formatMoney(tip)}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-headz-gray">Payment</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl py-4 font-bold transition',
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-black/10 text-headz-gray hover:border-black/20'
                  )}
                >
                  <Banknote className="h-5 w-5" />
                  CASH
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl py-4 font-bold transition',
                    paymentMethod === 'card'
                      ? 'bg-blue-600 text-white'
                      : 'border-2 border-black/10 text-headz-gray hover:border-black/20'
                  )}
                >
                  <CreditCard className="h-5 w-5" />
                  CARD
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-headz-gray">Customer name (optional)</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              disabled={submitting || !barberId || amount <= 0 || !paymentMethod}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-headz-red py-4 text-sm font-bold uppercase tracking-widest text-white shadow-md shadow-headz-red/20 transition-all hover:bg-headz-redDark disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Adding…
                </>
              ) : successFlash ? (
                <>
                  <Check className="h-5 w-5 text-emerald-200" />
                  Saved
                </>
              ) : (
                'Add Ticket'
              )}
            </button>
            <p className="text-center text-xs text-headz-gray">Tickets are recorded to the daily report.</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-headz-black">
              Today — {format(new Date(), 'EEEE MMMM d')}
              <span className="ml-2 inline-flex items-center rounded-full bg-headz-red/10 px-2 py-0.5 text-xs font-semibold text-headz-red">
                {tickets.length}
              </span>
            </h2>
            {lastUpdated ? (
              <span className="text-xs text-headz-gray/80">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
            ) : null}
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-headz-gray" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search barber or customer…"
              className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>

          {loading && !tickets.length ? (
            <div className="py-12 text-center text-headz-gray">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.08] bg-white py-16 text-center shadow-sm">
              <Scissors className="mb-3 text-4xl text-headz-red/20" aria-hidden />
              <p className="text-sm text-headz-gray">No tickets yet today. Add the first one.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((t, i) => {
                const delay = Math.min(i * 40, 300)
                const isNew = t.id === newTicketId
                return (
                  <li
                    key={t.id}
                    style={{ animationDelay: `${delay}ms` }}
                    className={cn(
                      'rounded-xl border border-black/[0.08] bg-white p-3 shadow-sm',
                      'animate-fade-slide',
                      isNew && 'animate-slide-right',
                      removingId === t.id && 'opacity-40'
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
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-headz-gray">
                              {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                            </span>
                            <button
                              type="button"
                              aria-label="Void ticket"
                              disabled={removingId === t.id}
                              onClick={() => void voidTicket(t.id)}
                              className="text-headz-gray/40 transition hover:text-headz-red disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ZONE C */}
      <div>
        <h2 className="mb-2 text-xl font-bold text-headz-black">
          End of Day Summary <span className="text-base font-normal text-headz-gray">· {format(new Date(), 'MMM d, yyyy')}</span>
        </h2>
        <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <div className="grid grid-cols-1 divide-y divide-black/5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-5 py-6">
              <p className="text-xs uppercase tracking-wider text-headz-gray">Total cash</p>
              <p className="mt-1 font-mono text-4xl font-black text-emerald-600 tabular-nums">
                {formatMoney(eodCash)}
              </p>
            </div>
            <div className="px-5 py-6">
              <p className="text-xs uppercase tracking-wider text-headz-gray">Total card</p>
              <p className="mt-1 font-mono text-4xl font-black text-blue-600 tabular-nums">{formatMoney(eodCard)}</p>
            </div>
            <div className="px-5 py-6">
              <p className="text-xs uppercase tracking-wider text-headz-gray">Grand total</p>
              <p className="mt-1 font-mono text-4xl font-black text-headz-red tabular-nums">{formatMoney(eodGrand)}</p>
            </div>
          </div>
          <div className="border-t border-black/5 px-5 py-4">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/5 transition-all duration-700">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${cashPct}%` }}
              />
              <div
                className="h-full bg-blue-500 transition-all duration-700"
                style={{ width: `${cardPct}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-headz-gray">
              Cash: {formatMoney(totals?.cash ?? 0)} · Card: {formatMoney(totals?.card ?? 0)} · {cashPct.toFixed(0)}% /{' '}
              {cardPct.toFixed(0)}%
            </p>
          </div>

          <div className="border-t border-black/5 p-5">
            <h3 className="mb-3 text-sm font-semibold text-headz-black">Breakdown by Barber</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-headz-gray">
                    <th className="pb-2 pr-4">Barber</th>
                    <th className="pb-2 pr-4">Tickets</th>
                    <th className="pb-2 pr-4">Cash</th>
                    <th className="pb-2 pr-4">Card</th>
                    <th className="pb-2 pr-4">Tips</th>
                    <th className="pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byBarberSorted.map((r, i) => {
                    const tipRow = tickets
                      .filter((t) => t.barberId === r.barberId)
                      .reduce((s, t) => s + t.tipAmount, 0)
                    return (
                      <tr
                        key={r.barberId}
                        style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
                        className="animate-fade-slide border-b border-black/5"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-headz-red/10 text-xs font-bold text-headz-red">
                              {initials(r.barberName)}
                            </span>
                            <span className="font-medium">{r.barberName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-headz-black/5 px-2 text-xs">{r.tickets}</span>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-emerald-600">{formatMoney(r.cash)}</td>
                        <td className="py-3 pr-4 font-semibold text-blue-600">{formatMoney(r.card)}</td>
                        <td className="py-3 pr-4 text-headz-gray">{formatMoney(tipRow)}</td>
                        <td className="py-3 font-bold text-headz-black">{formatMoney(r.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-headz-black/[0.02] font-bold">
                    <td className="py-3 pr-4">Totals</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-headz-black/5 px-2 text-xs">{totals?.count ?? 0}</span>
                    </td>
                    <td className="py-3 pr-4 text-emerald-600">{formatMoney(totals?.cash ?? 0)}</td>
                    <td className="py-3 pr-4 text-blue-600">{formatMoney(totals?.card ?? 0)}</td>
                    <td className="py-3 pr-4 text-headz-gray">
                      {formatMoney(tickets.reduce((s, t) => s + t.tipAmount, 0))}
                    </td>
                    <td className="py-3">{formatMoney((totals?.cash ?? 0) + (totals?.card ?? 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-black/10 px-4 py-2 text-sm text-headz-gray hover:bg-black/[0.03]"
              >
                Print Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
