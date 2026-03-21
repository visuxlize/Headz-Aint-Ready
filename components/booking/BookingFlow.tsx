'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import type { Barber, Service } from '@/lib/db/schema'
import { computeNoShowFeeFromServicePrice } from '@/lib/appointments/no-show-fee'
import { formatServicePriceDisplay } from '@/lib/services/format-service-price'

type Step = 'service' | 'barber' | 'schedule' | 'details' | 'done'

const STEP_LABELS: Record<Step, string> = {
  service: 'Service',
  barber: 'Barber',
  schedule: 'Date & time',
  details: 'Your info',
  done: 'Confirmed',
}

const SLOT_INTERVAL = 30
const MONTHS_AHEAD = 2

function formatPrice(price: string | number) {
  const n = typeof price === 'string' ? parseFloat(price) : price
  if (Number.isNaN(n) || n === 0) return 'Price varies'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
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
  const [noShowAck, setNoShowAck] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card')

  const today = useMemo(() => toDateString(new Date()), [])
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const filteredServices = defaultCategory
    ? services.filter((s) => s.category?.toLowerCase() === defaultCategory.toLowerCase())
    : services

  const maxBookStr = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + MONTHS_AHEAD)
    return toDateString(d)
  }, [])

  const stepOrder = ['service', 'barber', 'schedule', 'details'] as const

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
    setStep('schedule')
  }

  const onSelectDate = (d: string) => {
    setDate(d)
    if (barber && service) void loadSlots(barber.id, d, service.durationMinutes)
  }

  const onSelectSlot = (slot: string) => {
    setSelectedSlot(slot)
  }

  const submitBooking = async () => {
    if (!barber || !service || !selectedSlot || !clientName.trim()) {
      setError('Please fill in your name and ensure a time is selected.')
      return
    }
    if (!noShowAck) {
      setError('Please read and acknowledge the no-show policy below.')
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
          noShowAcknowledged: true,
          paymentMethod,
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

  const showSummary = (step === 'schedule' || step === 'details') && service && barber
  const groupedSlots = useMemo(() => groupSlots(slots), [slots])

  if (step === 'done') {
    return (
      <div className="rounded-xl bg-white border border-black/10 p-8 text-center">
        <h2 className="text-xl font-semibold text-headz-red mb-2">You&apos;re booked</h2>
        <p className="text-headz-gray mb-4">
          {service?.name} with {barber?.name} on {date} at {selectedSlot ? formatSlot(selectedSlot) : ''}.{' '}
          Payment: <strong>{paymentMethod === 'cash' ? 'Cash' : 'Card'}</strong>.
        </p>
        <p className="text-sm text-headz-gray">
          We&apos;ll see you at 81-13 37th Ave, Jackson Heights. If you need to change or cancel, call us at (718) 429-6841.
        </p>
      </div>
    )
  }

  const summaryCard = showSummary && (
    <div className="rounded-xl border border-black/10 bg-white p-5 shrink-0 w-full md:w-72 mx-auto md:mx-0 max-w-sm md:max-w-none">
      <h3 className="text-sm font-semibold text-headz-gray mb-3 text-center md:text-left">Appointment summary</h3>
      <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-headz-black/10 shrink-0">
          {barber?.avatarUrl ? (
            <Image src={barber.avatarUrl} alt="" width={48} height={48} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-headz-gray text-lg font-medium">
              {barber?.name.slice(0, 2)}
            </div>
          )}
        </div>
        <div className="min-w-0 text-center md:text-left">
          <p className="font-medium truncate">{service?.name}</p>
          <p className="text-headz-gray text-sm">
            {service ? formatServicePriceDisplay(service) : ''} · {service?.durationMinutes} min
          </p>
        </div>
      </div>
      <p className="text-sm text-headz-gray border-t border-black/10 pt-3 text-center md:text-left">
        {service?.name} with {barber?.name}
      </p>
      <p className="font-medium mt-1 text-center md:text-left">
        {service ? formatServicePriceDisplay(service) : ''}
      </p>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 w-full max-w-full">
      <div className="flex-1 min-w-0 space-y-6 w-full">
        {/* Progress — numbered stepper */}
        <div className="flex items-center justify-center md:justify-start gap-0 flex-wrap">
          {stepOrder.map((s, i) => {
            const active = step === s
            const currentIndex = stepOrder.indexOf(step)
            const past = currentIndex > i
            return (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${
                    active
                      ? 'bg-headz-red text-white ring-2 ring-headz-red/30'
                      : past
                        ? 'bg-headz-black text-white'
                        : 'bg-black/10 text-headz-gray'
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`hidden sm:inline text-xs ml-2 mr-3 max-w-[5.5rem] ${
                    active ? 'font-semibold text-headz-black' : 'text-headz-gray'
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
                {i < 3 && <div className="hidden sm:block w-6 h-px bg-black/15 -mx-1" aria-hidden />}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Service */}
        {step === 'service' && (
          <div className="rounded-xl bg-white border border-black/10 p-6 text-center md:text-left">
            <h3 className="font-semibold mb-2">Choose a service</h3>
            <p className="text-headz-gray text-sm mb-4">Pick one, then choose your barber and time.</p>
            <div className="space-y-2">
              {(filteredServices.length ? filteredServices : services).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setService(s); setStep('barber') }}
                  className="w-full flex justify-between items-start p-3 rounded-lg border border-black/10 hover:border-headz-red hover:bg-headz-red/5 transition text-left gap-3"
                >
                  <span className="text-left min-w-0">
                    <span className="font-medium block">{s.name}</span>
                    {s.description?.trim() ? (
                      <span className="text-headz-gray text-xs font-normal block mt-0.5">{s.description}</span>
                    ) : null}
                  </span>
                  <span className="text-headz-gray text-sm shrink-0 text-right">
                    {formatServicePriceDisplay(s)} · {s.durationMinutes} min
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Barber */}
        {step === 'barber' && (
          <div className="rounded-2xl bg-white border border-black/10 shadow-sm p-6 text-center md:text-left">
            <h3 className="font-semibold text-lg mb-2">Choose your barber</h3>
            <p className="text-headz-gray text-sm mb-4">Available times follow each barber&apos;s schedule and time off.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBarber(b)}
                  className="flex w-32 shrink-0 flex-col items-center gap-2 rounded-xl border border-black/10 p-4 text-center transition hover:border-headz-red hover:bg-headz-red/5 sm:w-36 md:w-40"
                >
                  <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden bg-headz-cream border-2 border-headz-red/15 flex items-center justify-center">
                    {b.avatarUrl ? (
                      <Image
                        src={b.avatarUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-headz-red font-semibold text-xl">
                        {b.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-sm leading-tight">{b.name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep('service')}
              className="mt-6 text-sm text-headz-red hover:underline"
            >
              ← Change service
            </button>
          </div>
        )}

        {/* Step: Schedule — calendar + time slots (like a booking app) */}
        {step === 'schedule' && (
          <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-headz-cream to-white border-b border-black/10 px-4 sm:px-6 py-4">
              <h3 className="font-semibold text-lg text-headz-black">Pick a date &amp; time</h3>
              <p className="text-sm text-headz-gray mt-1">
                Select a day, then choose a slot. All times are <strong>Eastern (US)</strong>.
              </p>
            </div>
            <div className="p-4 sm:p-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
              <div className="text-center lg:text-left">
                <div className="inline-block mx-auto lg:mx-0">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((m) => {
                          const d = new Date(m.year, m.month - 1, 1)
                          return { year: d.getFullYear(), month: d.getMonth() }
                        })
                      }
                      className="p-2 rounded-lg hover:bg-black/5 text-headz-gray hover:text-black"
                      aria-label="Previous month"
                    >
                      ←
                    </button>
                    <span className="text-sm font-semibold">
                      {new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((m) => {
                          const d = new Date(m.year, m.month + 1, 1)
                          const max = new Date()
                          max.setMonth(max.getMonth() + MONTHS_AHEAD)
                          if (d > max) return m
                          return { year: d.getFullYear(), month: d.getMonth() }
                        })
                      }
                      className="p-2 rounded-lg hover:bg-black/5 text-headz-gray hover:text-black"
                      aria-label="Next month"
                    >
                      →
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs text-headz-gray mb-1 font-medium">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const first = new Date(calendarMonth.year, calendarMonth.month, 1)
                      const startPad = first.getDay()
                      const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate()
                      const cells: React.ReactNode[] = []
                      for (let i = 0; i < startPad; i++) cells.push(<div key={`pad-${i}`} />)
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = toDateString(new Date(calendarMonth.year, calendarMonth.month, day))
                        const isPast = dateStr < today
                        const isFuture = dateStr > maxBookStr
                        const isSelected = dateStr === date
                        const disabled = isPast || isFuture
                        cells.push(
                          <button
                            key={day}
                            type="button"
                            disabled={disabled}
                            onClick={() => !disabled && onSelectDate(dateStr)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-sm font-medium transition ${
                              disabled ? 'text-black/25 cursor-not-allowed' : 'hover:bg-headz-red/10'
                            } ${isSelected ? 'bg-headz-red text-white shadow-md hover:bg-headz-red' : ''}`}
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

              <div className="mt-8 lg:mt-0 border-t lg:border-t-0 lg:border-l border-black/10 pt-6 lg:pt-0 lg:pl-8">
                {!date ? (
                  <p className="text-headz-gray text-sm text-center lg:text-left">Select a date to see open times.</p>
                ) : loadingSlots ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-black/10 rounded w-1/3" />
                    <div className="h-10 bg-black/5 rounded-lg" />
                    <div className="h-10 bg-black/5 rounded-lg" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-headz-gray text-sm text-center lg:text-left">
                    No open slots on this day — try another date.
                  </p>
                ) : (
                  <div className="space-y-5">
                    <p className="text-sm font-medium text-headz-black">
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {groupedSlots.morning.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-headz-gray uppercase tracking-wider mb-2">Morning</p>
                        <div className="flex flex-wrap gap-2">
                          {groupedSlots.morning.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => onSelectSlot(slot)}
                              className={`min-w-[4.5rem] px-3 py-2 rounded-lg text-sm font-medium transition ${
                                selectedSlot === slot
                                  ? 'bg-headz-black text-white shadow'
                                  : 'bg-headz-cream text-headz-black border border-black/10 hover:border-headz-red'
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
                        <p className="text-[11px] font-semibold text-headz-gray uppercase tracking-wider mb-2">Afternoon</p>
                        <div className="flex flex-wrap gap-2">
                          {groupedSlots.afternoon.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => onSelectSlot(slot)}
                              className={`min-w-[4.5rem] px-3 py-2 rounded-lg text-sm font-medium transition ${
                                selectedSlot === slot
                                  ? 'bg-headz-black text-white shadow'
                                  : 'bg-headz-cream text-headz-black border border-black/10 hover:border-headz-red'
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
                        <p className="text-[11px] font-semibold text-headz-gray uppercase tracking-wider mb-2">Evening</p>
                        <div className="flex flex-wrap gap-2">
                          {groupedSlots.evening.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => onSelectSlot(slot)}
                              className={`min-w-[4.5rem] px-3 py-2 rounded-lg text-sm font-medium transition ${
                                selectedSlot === slot
                                  ? 'bg-headz-black text-white shadow'
                                  : 'bg-headz-cream text-headz-black border border-black/10 hover:border-headz-red'
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
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 bg-headz-cream/50 border-t border-black/10 flex flex-wrap gap-3 justify-between items-center">
              <button
                type="button"
                onClick={() => setStep('barber')}
                className="text-sm font-medium text-headz-red hover:underline"
              >
                ← Change barber
              </button>
              <button
                type="button"
                disabled={!selectedSlot}
                onClick={() => selectedSlot && setStep('details')}
                className="ml-auto px-5 py-2.5 rounded-lg bg-headz-red text-white text-sm font-semibold hover:bg-headz-redDark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className="rounded-xl bg-white border border-black/10 p-6 text-center md:text-left">
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
              <div>
                <span className="block text-sm font-medium mb-2">How will you pay?</span>
                <p className="text-xs text-headz-gray mb-2">So your barber knows what to expect at checkout.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      paymentMethod === 'cash'
                        ? 'border-headz-red bg-headz-red/10 text-headz-black'
                        : 'border-black/15 text-headz-gray hover:border-black/30'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      paymentMethod === 'card'
                        ? 'border-headz-red bg-headz-red/10 text-headz-black'
                        : 'border-black/15 text-headz-gray hover:border-black/30'
                    }`}
                  >
                    Card
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-headz-gray">
              {service?.name} with {barber?.name} · {date} at {selectedSlot ? formatSlot(selectedSlot) : ''}
            </p>

            {service && (
              <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left">
                <div className="flex gap-3">
                  <div className="shrink-0 text-amber-700 mt-0.5" aria-hidden>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                  </div>
                  <div className="min-w-0 space-y-3">
                    <p className="text-sm text-amber-950 leading-relaxed">
                      Please note: if you do not show up for your appointment and it has not been cancelled at least 2
                      hours in advance, a no-show fee of 20% of your service price will be applied on your next visit.
                      For <strong>{service.name}</strong> this would be{' '}
                      <strong>
                        {formatPrice(
                          parseFloat(
                            computeNoShowFeeFromServicePrice(
                              typeof service.price === 'string' ? service.price : String(service.price)
                            )
                          )
                        )}
                      </strong>
                      .
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer text-sm text-amber-950">
                      <input
                        type="checkbox"
                        checked={noShowAck}
                        onChange={(e) => setNoShowAck(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-amber-400 text-headz-red focus:ring-headz-red"
                      />
                      <span>I understand the no-show policy above.</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setStep('schedule')} className="px-4 py-2 border border-black/20 rounded-lg text-sm">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => void submitBooking()}
                disabled={submitting || !clientName.trim() || !noShowAck}
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
        <div className="md:hidden mt-6 flex justify-center">
          {summaryCard}
        </div>
      )}
    </div>
  )
}
