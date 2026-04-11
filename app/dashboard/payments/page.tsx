'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronLeft, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { formatMoney } from '@/lib/utils/format-money'
import { cn } from '@/lib/utils/cn'

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

  const voidManual = async (t: Txn) => {
    if (!window.confirm('Void this transaction?')) return
    const res = await fetch(`/api/dashboard/tickets/${t.id}`, { method: 'DELETE', credentials: 'include' })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error((j as { error?: string }).error || 'Void failed')
      return
    }
    toast.success('Transaction voided')
    void load()
  }

  const exportCsv = () => {
    if (!data?.transactions.length) {
      toast.error('Nothing to export')
      return
    }
    const rows = data.transactions.map((t) => {
      const d = new Date(t.createdAt)
      const service = t.items?.[0]?.name ?? ''
      return [
        format(d, 'yyyy-MM-dd'),
        format(d, 'HH:mm:ss'),
        t.barberName ?? '',
        t.customerName,
        service,
        t.paymentMethod,
        t.subtotal,
        t.tipAmount,
        t.total,
        t.paymentStatus,
      ]
    })
    const header = ['Date', 'Time', 'Barber', 'Customer', 'Service', 'Method', 'Subtotal', 'Tip', 'Total', 'Status']
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download started')
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
          <h1 className="font-serif text-2xl font-bold text-headz-black md:text-3xl">Payment History</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition',
                tab === 'all' ? 'bg-headz-red text-white' : 'text-headz-gray hover:text-headz-black'
              )}
            >
              All Transactions
            </button>
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition',
                tab === 'manual' ? 'bg-headz-red text-white' : 'text-headz-gray hover:text-headz-black'
              )}
            >
              Manual Tickets
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportCsv()}
            disabled={!data?.transactions.length}
            className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium text-headz-black shadow-sm hover:bg-black/[0.02] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
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

          <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-headz-gray">
              This month — card vs cash
            </p>
            <div className="flex h-2.5 w-full max-w-full overflow-hidden rounded-full bg-black/5 transition-all duration-700">
              <div
                className="h-full bg-blue-500 transition-all duration-700"
                style={{ width: `${monthBar.cardPct}%` }}
              />
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${monthBar.cashPct}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-headz-gray">
              Card {formatMoney(monthBar.card)} · Cash {formatMoney(monthBar.cash)}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-headz-gray">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-headz-gray">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </div>
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
                  <th className="px-4 py-3">Barber</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-headz-gray">
                      No transactions match your filters yet.
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((t) => {
                    const service = t.items?.[0]?.name ?? '—'
                    const tipN = Number(t.tipAmount)
                    return (
                      <tr key={t.id} className="border-b border-black/5">
                        <td className="whitespace-nowrap px-4 py-2 text-xs text-headz-gray">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{t.barberName ?? '—'}</td>
                        <td className="px-4 py-2">{t.customerName}</td>
                        <td className="max-w-[180px] truncate px-4 py-2 text-headz-gray">{service}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col gap-0.5">
                            {t.paymentMethod === 'card' ? (
                              <span className="w-fit rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                CARD
                              </span>
                            ) : (
                              <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
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
                              onClick={() => void voidManual(t)}
                              className="text-xs text-headz-red hover:underline"
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
                            href="https://app.getsquire.com/payments"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="font-serif text-lg font-bold">Refund payment</h2>
            <p className="mt-2 text-sm text-headz-gray">
              Refund for {refundTxn.customerName} — max {formatMoney(Number(refundTxn.total))}
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
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">{title}</p>
      <p className="mt-2 text-2xl font-black tabular-nums text-headz-black">{formatMoney(total)}</p>
      <p className="mt-1 text-xs text-headz-gray">
        {formatMoney(cash)} cash · {formatMoney(card)} card
      </p>
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
