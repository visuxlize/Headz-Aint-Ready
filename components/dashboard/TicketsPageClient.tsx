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
  customExtraAmount?: number
  deductionReason?: string | null
  isDeduction?: boolean
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
  deductions: number
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
  const [extraAmountMode, setExtraAmountMode] = useState<'none' | 'custom' | 'deduction'>('none')
  const [customAmountStr, setCustomAmountStr] = useState('')
  const [deductionReason, setDeductionReason] = useState('')
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
  const [editExtraMode, setEditExtraMode] = useState<'none' | 'custom'>('none')
  const [editCustomAmountStr, setEditCustomAmountStr] = useState('')
  const [editPayment, setEditPayment] = useState<'cash' | 'card'>('cash')
  const [editCustomer, setEditCustomer] = useState('')
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
  const extraAmountSelectOptions = useMemo(
    () => [
      { value: 'none', label: 'No custom amount' },
      { value: 'custom', label: 'Custom amount' },
      { value: 'deduction', label: 'Cash deduction' },
    ],
    []
  )
  const isDeductionMode = extraAmountMode === 'deduction'
  const serviceCatalogAmount = selectedService ? parsePrice(selectedService.price) : 0
  const customExtraParsed =
    extraAmountMode === 'custom'
      ? Math.min(50_000, Math.max(0, Number.parseFloat(customAmountStr) || 0))
      : 0
  const subtotalBeforeTip = serviceCatalogAmount + (extraAmountMode === 'custom' ? customExtraParsed : 0)
  const tip = Number.parseFloat(tipStr) || 0

  const filtered = useMemo(() => tickets, [tickets])

  const groupedByHour = useMemo(() => {
    const groups = new Map<string, Ticket[]>()
    for (const t of filtered) {
      const key = format(new Date(t.createdAt), 'h a')
      const prev = groups.get(key) ?? []
      prev.push(t)
      groups.set(key, prev)
    }
    return [...groups.entries()].map(([hour, rows]) => ({ hour, rows }))
  }, [filtered])

  const editCustomExtraParsed = useMemo(
    () =>
      editExtraMode === 'custom'
        ? Math.min(50_000, Math.max(0, Number.parseFloat(editCustomAmountStr) || 0))
        : 0,
    [editExtraMode, editCustomAmountStr]
  )

  const cashAnim = useAnimatedCounter(totals?.cash ?? 0, 600)
  const cardAnim = useAnimatedCounter(totals?.card ?? 0, 600)
  const countAnim = useAnimatedCounter(totals?.count ?? 0, 600)

  const submit = async () => {
    if (isDeductionMode) {
      if (customExtraParsed <= 0) return
      if (deductionReason.trim().length < 3) return
    } else {
      if (!barberProfileId || !serviceId || serviceCatalogAmount <= 0 || !paymentMethod) return
      if (extraAmountMode === 'custom' && customExtraParsed <= 0) return
    }
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/dashboard/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isDeductionMode
            ? {
                entryType: 'deduction' as const,
                deductionAmount: customExtraParsed,
                deductionReason: deductionReason.trim(),
              }
            : {
                entryType: 'ticket' as const,
                barberProfileId,
                serviceId,
                customerName: customerName.trim() || undefined,
                paymentMethod,
                tipAmount: tip > 0 ? tip : undefined,
                ...(extraAmountMode === 'custom'
                  ? { addCustomAmount: true, customAmount: customExtraParsed }
                  : {}),
              }),
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
      setExtraAmountMode('none')
      setCustomAmountStr('')
      setDeductionReason('')
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
    const extra = t.customExtraAmount && t.customExtraAmount > 0 ? t.customExtraAmount : 0
    if (extra > 0) {
      setEditExtraMode('custom')
      setEditCustomAmountStr(String(extra))
    } else {
      setEditExtraMode('none')
      setEditCustomAmountStr('')
    }
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
    if (editExtraMode === 'custom' && editCustomExtraParsed <= 0) return
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
          ...(editExtraMode === 'custom'
            ? { addCustomAmount: true, customAmount: editCustomExtraParsed }
            : {}),
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

      {/* KPI strip */}
      <div className="rounded-2xl border border-black/10 bg-gradient-to-r from-white via-white to-headz-cream/30 p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div
            className={cn(
              'rounded-xl border border-black/10 bg-white/95 p-4 shadow-[0_2px_12px_-8px_rgba(0,0,0,0.35)] transition-all',
              pulseStat === 'cash' && 'ring-2 ring-teal-300/60 ring-offset-2'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-headz-gray">Cash today</p>
                <p className="mt-1 font-mono text-[1.75rem] font-black tabular-nums leading-none text-teal-800">
                  {formatMoney(cashAnim)}
                </p>
                <p className="mt-2 text-xs text-headz-gray/80">Walk-in cash recorded today</p>
              </div>
              <span className="rounded-lg bg-teal-50 p-2 text-teal-700 ring-1 ring-teal-100">
                <Banknote className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div
            className={cn(
              'rounded-xl border border-black/10 bg-white/95 p-4 shadow-[0_2px_12px_-8px_rgba(0,0,0,0.35)] transition-all',
              pulseStat === 'card' && 'ring-2 ring-sky-300/60 ring-offset-2'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-headz-gray">Card today</p>
                <p className="mt-1 font-mono text-[1.75rem] font-black tabular-nums leading-none text-sky-800">
                  {formatMoney(cardAnim)}
                </p>
                <p className="mt-2 text-xs text-headz-gray/80">Card payments captured today</p>
              </div>
              <span className="rounded-lg bg-sky-50 p-2 text-sky-700 ring-1 ring-sky-100">
                <CreditCard className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div
            className={cn(
              'rounded-xl border border-black/10 bg-white/95 p-4 shadow-[0_2px_12px_-8px_rgba(0,0,0,0.35)] transition-all',
              pulseStat === 'count' && 'ring-2 ring-rose-300/55 ring-offset-2'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-headz-gray">Tickets today</p>
                <p className="mt-1 font-mono text-[1.75rem] font-black tabular-nums leading-none text-rose-800">
                  {Math.round(countAnim)}
                </p>
                <p className="mt-2 text-xs text-headz-gray/80">Total entries so far today</p>
              </div>
              <span className="rounded-lg bg-rose-50 p-2 text-rose-700 ring-1 ring-rose-100">
                <ReceiptText className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/95 p-4 shadow-[0_2px_12px_-8px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-headz-gray">Deductions</p>
                <p className="mt-1 font-mono text-[1.75rem] font-black tabular-nums leading-none text-amber-800">
                  {formatMoney(totals?.deductions ?? 0)}
                </p>
                <p className="mt-2 text-xs text-headz-gray/80">Cash removed from till</p>
              </div>
              <span className="rounded-lg bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100">
                <Banknote className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shop day bar */}
      <div className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-headz-red/15 bg-gradient-to-r from-white to-headz-cream/40 px-4 py-3 shadow-sm shadow-black/[0.03]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-headz-red/10 text-headz-red">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-headz-gray">Shop day</p>
            <p className="truncate font-serif text-base font-bold text-headz-black sm:text-lg">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
      </div>

      {/* Workspace: add ticket on left, hourly ticket feed on right */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="lg:sticky lg:top-24">
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
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Extra on ticket</label>
              <div className="mt-2">
                <HeadzFormSelect
                  value={extraAmountMode}
                  onChange={(v) => {
                    const mode = v === 'custom' || v === 'deduction' ? v : 'none'
                    setExtraAmountMode(mode)
                    if (mode === 'none') {
                      setCustomAmountStr('')
                      setDeductionReason('')
                    }
                  }}
                  options={extraAmountSelectOptions}
                  placeholder="Select…"
                  disabled={formDisabled}
                />
              </div>
              {extraAmountMode !== 'none' ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-headz-black">
                    {isDeductionMode ? 'Deduction amount ($)' : 'Custom amount ($)'}
                  </p>
                  <div className="relative max-w-[180px]">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-headz-gray">
                      $
                    </span>
                    <input
                      value={customAmountStr}
                      onChange={(e) => setCustomAmountStr(e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      disabled={formDisabled}
                      className="w-full rounded-xl border-2 border-black/[0.08] bg-white py-2.5 pl-8 pr-3 font-mono text-sm tabular-nums transition-colors focus:border-headz-red/40 focus:outline-none focus:ring-4 focus:ring-headz-red/10 disabled:opacity-50"
                    />
                  </div>
                  {isDeductionMode ? (
                    <div>
                      <p className="mb-1 text-xs font-medium text-headz-black">Reason (required)</p>
                      <input
                        value={deductionReason}
                        onChange={(e) => setDeductionReason(e.target.value)}
                        placeholder="Cash removed from till for..."
                        className="w-full rounded-xl border-2 border-black/[0.08] bg-white px-3 py-2.5 text-sm transition-colors focus:border-headz-red/40 focus:outline-none focus:ring-4 focus:ring-headz-red/10"
                      />
                    </div>
                  ) : null}
                  {customExtraParsed > 0 ? (
                    <span className="inline-block rounded-full bg-headz-red/10 px-2.5 py-1 text-xs font-medium text-headz-red">
                      {isDeductionMode
                        ? `Subtracts ${formatMoney(customExtraParsed)} from cash totals`
                        : `Adds ${formatMoney(customExtraParsed)} to this ticket`}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {!isDeductionMode ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">Ticket subtotal</label>
              <div className="mt-2 space-y-2 rounded-xl border-2 border-dashed border-headz-red/25 bg-headz-black/[0.03] px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-headz-gray">Catalog service</span>
                  <span className="font-mono text-base font-bold tabular-nums text-headz-black">
                    {selectedService ? formatMoney(serviceCatalogAmount) : '—'}
                  </span>
                </div>
                {extraAmountMode === 'custom' && customExtraParsed > 0 ? (
                  <div className="flex items-baseline justify-between gap-2 border-t border-black/[0.06] pt-2">
                    <span className="text-xs text-headz-gray">Custom amount</span>
                    <span className="font-mono text-base font-bold tabular-nums text-headz-red">
                      +{formatMoney(customExtraParsed)}
                    </span>
                  </div>
                ) : null}
                <div
                  className={cn(
                    'flex items-baseline justify-between gap-2 border-t border-black/[0.06] pt-2',
                    selectedService && 'border-headz-red/20'
                  )}
                >
                  <span className="text-xs font-semibold text-headz-black">Before tip</span>
                  <span className="font-mono text-xl font-black tabular-nums text-headz-black">
                    {selectedService ? formatMoney(subtotalBeforeTip) : '—'}
                  </span>
                </div>
              </div>
              {tip > 0 ? (
                <p className="mt-2 text-xs text-headz-gray">
                  With tip:{' '}
                  <span className="font-semibold text-headz-black">{formatMoney(subtotalBeforeTip + tip)}</span>
                </p>
              ) : null}
            </div>
            ) : null}

            {!isDeductionMode ? (
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
            ) : null}

            {!isDeductionMode ? (
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
            ) : null}

            {!isDeductionMode ? (
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
            ) : null}

            <button
              type="button"
              disabled={
                submitting ||
                formDisabled ||
                (
                  isDeductionMode
                    ? customExtraParsed <= 0 || deductionReason.trim().length < 3
                    : !barberProfileId ||
                      !serviceId ||
                      serviceCatalogAmount <= 0 ||
                      !paymentMethod ||
                      (extraAmountMode === 'custom' && customExtraParsed <= 0)
                )
              }
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
                isDeductionMode ? 'Record deduction' : 'Add ticket'
              )}
            </button>
              <p className="text-center text-xs text-headz-gray/90">
                {isDeductionMode
                  ? 'Deductions are subtracted from cash reporting.'
                  : 'Tickets are recorded to the daily report.'}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-black/[0.06] bg-white/90 p-4 shadow-sm sm:p-5">
            <div className="mb-4 border-b border-black/5 pb-3">
              <h2 className="font-serif text-xl font-bold text-headz-black">Today&apos;s tickets</h2>
              {lastUpdated ? (
                <p className="mt-1 text-xs text-headz-gray/80">
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </p>
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
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 sm:pr-2">
                {groupedByHour.map((group) => (
                  <div key={group.hour}>
                    <div className="sticky top-0 z-[1] mb-2 rounded-lg border border-black/5 bg-headz-cream/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-headz-gray backdrop-blur-sm">
                      {group.hour} · {group.rows.length} {group.rows.length === 1 ? 'entry' : 'entries'}
                    </div>
                    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {group.rows.map((t) => {
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
                            {t.isDeduction ? (
                              <p className="mt-0.5 text-xs font-semibold text-amber-700">
                                Deduction{t.deductionReason ? ` - ${t.deductionReason}` : ''}
                              </p>
                            ) : null}
                            {(t.customExtraAmount ?? 0) > 0 ? (
                              <p className="mt-0.5 text-xs font-medium text-headz-red/90">
                                + {formatMoney(t.customExtraAmount!)} custom
                              </p>
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
                                    title={t.isDeduction ? 'Deductions cannot be edited.' : undefined}
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
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-headz-gray">
                                Extra on ticket
                              </label>
                              <div className="mt-1">
                                <HeadzFormSelect
                                  size="sm"
                                  value={editExtraMode}
                                  onChange={(v) => {
                                    setEditExtraMode(v === 'custom' ? 'custom' : 'none')
                                    if (v !== 'custom') setEditCustomAmountStr('')
                                  }}
                                  options={extraAmountSelectOptions}
                                  placeholder="Select…"
                                />
                              </div>
                              {editExtraMode === 'custom' ? (
                                <div className="relative mt-2 max-w-[180px]">
                                  <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-headz-gray">
                                    $
                                  </span>
                                  <input
                                    value={editCustomAmountStr}
                                    onChange={(e) => setEditCustomAmountStr(e.target.value)}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="w-full rounded-lg border-2 border-black/[0.08] bg-white py-2 pl-8 pr-3 font-mono text-sm tabular-nums"
                                  />
                                </div>
                              ) : null}
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
                                    disabled={
                                      editSaving ||
                                      !editBarberId ||
                                      !editServiceId ||
                                      (editExtraMode === 'custom' && editCustomExtraParsed <= 0)
                                    }
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
                  </div>
                ))}
              </div>
            )}
          </section>
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
