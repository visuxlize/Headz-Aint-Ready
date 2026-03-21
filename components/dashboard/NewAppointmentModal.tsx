'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { Service } from '@/lib/db/schema'
import { parseJsonResponse } from '@/lib/utils/parse-json-response'

export function NewAppointmentModal({
  open,
  onClose,
  role,
  barberOptions,
  initialBarberId,
  initialDate,
  initialTime,
}: {
  open: boolean
  onClose: () => void
  role: 'admin' | 'barber'
  barberOptions: { id: string; name: string }[]
  initialBarberId: string | null
  initialDate: string
  initialTime: string
}) {
  const [clientName, setClientName] = useState('')
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const [serviceId, setServiceId] = useState('')
  const [barberId, setBarberId] = useState(initialBarberId ?? '')
  const [date, setDate] = useState(initialDate)
  const [slots, setSlots] = useState<string[]>([])
  const [slotIso, setSlotIso] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)

  const selectedService = services.find((s) => s.id === serviceId)

  useEffect(() => {
    if (!open) return
    void (async () => {
      try {
        const path = role === 'admin' ? '/api/admin/services' : '/api/barber/services'
        const res = await fetch(path, { credentials: 'include' })
        const j = await parseJsonResponse<{ data?: Service[] }>(res)
        if (!res.ok || !j.data) return
        const active = j.data.filter((s) => s.isActive)
        setServices(active)
        if (active[0]) setServiceId(active[0].id)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load services')
      }
    })()
  }, [open, role])

  useEffect(() => {
    if (!open || role !== 'admin') return
    if (initialBarberId) setBarberId(initialBarberId)
  }, [open, role, initialBarberId])

  useEffect(() => {
    setDate(initialDate)
  }, [initialDate, open])

  useEffect(() => {
    const bid = role === 'admin' ? barberId : barberOptions[0]?.id
    const dur = selectedService?.durationMinutes
    if (!open || !bid || !dur || !date) return
    setLoadingSlots(true)
    const path =
      role === 'admin'
        ? `/api/admin/slots?barberUserId=${encodeURIComponent(bid)}&date=${encodeURIComponent(date)}&durationMinutes=${dur}`
        : `/api/barber/slots?date=${encodeURIComponent(date)}&durationMinutes=${dur}`
    void (async () => {
      try {
        const res = await fetch(path, { credentials: 'include' })
        const j = await parseJsonResponse<{
          slots?: string[]
          error?: string
          warning?: string
        }>(res)
        if (!res.ok) throw new Error(j.error || `Could not load slots (${res.status})`)
        const list = j.slots ?? []
        setSlots(list)
        if (list[0]) setSlotIso(list[0])
        else setSlotIso('')
        if (j.warning) toast(j.warning, { icon: '⚠️' })
      } catch (e) {
        setSlots([])
        setSlotIso('')
        toast.error(e instanceof Error ? e.message : 'Could not load time slots')
      } finally {
        setLoadingSlots(false)
      }
    })()
  }, [open, role, barberId, barberOptions, date, selectedService?.durationMinutes, selectedService?.id])

  useEffect(() => {
    if (!open || role !== 'admin') return
    const q = clientName.trim()
    if (q.length < 2) {
      setNameSuggestions([])
      return
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/admin/customers/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((j) => setNameSuggestions((j.names as string[]) ?? []))
    }, 300)
    return () => window.clearTimeout(t)
  }, [clientName, open, role])

  if (!open) return null

  async function submit() {
    const bid = role === 'admin' ? barberId : barberOptions[0]?.id
    if (!clientName.trim() || !serviceId || !bid || !slotIso) {
      toast.error('Fill all required fields')
      return
    }
    setLoading(true)
    try {
      const path = role === 'admin' ? '/api/admin/appointments' : '/api/barber/appointments'
      const body =
        role === 'admin'
          ? {
              barberUserId: bid,
              serviceId,
              clientName: clientName.trim(),
              startAt: slotIso,
              notes: notes || undefined,
              paymentMethod,
            }
          : {
              serviceId,
              clientName: clientName.trim(),
              startAt: slotIso,
              notes: notes || undefined,
              paymentMethod,
            }
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const j = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(j.error || `Failed (${res.status})`)
      toast.success('Appointment created')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="fixed left-1/2 top-1/2 z-[90] max-h-[90vh] w-[min(520px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#FAFAF8] p-6 text-headz-black shadow-2xl">
        <h2 className="font-serif text-xl font-bold">New appointment</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            Client name
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
              placeholder="Search past customers…"
              list="headz-customer-names"
            />
            {role === 'admin' && nameSuggestions.length > 0 && (
              <datalist id="headz-customer-names">
                {nameSuggestions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            )}
          </label>
          <label className="block text-sm font-medium">
            Service
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 bg-white"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${Number(s.price).toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          {role === 'admin' && (
            <label className="block text-sm font-medium">
              Barber
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 bg-white"
              >
                {barberOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm font-medium">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Time slot
            {loadingSlots && <span className="ml-2 text-xs text-headz-gray">Loading…</span>}
            <select
              value={slotIso}
              onChange={(e) => setSlotIso(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 bg-white"
              disabled={loadingSlots || slots.length === 0}
            >
              {slots.length === 0 && !loadingSlots ? (
                <option value="">No slots available</option>
              ) : (
                slots.map((iso) => (
                  <option key={iso} value={iso}>
                    {new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </option>
                ))
              )}
            </select>
            {!loadingSlots && slots.length === 0 && barberId && date && selectedService && (
              <p className="mt-1 text-xs text-headz-gray">
                No open slots for this day — check store hours, barber availability, or time off in the database.
              </p>
            )}
          </label>
          <label className="block text-sm font-medium">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
              rows={2}
            />
          </label>
          <div>
            <span className="block text-sm font-medium">Payment type</span>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  paymentMethod === 'cash'
                    ? 'border-headz-red bg-headz-red/10'
                    : 'border-black/15 text-headz-gray hover:border-black/30'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  paymentMethod === 'card'
                    ? 'border-headz-red bg-headz-red/10'
                    : 'border-black/15 text-headz-gray hover:border-black/30'
                }`}
              >
                Card
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-black/5">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="rounded-lg bg-headz-red px-4 py-2 text-sm font-semibold text-white hover:bg-headz-redDark disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>
    </>
  )
}
