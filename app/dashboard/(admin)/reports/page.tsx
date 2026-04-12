'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { subDays, format } from 'date-fns'
import { ArrowRight, Banknote, CreditCard, ReceiptText, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatMoney } from '@/lib/utils/format-money'
import { cn } from '@/lib/utils/cn'

/** Same POS aggregates as the Tickets page, over a date range (no appointment automation). */
type ReportsPayload = {
  posRevenue?: number
  cashTotal?: number
  cardTotal?: number
  totalTicketsInRange?: number
  ticketsByBarber?: { barber: string; tickets: number; revenue: number }[]
}

function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400/60'
      : rank === 2
        ? 'bg-slate-200 text-slate-800 ring-2 ring-slate-400/40'
        : rank === 3
          ? 'bg-orange-100 text-orange-900 ring-2 ring-orange-300/50'
          : 'bg-headz-black/[0.06] text-headz-gray'
  return (
    <span
      className={cn(
        'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg font-mono text-sm font-black tabular-nums',
        style
      )}
    >
      #{rank}
    </span>
  )
}

export default function ReportsPage() {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const [data, setData] = useState<ReportsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch(`/api/dashboard/reports?start=${start}&end=${end}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setData(j as ReportsPayload))
      .finally(() => setLoading(false))
  }, [start, end])

  const ticketsRanked = useMemo(() => {
    const rows = [...(data?.ticketsByBarber ?? [])]
    rows.sort((a, b) => b.tickets - a.tickets || b.revenue - a.revenue)
    return rows.map((row, i) => ({ ...row, rank: i + 1 }))
  }, [data?.ticketsByBarber])

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 text-headz-black">
        <Skeleton variant="line" className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    )
  }

  const payload = data
  const posRev = payload.posRevenue ?? 0
  const cashT = payload.cashTotal ?? 0
  const cardT = payload.cardTotal ?? 0
  const totalTickets = payload.totalTicketsInRange ?? ticketsRanked.reduce((s, r) => s + r.tickets, 0)
  const splitDenom = cashT + cardT
  const cashPct = splitDenom > 0 ? (100 * cashT) / splitDenom : 50
  const cardPct = 100 - cashPct

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12 text-headz-black">
      <div className="flex flex-col gap-4 border-b border-headz-red/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold md:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-headz-gray">
            Everything here matches what you record on <span className="font-medium text-headz-black">Tickets</span> — paid
            POS rows (walk-ins + terminal), aggregated for the range. No appointment estimates.
          </p>
          <p className="mt-2 font-mono text-xs text-headz-gray">
            {start} → {end} · NY business day for ticket totals matches the Tickets page logic in POS
          </p>
        </div>
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-2 self-start rounded-full border border-headz-red/25 bg-gradient-to-r from-headz-red/10 to-transparent px-4 py-2 text-sm font-semibold text-headz-red transition hover:border-headz-red/40 hover:bg-headz-red/15"
        >
          Today&apos;s tickets
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <section>
        <h2 className="mb-3 font-serif text-lg font-bold text-headz-black">Ticket &amp; POS</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/35 p-5 shadow-sm shadow-black/[0.03]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-800/75">Tickets sold</p>
                <p className="mt-2 font-mono text-3xl font-black tabular-nums text-rose-900">{totalTickets}</p>
                <p className="mt-1 text-xs text-headz-gray">Paid POS in range</p>
              </div>
              <span className="rounded-xl bg-rose-100/90 p-2.5 text-rose-900">
                <ReceiptText className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-teal-200/70 bg-gradient-to-br from-white to-teal-50/35 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/70">Cash</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums text-teal-800">{formatMoney(cashT)}</p>
                <p className="mt-1 text-xs text-headz-gray">{cashPct.toFixed(0)}% of card+cash</p>
              </div>
              <span className="rounded-xl bg-teal-100/90 p-2.5 text-teal-800">
                <Banknote className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-white to-sky-50/40 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-800/65">Card</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums text-sky-800">{formatMoney(cardT)}</p>
                <p className="mt-1 text-xs text-headz-gray">{cardPct.toFixed(0)}% of card+cash</p>
              </div>
              <span className="rounded-xl bg-sky-100/90 p-2.5 text-sky-800">
                <CreditCard className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-white to-violet-50/30 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-900/55">Ticket revenue</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums text-violet-950">{formatMoney(posRev)}</p>
                <p className="mt-1 text-xs text-headz-gray">Subtotal + tips (paid)</p>
              </div>
              <span className="rounded-xl bg-violet-100/90 p-2.5 text-violet-800">
                <TrendingUp className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-headz-red/12 bg-gradient-to-b from-white to-headz-cream/25 p-6 shadow-md shadow-black/[0.04]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl font-bold text-headz-black">Tickets by barber</h2>
          <p className="text-xs text-headz-gray">Ranked by ticket count</p>
        </div>
        {ticketsRanked.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/10 bg-white/60 py-10 text-center text-sm text-headz-gray">
            No tickets in this range. Add sales on{' '}
            <Link href="/dashboard/tickets" className="font-semibold text-headz-red underline-offset-2 hover:underline">
              Tickets
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-[11px] font-bold uppercase tracking-wider text-headz-gray">
                  <th className="py-3 pr-3">Rank</th>
                  <th className="py-3 pr-4">Barber</th>
                  <th className="py-3 pr-4">Tickets</th>
                  <th className="py-3 pr-4">Revenue</th>
                  <th className="py-3">Avg / ticket</th>
                </tr>
              </thead>
              <tbody>
                {ticketsRanked.map((row) => (
                  <tr
                    key={`${row.barber}-${row.rank}`}
                    className={cn(
                      'border-b border-black/[0.06] transition-colors hover:bg-headz-red/[0.03]',
                      row.rank <= 3 && 'bg-headz-red/[0.02]'
                    )}
                  >
                    <td className="py-3 pr-3 align-middle">
                      <RankBadge rank={row.rank} />
                    </td>
                    <td className="py-3 pr-4 font-semibold text-headz-black">{row.barber}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-lg bg-headz-black/[0.06] px-2 py-1 font-mono text-sm font-bold tabular-nums text-headz-black">
                        {row.tickets}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium tabular-nums text-headz-black">{formatMoney(row.revenue)}</td>
                    <td className="py-3 tabular-nums text-headz-gray">
                      {formatMoney(row.tickets > 0 ? row.revenue / row.tickets : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-serif font-bold text-headz-black">Cash vs card (same pool as Tickets)</h3>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/5">
          <div className="h-full bg-teal-400/90 transition-all duration-500" style={{ width: `${cashPct}%` }} />
          <div className="h-full bg-sky-400/90 transition-all duration-500" style={{ width: `${cardPct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-teal-800">CASH {formatMoney(cashT)}</span>
          <span className="text-headz-gray">
            {cashPct.toFixed(0)}% / {cardPct.toFixed(0)}%
          </span>
          <span className="font-semibold text-sky-800">CARD {formatMoney(cardT)}</span>
        </div>
      </div>
    </div>
  )
}
