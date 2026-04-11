'use client'

import 'react-day-picker/style.css'

import Image from 'next/image'
import { Fragment, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { Calendar, Clock, Scissors, User } from 'lucide-react'
import { generateTimeSlots, getMaxBookableDate, getMinBookableDate } from '@/lib/booking/time-slots'
import { SQUIRE } from '@/lib/squire-config'
import { formatServicePriceDisplay } from '@/lib/services/format-service-price'
import { cn } from '@/lib/utils/cn'

export interface BookingService {
  id: string
  name: string
  price: string
  priceDisplayOverride: string | null
  durationMinutes: number
}

export interface BookingBarber {
  id: string
  name: string
  avatarUrl: string | null
}

type Draft = {
  step: 1 | 2 | 3 | 4
  serviceId: string | null
  barberId: string | null
  /** True when guest explicitly chose "Any Barber" (barberId stays null). */
  anyBarber: boolean
  date: Date | null
  timeSlot: string | null
  popupOpened: boolean
}

const STEPS = ['Service', 'Barber', 'Date & Time', 'Confirm'] as const

export function NativeBookingFlow({
  services,
  barbers,
}: {
  services: BookingService[]
  barbers: BookingBarber[]
}) {
  const [draft, setDraft] = useState<Draft>({
    step: 1,
    serviceId: null,
    barberId: null,
    anyBarber: false,
    date: null,
    timeSlot: null,
    popupOpened: false,
  })

  const selectedService = useMemo(
    () => services.find((s) => s.id === draft.serviceId) ?? null,
    [services, draft.serviceId]
  )
  const selectedBarber = useMemo(
    () => (draft.barberId ? barbers.find((b) => b.id === draft.barberId) ?? null : null),
    [barbers, draft.barberId]
  )

  const timeSlots = useMemo(() => (draft.date ? generateTimeSlots(draft.date) : []), [draft.date])

  const goBack = () => {
    setDraft((d) => ({
      ...d,
      step: Math.max(1, d.step - 1) as Draft['step'],
    }))
  }

  const openSquirePopup = () => {
    const url = SQUIRE.bookingUrl
    const w = 480
    const h = 700
    const left = Math.max(0, (window.screen.width - w) / 2 + (window.screenX ?? 0))
    const top = Math.max(0, (window.screen.height - h) / 2 + (window.screenY ?? 0))
    const feat = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
    const popup = window.open(url, 'squire-booking', feat)
    if (!popup) window.open(url, '_blank', 'noopener,noreferrer')
    setDraft((p) => ({ ...p, popupOpened: true }))
  }

  const minD = getMinBookableDate()
  const maxD = getMaxBookableDate()

  return (
    <div className="text-headz-black">
      <style>{`
        .rdp-selected-headz {
          background-color: #c41e3a !important;
          color: white !important;
          border-radius: 9999px;
        }
        .rdp-day:hover:not([disabled]):not([aria-disabled='true']) .rdp-day_button:not([disabled]):not([aria-disabled='true']) {
          background-color: rgba(196, 30, 58, 0.1) !important;
          border-radius: 9999px;
        }
      `}</style>

      {/* Progress */}
      <div className="border-b border-black/10 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Draft['step']
            const completed = draft.step > n
            const active = draft.step === n
            return (
              <Fragment key={label}>
                {i > 0 ? (
                  <div
                    className={cn(
                      'h-px min-w-[12px] flex-1 self-center',
                      draft.step > i ? 'bg-headz-red' : 'bg-black/10'
                    )}
                    aria-hidden
                  />
                ) : null}
                <div className="flex min-w-0 flex-col items-center gap-1">
                  <div
                    className={cn(
                      'h-3 w-3 shrink-0 rounded-full transition',
                      completed && 'bg-headz-red',
                      active && 'bg-headz-red ring-4 ring-headz-red/20',
                      !completed && !active && 'bg-black/10'
                    )}
                  />
                  <span
                    className={cn(
                      'max-w-[5.5rem] text-center text-xs leading-tight',
                      active && 'font-semibold text-headz-red',
                      completed && !active && 'text-headz-black',
                      !completed && !active && 'text-headz-gray'
                    )}
                  >
                    {label}
                  </span>
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6">
        {draft.step > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="mb-6 text-sm text-headz-gray transition hover:text-headz-black"
          >
            ← Back
          </button>
        )}

        {draft.step === 1 && (
          <div>
            <h2 className="mb-6 text-center font-headz-display text-xl text-headz-black sm:text-2xl">
              What can we do for you?
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {services.map((s) => {
                const sel = draft.serviceId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, serviceId: s.id, step: 2 }))}
                    className={cn(
                      'cursor-pointer rounded-xl border-2 p-4 text-left transition',
                      sel ? 'border-headz-red bg-headz-red/5' : 'border-black/10 hover:border-headz-red/40'
                    )}
                  >
                    <p className="text-sm font-semibold text-headz-black">{s.name}</p>
                    <p className="mt-1 text-headz-red font-bold">{formatServicePriceDisplay(s)}</p>
                    <p className="mt-1 text-xs text-headz-gray">{s.durationMinutes} min</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {draft.step === 2 && (
          <div>
            <h2 className="mb-6 text-center font-headz-display text-xl text-headz-black sm:text-2xl">
              Who&apos;s cutting today?
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    barberId: null,
                    anyBarber: true,
                    step: 3,
                  }))
                }
                className={cn(
                  'flex flex-col items-center rounded-xl border-2 p-4 text-center transition',
                  draft.anyBarber && draft.barberId === null
                    ? 'border-headz-red bg-headz-red/5'
                    : 'border-black/10 hover:border-headz-red/40'
                )}
              >
                <span className="text-3xl text-headz-red" aria-hidden>
                  ✂
                </span>
                <p className="mt-2 text-sm font-semibold">Any Barber</p>
                <p className="mt-1 text-xs text-headz-gray">Next available</p>
              </button>
              {barbers.map((b) => {
                const sel = !draft.anyBarber && draft.barberId === b.id
                const initials = b.name
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        barberId: b.id,
                        anyBarber: false,
                        step: 3,
                      }))
                    }
                    className={cn(
                      'flex flex-col items-center rounded-xl border-2 p-4 text-center transition',
                      sel ? 'border-headz-red bg-headz-red/5' : 'border-black/10 hover:border-headz-red/40'
                    )}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-headz-red/10">
                      {b.avatarUrl ? (
                        <Image src={b.avatarUrl} alt={b.name} fill className="object-cover" sizes="56px" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-bold text-headz-red">
                          {initials.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold">{b.name}</p>
                    <p className="mt-1 text-xs text-headz-gray">Master Barber</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {draft.step === 3 && (
          <div>
            <h2 className="mb-6 text-center font-headz-display text-xl text-headz-black sm:text-2xl">
              When works for you?
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="flex justify-center">
                <DayPicker
                  mode="single"
                  selected={draft.date ?? undefined}
                  onSelect={(d) => {
                    setDraft((prev) => ({
                      ...prev,
                      date: d ?? null,
                      timeSlot: null,
                    }))
                  }}
                  disabled={[{ before: minD }, { after: maxD }]}
                  className="text-headz-black"
                  modifiersClassNames={{ selected: 'rdp-selected-headz' }}
                />
              </div>
              <div>
                {!draft.date && <p className="text-sm text-headz-gray">Select a date first</p>}
                {draft.date && timeSlots.length === 0 && (
                  <p className="text-sm text-headz-gray">No available times for this date. Try another day.</p>
                )}
                {draft.date && timeSlots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => {
                      const sel = draft.timeSlot === slot
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, timeSlot: slot }))}
                          className={cn(
                            'rounded-lg border px-2 py-2 text-sm transition',
                            sel
                              ? 'border-2 border-headz-red bg-headz-red font-semibold text-white'
                              : 'border border-black/10 hover:border-headz-red/50'
                          )}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                )}
                {draft.date && draft.timeSlot ? (
                  <button
                    type="button"
                    className="mt-8 w-full rounded-xl bg-headz-black px-8 py-3 font-semibold text-white sm:w-auto"
                    onClick={() => setDraft((d) => ({ ...d, step: 4 }))}
                  >
                    Next →
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {draft.step === 4 && selectedService && (
          <div>
            <h2 className="mb-6 text-center font-headz-display text-xl text-headz-black sm:text-2xl">
              Your appointment
            </h2>
            <div className="space-y-4 rounded-2xl border border-black/10 bg-[#fafaf8] p-6">
              <div className="flex gap-3">
                <Scissors className="mt-0.5 h-5 w-5 shrink-0 text-headz-red" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Service</p>
                  <p className="font-semibold text-headz-black">
                    {selectedService.name} · {formatServicePriceDisplay(selectedService)}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <User className="mt-0.5 h-5 w-5 shrink-0 text-headz-red" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Barber</p>
                  <p className="font-semibold text-headz-black">
                    {draft.anyBarber ? 'Any Available Barber' : selectedBarber?.name ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-headz-red" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Date</p>
                  <p className="font-semibold text-headz-black">
                    {draft.date ? format(draft.date, 'EEEE, MMMM d') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-headz-red" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-headz-gray">Time</p>
                  <p className="font-semibold text-headz-black">{draft.timeSlot ?? '—'}</p>
                </div>
              </div>
            </div>

            {!draft.popupOpened ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, step: 3 }))}
                  className="text-sm text-headz-gray hover:text-headz-black"
                >
                  ← Edit
                </button>
                <button
                  type="button"
                  onClick={openSquirePopup}
                  className="w-full rounded-xl bg-headz-red px-10 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-headz-red/20 transition hover:bg-headz-redDark sm:ml-auto sm:w-auto"
                >
                  Complete Booking →
                </button>
              </div>
            ) : (
              <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <p className="font-semibold text-emerald-800">✓ Booking window opened!</p>
                <p className="mt-1 text-sm text-emerald-700">Complete your booking in the Squire window.</p>
                <button
                  type="button"
                  onClick={openSquirePopup}
                  className="mt-3 text-sm text-emerald-800 underline underline-offset-2"
                >
                  Didn&apos;t open? Click here
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
