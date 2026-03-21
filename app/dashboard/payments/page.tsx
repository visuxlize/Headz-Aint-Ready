'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronLeft, ExternalLink, RefreshCw } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<PaymentsPayload | null>(null)
  const [method, setMethod] = useState<'all' | 'card' | 'cash'>('all')
  const [barberId, setBarberId] = useState('')
  const [q, setQ] = useState('')
  const [refundTxn, setRefundTxn] = useState<Txn | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const u = new URL('/api/dashboard/payments', window.location.origin)
      if (method !== 'all') u.searchParams.set('method', method)
      if (barberId) u.searchParams.set('barberId', barberId)
      if (q.trim()) u.searchParams.set('q', q.trim())
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
  }, [method, barberId, q])

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
    const res = await fetch('/api/square/refund', {
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
    toast.success(`Refund of $${amt.toFixed(2)} processed`)
    setRefundTxn(null)
    setRefundReason('')
    void load()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 pt-2 sm:pt-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-headz-gray transition hover:text-headz-black"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back to dashboard
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-headz-black md:text-3xl">Payments</h1>
          <p className="text-headz-gray mt-1 text-sm">Card and cash from Square — same totals as your Square dashboard</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium text-headz-black shadow-sm hover:bg-black/[0.02] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-black/[0.06]" />
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-xl bg-black/[0.06]" />
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Today" card={data.summary.today.card} cash={data.summary.today.cash} />
            <SummaryCard title="This week" card={data.summary.week.card} cash={data.summary.week.cash} />
            <SummaryCard title="This month" card={data.summary.month.card} cash={data.summary.month.cash} />
            <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Pending</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{data.summary.pending}</p>
              <p className="mt-1 text-xs text-headz-gray">Open Terminal checkouts or unfinished sales</p>
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-headz-gray">
              This month — card vs cash
            </p>
            <div className="flex h-3 w-full max-w-lg overflow-hidden rounded-full bg-black/5">
              <div className="h-full bg-headz-red transition-all" style={{ width: `${monthBar.cardPct}%` }} />
              <div className="h-full bg-[#FDF6EC] transition-all" style={{ width: `${monthBar.cashPct}%` }} />
            </div>
            <p className="mt-2 text-sm text-headz-gray">
              Card ${monthBar.card.toFixed(2)} · Cash ${monthBar.cash.toFixed(2)}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-headz-gray">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="mt-1 block rounded-lg border border-black/10 px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-headz-gray">Barber</label>
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="mt-1 block min-w-[160px] rounded-lg border border-black/10 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {data.barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name ?? 'Barber'}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="text-xs text-headz-gray">Search customer</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void load()}
                placeholder="Name…"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg bg-headz-black px-4 py-2 text-sm font-medium text-white"
            >
              Apply
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/[0.02] text-xs uppercase text-headz-gray">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Barber</th>
                  <th className="px-4 py-3">Subtotal</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-headz-gray">
                      No transactions match your filters yet.
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-black/5">
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-headz-gray">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{t.customerName}</td>
                      <td className="px-4 py-2">{t.barberName ?? '—'}</td>
                      <td className="px-4 py-2">${Number(t.subtotal).toFixed(2)}</td>
                      <td className="px-4 py-2">${Number(t.tipAmount).toFixed(2)}</td>
                      <td className="px-4 py-2 font-medium">${Number(t.total).toFixed(2)}</td>
                      <td className="px-4 py-2">
                        {t.paymentMethod === 'card' ? (
                          <span>
                            💳 {t.cardBrand ?? 'Card'} ···· {t.cardLastFour ?? '—'}
                          </span>
                        ) : (
                          <span>💵 Cash</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={t.paymentStatus} />
                      </td>
                      <td className="space-x-2 whitespace-nowrap px-4 py-2">
                        {t.paymentMethod === 'card' &&
                          t.paymentStatus === 'paid' &&
                          t.squarePaymentId && (
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
                        {t.squarePaymentId && (
                          <a
                            href={`https://squareup.com/dashboard/sales/transactions/${t.squarePaymentId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-xs text-headz-gray hover:text-headz-black"
                          >
                            Square <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {refundTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="font-serif text-lg font-bold">Refund payment</h2>
            <p className="mt-2 text-sm text-headz-gray">
              Refund for {refundTxn.customerName} — max ${Number(refundTxn.total).toFixed(2)}
            </p>
            <label className="mt-4 block text-xs text-headz-gray">Amount (USD)</label>
            <input
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs text-headz-gray">Reason (required)</label>
            <input
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2 text-sm" onClick={() => setRefundTxn(null)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRefund()}
                className="rounded-lg bg-headz-red px-4 py-2 text-sm font-medium text-white"
              >
                Process refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  card,
  cash,
}: {
  title: string
  card: number
  cash: number
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">{title}</p>
      <p className="mt-2 text-2xl font-bold">${(card + cash).toFixed(2)}</p>
      <p className="mt-1 text-xs text-headz-gray">Card: ${card.toFixed(2)}</p>
      <p className="text-xs text-headz-gray">Cash: ${cash.toFixed(2)}</p>
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
          : 'bg-red-100 text-red-800'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>
}
