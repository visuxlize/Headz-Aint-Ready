'use client'

import { X, UserPlus, Wine, Banknote, CreditCard, StickyNote } from 'lucide-react'
import type { CalendarAppointment } from '@/components/dashboard/CalendarGrid'
import { format, parseISO } from 'date-fns'

function hhmmTo12h(hhmm: string) {
  const [hRaw, mRaw] = hhmm.split(':').map((x) => parseInt(x, 10))
  const h = Number.isNaN(hRaw) ? 0 : hRaw
  const m = Number.isNaN(mRaw) ? 0 : mRaw
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatAppointmentWhen(a: CalendarAppointment) {
  try {
    const d = parseISO(`${a.date}T12:00:00`)
    const day = format(d, 'EEEE, MMMM d, yyyy')
    return `${day} · ${hhmmTo12h(a.startTime)} – ${hhmmTo12h(a.endTime)}`
  } catch {
    return `${a.date} · ${a.startTime} – ${a.endTime}`
  }
}

function paymentPreferenceLabel(method: string | null | undefined) {
  if (method === 'cash') return 'Cash'
  if (method === 'card') return 'Card'
  if (method === 'split') return 'Split'
  return null
}

export function AppointmentPanel({
  appointment,
  open,
  onClose,
  onBlockTime,
  onNewAppointment,
  onCharge,
  onCancelAppointment,
  onAddProducts,
}: {
  appointment: CalendarAppointment | null
  open: boolean
  onClose: () => void
  onBlockTime: () => void
  onNewAppointment: () => void
  onCharge: () => void
  onCancelAppointment?: () => void
  onAddProducts?: () => void
}) {
  if (!open || !appointment) return null

  const pay = paymentPreferenceLabel(appointment.paymentMethod)
  const isCash = appointment.paymentMethod === 'cash'
  const chargeLabel = isCash ? `Collect $${appointment.price.toFixed(2)}` : `Charge $${appointment.price.toFixed(2)}`

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/50"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-[400px] flex-col bg-[#0f0f0f] shadow-2xl transition-transform duration-200 ease-out translate-x-0"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBlockTime}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
            >
              Block time
            </button>
            <button
              type="button"
              onClick={onNewAppointment}
              className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
            >
              New appointment
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-white">
          <div>
            <h2 className="font-serif text-2xl font-bold leading-tight">{appointment.customerName}</h2>
            <p className="mt-2 text-sm text-white/65 leading-snug">{formatAppointmentWhen(appointment)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">Service</p>
            <p className="font-medium">{appointment.serviceName}</p>
          </div>

          <div className="rounded-lg border border-white/10 p-3">
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 shrink-0 text-white/45 mt-0.5" aria-hidden />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-white/40">Notes</p>
                <p className="mt-1 text-sm text-white/85 whitespace-pre-wrap">
                  {appointment.notes?.trim() ? appointment.notes.trim() : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">Payment type</p>
            <div className="mt-2 flex items-center gap-2">
              {pay === 'Cash' ? (
                <Banknote className="h-4 w-4 text-emerald-300/90" aria-hidden />
              ) : pay === 'Card' ? (
                <CreditCard className="h-4 w-4 text-sky-300/90" aria-hidden />
              ) : null}
              <span className="text-sm font-medium">{pay ?? 'Not set'}</span>
            </div>
          </div>

          <div className="grid gap-2 border-t border-white/10 pt-4">
            {onCancelAppointment && (
              <button
                type="button"
                onClick={onCancelAppointment}
                className="flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/[0.08]"
              >
                Cancel appointment
              </button>
            )}
            <button
              type="button"
              onClick={onNewAppointment}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/[0.08]"
            >
              <UserPlus className="h-4 w-4 opacity-80" aria-hidden />
              Add another appointment
            </button>
            <button
              type="button"
              onClick={onAddProducts ?? (() => {})}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/[0.08]"
            >
              <Wine className="h-4 w-4 opacity-80" aria-hidden />
              Add products
            </button>
          </div>

          <button
            type="button"
            onClick={onCharge}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] text-base font-semibold text-white hover:bg-blue-600"
          >
            {isCash ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            {chargeLabel}
            {pay ? <span className="text-sm font-normal text-white/80">({pay})</span> : null}
          </button>
        </div>
      </aside>
    </>
  )
}
