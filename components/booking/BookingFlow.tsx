'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import type { Barber, Service } from '@/lib/db/schema'

type Step = 'service' | 'barber' | 'date' | 'time' | 'details' | 'done'

const STEP_LABELS: Record<Step, string> = {
  service: 'Service',
  barber: 'Barber',
  date: 'Date',
  time: 'Time',
  details: 'Your info',
  done: 'Confirmed',
}

const SLOT_INTERVAL = 30
const MONTHS_AHEAD = 2

function formatPrice(cents: number) {
  if (cents === 0) return 'Price varies'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10)
}

const EST = 'America/New_York'

function formatSlot(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: EST })
}

function getSlotHour(iso: string) {
  const d = new Date(iso)
  return parseInt(d.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: EST }), 10)
}

/** Group slots into Morning (9–12), Afternoon (12–5), Evening (5–8) */
function groupSlots(slots: string[]) {
  const morning: string[] = []
  const afternoon: string[] = []
  const evening: string[] = []
  for (const slot of slots) {
    const h = getSlotHour(slot)
    if (h < 12) morning.push(slot)
    else if (h < 17) afternoon.push(slot)
    else evening.push(slot)
  }
  return { morning, afternoon, evening }
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function BookingFlow({
  barbers,
  services,
  defaultCategory,
}: {
  barbers: Barber[]
  services: Service[]
  defaultCategory?: string
}) {
  const [step, setStep] = useState<Step>('service')
  const [service, setService] = useState<Service | null>(null)
  const [barber, setBarber] = useState<Barber | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)

  const today = useMemo(() => toDateString(new Date()), [])
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const filteredServices = defaultCategory
    ? services.filter((s) => s.category?.toLowerCase() === defaultCategory.toLowerCase())
    : services

  const loadSlots = async (barberId: string, dateStr: string, durationMinutes: number) => {
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    try {
      const res = await fetch(
        `/api/appointments/slots?barberId=${encodeURIComponent(barberId)}&date=${dateStr}&durationMinutes=${durationMinutes}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load slots')
      setSlots(json.slots ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load times')
    } finally {
      setLoadingSlots(false)
    }
  }

  const onSelectBarber = (b: Barber) => {
    setBarber(b)
    setStep('date')
  }

  const onSelectDate = (d: string) => {
    setDate(d)
    if (barber && service) void loadSlots(barber.id, d, service.durationMinutes)
    setStep('time')
  }

  const onSelectSlot = (slot: string) => {
    setSelectedSlot(slot)
    setStep('details')
  }

  const submitBooking = async () => {
    if (!barber || !service || !selectedSlot || !clientName.trim()) {
      setError('Please fill in your name and ensure a time is selected.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: barber.id,
          serviceId: service.id,
          durationMinutes: service.durationMinutes,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          startAt: selectedSlot,
          isWalkIn: false,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Booking failed')
      setBookingId(json.data?.id ?? null)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  const showSummary = (step === 'date' || step === 'time' || step === 'details') && service && barber
  const groupedSlots = useMemo(() => groupSlots(slots), [slots])

  if (step === 'done') {
    return (
      <div className="rounded-xl bg-white border border-black/10 p-8 text-center">
        <h2 className="text-xl font-semibold text-headz-red mb-2">You&apos;re booked</h2>
        <p className="text-headz-gray mb-4">
          {service?.name} with {barber?.name} on {date} at {selectedSlot ? formatSlot(selectedSlot) : ''}.
        </p>
        <p className="text-sm text-headz-gray">
          We&apos;ll see you at 81-13 37th Ave, Jackson Heights. If you need to change or cancel, call us at (718) 429-6841.
        </p>
      </div>
    )
  }

  const summaryCard = showSummary && (
    <div className="rounded-xl border border-black/10 bg-white p-5 shrink-0 w-full md:w-72">
      <h3 className="text-sm font-semibold text-headz-gray mb-3">Appointment summary</h3>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-headz-black/10 shrink-0">
          {barber?.avatarUrl ? (
            <Image src={barber.avatarUrl} alt="" width={48} height={48} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-headz-gray text-lg font-medium">
              {barber?.name.slice(0, 2)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{service?.name}</p>
          <p className="text-headz-gray text-sm">{formatPrice(service?.priceCents ?? 0)} · {service?.durationMinutes} min</p>
        </div>
      </div>
      <p className="text-sm text-headz-gray border-t border-black/10 pt-3">
        {service?.name} with {barber?.name}
      </p>
      <p className="font-medium mt-1">{formatPrice(service?.priceCents ?? 0)}</p>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row gap-8 md:gap-10">
      <div className="flex-1 min-w-0 space-y-6">
        {/* Progress */}
        <div className="flex gap-2 flex-wrap">
          {(['service', 'barber', 'date', 'time', 'details'] as const).map((s) => (
            <span
              key={s}
              className={`text-xs px-2 py-1 rounded ${
                step === s ? 'bg-headz-red text-white' : 'bg-black/10 text-headz-gray'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Service */}
        {step === 'service' && (
          <div className="rounded-xl bg-white border border-black/10 p-6">
            <h3 className="font-semibold mb-2">Choose a service</h3>
            <p className="text-headz-gray text-sm mb-4">Pick one, then choose your barber and time.</p>
            <div className="space-y-2">
              {(filteredServices.length ? filteredServices : services).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setService(s); setStep('barber') }}
                  className="w-full flex justify-between items-center p-3 rounded-lg border border-black/10 hover:border-headz-red hover:bg-headz-red/5 transition text-left gap-3"
                >
                  <span className="text-left">{s.name}</span>
                  <span className="text-headz-gray text-sm shrink-0">{formatPrice(s.priceCents)} · {s.durationMinutes} min</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Barber */}
        {step === 'barber' && (
          <div className="rounded-xl bg-white border border-black/10 p-6">
            <h3 className="font-semibold mb-4">Choose your barber</h3>
            <div className="grid grid-cols-2 gap-3">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBarber(b)}
                  className="p-4 rounded-lg border border-black/10 hover:border-headz-red hover:bg-headz-red/5 transition text-left"
                >
                  <span className="font-medium">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Date – calendar style */}
        {step === 'date' && (
          <div className="rounded-xl bg-white border border-black/10 p-6">
            <h3 className="font-semibold mb-4">Pick a date</h3>
            <div className="inline-block">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((m) => {
                    const d = new Date(m.year, m.month - 1, 1)
                    return { year: d.getFullYear(), month: d.getMonth() }
                  })}
                  className="p-2 rounded hover:bg-black/5 text-headz-gray hover:text-black"
                  aria-label="Previous month"
                >
                  ←
                </button>
                <span className="text-sm font-medium">
                  {new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((m) => {
                    const d = new Date(m.year, m.month + 1, 1)
                    const max = new Date()
                    max.setMonth(max.getMonth() + MONTHS_AHEAD)
                    if (d > max) return m
                    return { year: d.getFullYear(), month: d.getMonth() }
                  })}
                  className="p-2 rounded hover:bg-black/5 text-headz-gray hover:text-black"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-headz-gray mb-1">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-1 font-medium">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const first = new Date(calendarMonth.year, calendarMonth.month, 1)
                  const startPad = first.getDay()
                  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate()
                  const maxDate = new Date()
                  maxDate.setDate(maxDate.getDate() + 30)
                  const cells: React.ReactNode[] = []
                  for (let i = 0; i < startPad; i++) cells.push(<div key={`pad-${i}`} />)
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = toDateString(new Date(calendarMonth.year, calendarMonth.month, day))
                    const isPast = dateStr < today
                    const isFuture = dateStr > toDateString(maxDate)
                    const isSelected = dateStr === date
                    const disabled = isPast || isFuture
                    cells.push(
                      <button
                        key={day}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && onSelectDate(dateStr)}
                        className={`w-9 h-9 rounded text-sm ${
                          disabled ? 'text-black/30 cursor-not-allowed' : 'hover:bg-black/10'
                        } ${isSelected ? 'bg-headz-black text-white hover:bg-headz-black' : ''}`}
                      >
                        {day}
                      </button>
                    )
                  }
                  return cells
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Step: Time – Morning / Afternoon / Evening, EST note */}
        {step === 'time' && (
          <div className="rounded-xl bg-white border border-black/10 p-6">
            <h3 className="font-semibold mb-1">Pick a time</h3>
            {date && (
              <p className="text-headz-gray text-sm mb-2">
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            <p className="text-headz-gray text-xs mb-4">Times are shown in <strong>EST</strong>.</p>
            {loadingSlots ? (
              <p className="text-headz-gray">Loading times…</p>
            ) : slots.length === 0 ? (
              <p className="text-headz-gray">No available slots this day. Try another date.</p>
            ) : (
              <div className="space-y-6">
                {groupedSlots.morning.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-headz-gray uppercase tracking-wide mb-2">Morning</p>
                    <div className="flex flex-wrap gap-2">
                      {groupedSlots.morning.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => onSelectSlot(slot)}
                          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                            selectedSlot === slot
                              ? 'bg-headz-black text-white'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200'
                          }`}
                        >
                          {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {groupedSlots.afternoon.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-headz-gray uppercase tracking-wide mb-2">Afternoon</p>
                    <div className="flex flex-wrap gap-2">
                      {groupedSlots.afternoon.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => onSelectSlot(slot)}
                          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                            selectedSlot === slot
                              ? 'bg-headz-black text-white'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200'
                          }`}
                        >
                          {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {groupedSlots.evening.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-headz-gray uppercase tracking-wide mb-2">Evening</p>
                    <div className="flex flex-wrap gap-2">
                      {groupedSlots.evening.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => onSelectSlot(slot)}
                          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                            selectedSlot === slot
                              ? 'bg-headz-black text-white'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200'
                          }`}
                        >
                          {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setStep('date')}
              className="mt-4 text-sm text-headz-red hover:underline"
            >
              ← Change date
            </button>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className="rounded-xl bg-white border border-black/10 p-6">
            <h3 className="font-semibold mb-4">Your details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-black/20 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(718) 555-0123"
                  className="w-full px-3 py-2 border border-black/20 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-black/20 rounded-lg"
                />
              </div>
            </div>
            <p className="mt-4 text-sm text-headz-gray">
              {service?.name} with {barber?.name} · {date} at {selectedSlot ? formatSlot(selectedSlot) : ''}
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setStep('time')} className="px-4 py-2 border border-black/20 rounded-lg text-sm">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => void submitBooking()}
                disabled={submitting || !clientName.trim()}
                className="flex-1 bg-headz-red hover:bg-headz-redDark disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg"
              >
                {submitting ? 'Booking…' : 'Confirm booking'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Appointment summary – right side when on date/time/details */}
      {showSummary && (
        <div className="hidden md:block md:sticky md:top-8 md:self-start">
          {summaryCard}
        </div>
      )}
      {showSummary && (
        <div className="md:hidden mt-4">
          {summaryCard}
        </div>
      )}
    </div>
  )
}
