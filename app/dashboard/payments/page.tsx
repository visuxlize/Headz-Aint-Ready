'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Banknote, ChevronLeft, CreditCard, ExternalLink, Printer, ReceiptText, RefreshCw, Search } from 'lucide-react'
import { ConfirmModal } from '@/components/barber/ConfirmModal'
import { format } from 'date-fns'
import { formatMoney } from '@/lib/utils/format-money'
import { cn } from '@/lib/utils/cn'
import { SQUIRE } from '@/lib/squire-config'

type Txn = {
  id: string
  customerName: string
  barberName: string | null
  paymentMethod: string
  paymentStatus: string
  total: string
  subtotal: string
  tipAmount: string
  squarePaymentId: string | null
  cardBrand: string | null
  cardLastFour: string | null
  refundedAt: string | null
  createdAt: string
  source: string
  items: Array<{ name?: string; serviceId?: string; price?: string }> | null
}

type PaymentsPayload = {
  summary: {
    today: { card: number; cash: number }
    week: { card: number; cash: number }
    month: { card: number; cash: number }
    pending: number
  }
  barbers: { id: string; name: string | null }[]
  transactions: Txn[]
}

export default function PaymentsPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<PaymentsPayload | null>(null)
  const [method, setMethod] = useState<'all' | 'card' | 'cash'>('all')
  const [barberId, setBarberId] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)
  const [tab, setTab] = useState<'all' | 'manual'>('all')
  const [refundTxn, setRefundTxn] = useState<Txn | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [voidTxn, setVoidTxn] = useState<Txn | null>(null)
  const [voidLoading, setVoidLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const u = new URL('/api/dashboard/payments', window.location.origin)
      if (method !== 'all') u.searchParams.set('method', method)
      if (barberId) u.searchParams.set('barberId', barberId)
      if (q.trim()) u.searchParams.set('q', q.trim())
      if (from) u.searchParams.set('from', from)
      if (to) u.searchParams.set('to', to)
      if (tab === 'manual') u.searchParams.set('source', 'manual')
      const res = await fetch(u.toString(), { credentials: 'include' })
      const j = (await res.json().catch(() => ({}))) as { error?: string } & Partial<PaymentsPayload>
      if (!res.ok) {
        const msg =
          j.error ||
          (res.status === 403
            ? 'You need admin access to view payments.'
            : res.status === 401
              ? 'Sign in again to continue.'
              : `Could not load (${res.status})`)
        throw new Error(msg)
      }
      setData(j as PaymentsPayload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [method, barberId, q, from, to, tab])

  useEffect(() => {
    void load()
  }, [load])

  const monthBar = useMemo(() => {
    if (!data) return { cardPct: 50, cashPct: 50, card: 0, cash: 0 }
    const card = data.summary.month.card
    const cash = data.summary.month.cash
    const t = card + cash
    if (t <= 0) return { cardPct: 50, cashPct: 50, card: 0, cash: 0 }
    return {
      cardPct: (100 * card) / t,
      cashPct: (100 * cash) / t,
      card,
      cash,
    }
  }, [data])

  const submitRefund = async () => {
    if (!refundTxn?.squarePaymentId) return
    const amt = parseFloat(refundAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Invalid amount')
      return
    }
    if (!refundReason.trim()) {
      toast.error('Reason required')
      return
    }
    const cents = Math.round(amt * 100)
    const res = await fetch('/api/squire/refund', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: refundTxn.squarePaymentId,
        amountCents: cents,
        reason: refundReason.trim(),
        transactionId: refundTxn.id,
      }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(j.error || 'Refund failed')
      return
    }
    toast.success(`Refund of ${formatMoney(amt)} processed`)
    setRefundTxn(null)
    setRefundReason('')
    void load()
  }

  const executeVoidManual = async () => {
    const t = voidTxn
    if (!t) return
    setVoidLoading(true)
    try {
      const res = await fetch(`/api/dashboard/tickets/${t.id}`, { method: 'DELETE', credentials: 'include' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((j as { error?: string }).error || 'Void failed')
        return
      }
      toast.success('Transaction voided')
      setVoidTxn(null)
      void load()
    } finally {
      setVoidLoading(false)
    }
  }

  const printSummary = useMemo(() => {
    const txns = (data?.transactions ?? []).filter((t) => t.paymentStatus === 'paid')
    const ticketInputs = txns.filter((t) => t.source !== 'deduction')
    let cashSales = 0
    let cardSales = 0
    let cashCount = 0
    let cardCount = 0
    const byBarber = new Map<
      string,
      { barberName: string; tickets: number; total: number; cashSales: number; cardSales: number }
    >()
    const byHour = new Map<string, number>()

    for (const t of ticketInputs) {
      const total = Number(t.total)
      if (t.paymentMethod === 'cash') {
        cashSales += total
        cashCount += 1
      }
      if (t.paymentMethod === 'card') {
        cardSales += total
        cardCount += 1
      }
      const key = t.barberName ?? 'Staff'
      const prev = byBarber.get(key) ?? { barberName: key, tickets: 0, total: 0, cashSales: 0, cardSales: 0 }
      prev.tickets += 1
      prev.total += total
      if (t.paymentMethod === 'cash') prev.cashSales += total
      if (t.paymentMethod === 'card') prev.cardSales += total
      byBarber.set(key, prev)

      const h = format(new Date(t.createdAt), 'h a')
      byHour.set(h, (byHour.get(h) ?? 0) + 1)
    }

    const byBarberRows = [...byBarber.values()]
      .map((r) => ({ ...r, avgTicket: r.tickets > 0 ? r.total / r.tickets : 0 }))
      .sort((a, b) => b.total - a.total)
    const popularHour = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0]
    return {
      totalSales: cashSales + cardSales,
      ticketCount: ticketInputs.length,
      cashSales,
      cardSales,
      cashCount,
      cardCount,
      byBarberRows,
      popularHourLabel: popularHour?.[0] ?? 'N/A',
      popularHourCount: popularHour?.[1] ?? 0,
    }
  }, [data?.transactions])

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 pt-2 text-headz-black sm:pt-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-headz-gray transition hover:text-headz-black"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back to dashboard
      </Link>

      <div className="flex flex-col gap-4 border-b border-headz-red/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-headz-red/12 text-headz-red">
              <ReceiptText className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-bold md:text-3xl">Payments</h1>
              <p className="mt-0.5 text-sm text-headz-gray">Card, cash, and manual tickets — filter, print, void, refund.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === 'all'
                  ? 'bg-rose-300/90 text-rose-950 shadow-md shadow-rose-900/10'
                  : 'border border-black/10 bg-white text-headz-gray hover:border-rose-200 hover:text-headz-black'
              )}
            >
              All transactions
            </button>
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === 'manual'
                  ? 'bg-rose-300/90 text-rose-950 shadow-md shadow-rose-900/10'
                  : 'border border-black/10 bg-white text-headz-gray hover:border-rose-200 hover:text-headz-black'
              )}
            >
              Manual tickets
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!data?.transactions.length}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-headz-cream/80 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print summary
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-headz-red/25 bg-gradient-to-r from-headz-red/10 to-transparent px-4 py-2.5 text-sm font-semibold text-headz-red transition hover:bg-headz-red/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-6 text-center shadow-sm">
          <p className="font-medium text-red-900">Couldn’t load payments</p>
          <p className="mt-2 text-sm text-red-800/90">{err}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-lg bg-headz-red px-5 py-2.5 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {loading && !data && !err && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-black/[0.06]" />
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-xl bg-black/[0.06]" />
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              title="Today"
              total={data.summary.today.card + data.summary.today.cash}
              card={data.summary.today.card}
              cash={data.summary.today.cash}
            />
            <SummaryCard
              title="This week"
              total={data.summary.week.card + data.summary.week.cash}
              card={data.summary.week.card}
              cash={data.summary.week.cash}
            />
            <SummaryCard
              title="This month"
              total={data.summary.month.card + data.summary.month.cash}
              card={data.summary.month.card}
              cash={data.summary.month.cash}
            />
          </div>

          <div className="rounded-2xl border border-headz-red/12 bg-gradient-to-r from-white to-headz-cream/30 p-6 shadow-sm">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-headz-gray">This month — mix</p>
            <div className="flex h-3 w-full max-w-full overflow-hidden rounded-full bg-black/5 transition-all duration-700">
              <div
                className="h-full bg-sky-400/90 transition-all duration-700"
                style={{ width: `${monthBar.cardPct}%` }}
              />
              <div
                className="h-full bg-teal-400/90 transition-all duration-700"
                style={{ width: `${monthBar.cashPct}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-headz-gray">
              <span className="font-semibold text-sky-800">Card {formatMoney(monthBar.card)}</span>
              <span className="mx-2 text-headz-gray/50">·</span>
              <span className="font-semibold text-teal-800">Cash {formatMoney(monthBar.cash)}</span>
            </p>
          </div>

          <section className="rounded-2xl border-2 border-black/[0.06] bg-gradient-to-br from-white to-headz-cream/30 p-1 shadow-lg shadow-black/[0.06] print:break-inside-avoid">
            <div className="rounded-[14px] border border-white/80 bg-white/90 p-5 backdrop-blur-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-xl font-bold text-headz-black">Print summary</h2>
                <p className="text-xs text-headz-gray">
                  {from} → {to}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-rose-200/70 bg-rose-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800/80">Total sales</p>
                  <p className="mt-1 font-mono text-xl font-black text-rose-900">{formatMoney(printSummary.totalSales)}</p>
                </div>
                <div className="rounded-xl border border-teal-200/70 bg-teal-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800/80">Cash tickets</p>
                  <p className="mt-1 font-mono text-xl font-black text-teal-800">
                    {printSummary.cashCount} · {formatMoney(printSummary.cashSales)}
                  </p>
                </div>
                <div className="rounded-xl border border-sky-200/70 bg-sky-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800/80">Card tickets</p>
                  <p className="mt-1 font-mono text-xl font-black text-sky-800">
                    {printSummary.cardCount} · {formatMoney(printSummary.cardSales)}
                  </p>
                </div>
                <div className="rounded-xl border border-violet-200/70 bg-violet-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-900/70">Most popular hour</p>
                  <p className="mt-1 font-mono text-xl font-black text-violet-900">
                    {printSummary.popularHourLabel}
                  </p>
                  <p className="text-xs text-headz-gray">{printSummary.popularHourCount} ticket inputs</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-black/5">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-black/5 bg-headz-cream/40 text-left text-[10px] font-bold uppercase tracking-wider text-headz-gray">
                      <th className="px-3 py-2">Barber</th>
                      <th className="px-3 py-2">Tickets</th>
                      <th className="px-3 py-2">Avg ticket</th>
                      <th className="px-3 py-2">Cash sales</th>
                      <th className="px-3 py-2">Card sales</th>
                      <th className="px-3 py-2">Total sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printSummary.byBarberRows.map((r) => (
                      <tr key={r.barberName} className="border-b border-black/[0.04] last:border-0">
                        <td className="px-3 py-2.5 font-medium">{r.barberName}</td>
                        <td className="px-3 py-2.5">{r.tickets}</td>
                        <td className="px-3 py-2.5">{formatMoney(r.avgTicket)}</td>
                        <td className="px-3 py-2.5 text-teal-800">{formatMoney(r.cashSales)}</td>
                        <td className="px-3 py-2.5 text-sky-800">{formatMoney(r.cardSales)}</td>
                        <td className="px-3 py-2.5 font-semibold">{formatMoney(r.total)}</td>
                      </tr>
                    ))}
                    {printSummary.byBarberRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-headz-gray">
                          No ticket sales in this range.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-md shadow-black/[0.03]">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Filters</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div>
                <label className="text-xs font-medium text-headz-gray">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border-2 border-black/[0.08] bg-headz-cream/20 px-3 py-2.5 text-sm transition focus:border-headz-red/35 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-headz-gray">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border-2 border-black/[0.08] bg-headz-cream/20 px-3 py-2.5 text-sm transition focus:border-headz-red/35 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-headz-gray">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as typeof method)}
                  className="mt-1.5 w-full rounded-xl border-2 border-black/[0.08] bg-white px-3 py-2.5 text-sm focus:border-headz-red/35 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
                >
                  <option value="all">All</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-headz-gray">Barber</label>
                <select
                  value={barberId}
                  onChange={(e) => setBarberId(e.target.value)}
                  className="mt-1.5 w-full min-w-0 rounded-xl border-2 border-black/[0.08] bg-white px-3 py-2.5 text-sm focus:border-headz-red/35 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
                >
                  <option value="">All barbers</option>
                  {data.barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name ?? 'Barber'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 xl:col-span-2">
                <label className="text-xs font-medium text-headz-gray" htmlFor="payments-search-customer">
                  Search customer
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <Search className="h-4 w-4 shrink-0 text-headz-gray" aria-hidden />
                  </span>
                  <input
                    id="payments-search-customer"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void load()}
                    placeholder="Name…"
                    className="w-full rounded-xl border-2 border-black/[0.08] bg-white py-2.5 pl-10 pr-3 text-sm placeholder:text-headz-gray/50 focus:border-rose-300/80 focus:outline-none focus:ring-4 focus:ring-rose-200/40"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void load()}
                  className="w-full rounded-xl bg-rose-900/90 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-900/15 transition hover:bg-rose-950"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-lg shadow-black/[0.04]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-gradient-to-r from-headz-cream/50 to-white text-[11px] font-bold uppercase tracking-wider text-headz-gray">
                <tr>
                  <th className="px-4 py-3.5">Time</th>
                  <th className="px-4 py-3.5">Barber</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Service</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Total</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-headz-gray">
                      No transactions match your filters yet.
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((t) => {
                    const service = t.items?.[0]?.name ?? '—'
                    const tipN = Number(t.tipAmount)
                    return (
                      <tr key={t.id} className="border-b border-black/[0.06] transition-colors hover:bg-headz-red/[0.02]">
                        <td className="whitespace-nowrap px-4 py-2 text-xs text-headz-gray">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{t.barberName ?? '—'}</td>
                        <td className="px-4 py-2">{t.customerName}</td>
                        <td className="max-w-[180px] truncate px-4 py-2 text-headz-gray">{service}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col gap-0.5">
                            {t.paymentMethod === 'card' ? (
                              <span className="w-fit rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                                CARD
                              </span>
                            ) : (
                              <span className="w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
                                CASH
                              </span>
                            )}
                            {t.paymentMethod === 'card' && (t.cardBrand || t.cardLastFour) ? (
                              <span className="text-[11px] text-headz-gray">
                                {t.cardBrand ?? ''} {t.cardLastFour ? `····${t.cardLastFour}` : ''}
                              </span>
                            ) : null}
                            {t.source === 'manual' ? (
                              <span className="text-[10px] text-headz-gray/50">manual</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-bold tabular-nums text-headz-black">{formatMoney(Number(t.total))}</span>
                          {tipN > 0 ? (
                            <p className="text-xs text-headz-gray">+{formatMoney(tipN)} tip</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge status={t.paymentStatus} />
                        </td>
                        <td className="space-x-2 whitespace-nowrap px-4 py-2">
                          {t.source === 'manual' && t.paymentStatus !== 'voided' && (
                            <button
                              type="button"
                              onClick={() => setVoidTxn(t)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-headz-red transition hover:bg-red-50"
                            >
                              Void
                            </button>
                          )}
                          {t.paymentMethod === 'card' && t.paymentStatus === 'paid' && t.squarePaymentId && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundTxn(t)
                                setRefundAmount(Number(t.total).toFixed(2))
                                setRefundReason('')
                              }}
                              className="text-xs text-headz-red hover:underline"
                            >
                              Refund
                            </button>
                          )}
                          <a
                            href={SQUIRE.adminAppUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-xs text-headz-gray hover:text-headz-black"
                          >
                            Squire <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {refundTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-headz-red/15 bg-gradient-to-b from-white to-headz-cream/40 p-6 shadow-2xl">
            <h2 className="font-serif text-lg font-bold text-headz-black">Refund payment</h2>
            <p className="mt-2 text-sm text-headz-gray">
              {refundTxn.customerName} — max {formatMoney(Number(refundTxn.total))}
            </p>
            <label className="mt-4 block text-xs font-semibold text-headz-gray">Amount (USD)</label>
            <input
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-black/[0.08] bg-white px-3 py-2.5 text-sm focus:border-headz-red/35 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
            />
            <label className="mt-3 block text-xs font-semibold text-headz-gray">Reason (required)</label>
            <input
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-black/[0.08] bg-white px-3 py-2.5 text-sm focus:border-headz-red/35 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-black/12 px-5 py-2.5 text-sm font-semibold hover:bg-headz-cream/80"
                onClick={() => setRefundTxn(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRefund()}
                className="rounded-xl bg-headz-red px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-headz-red/25 hover:bg-headz-redDark"
              >
                Process refund
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={voidTxn !== null}
        title="Void this transaction?"
        message={
          voidTxn
            ? `Remove ${formatMoney(Number(voidTxn.total))} for ${voidTxn.customerName} from reporting. This matches voiding a ticket on the Tickets page.`
            : ''
        }
        confirmLabel="Void transaction"
        danger
        loading={voidLoading}
        onClose={() => {
          if (!voidLoading) setVoidTxn(null)
        }}
        onConfirm={executeVoidManual}
        overlayClassName="backdrop-blur-[2px]"
        panelClassName="w-full max-w-md rounded-2xl border border-headz-red/20 bg-gradient-to-b from-white to-headz-cream/50 p-6 shadow-2xl shadow-black/20"
      />
    </div>
  )
}

function SummaryCard({
  title,
  total,
  card,
  cash,
}: {
  title: string
  total: number
  card: number
  cash: number
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-gradient-to-br from-white to-headz-cream/25 p-5 shadow-md shadow-black/[0.04]">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-headz-gray">{title}</p>
      <p className="mt-2 font-mono text-2xl font-black tabular-nums text-headz-black">{formatMoney(total)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">
          <Banknote className="h-3 w-3" aria-hidden />
          {formatMoney(cash)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-800">
          <CreditCard className="h-3 w-3" aria-hidden />
          {formatMoney(card)}
        </span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-800'
        : status === 'refunded'
          ? 'bg-neutral-200 text-neutral-700'
          : status === 'voided'
            ? 'bg-neutral-100 text-neutral-600'
            : 'bg-red-100 text-red-800'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>
}
