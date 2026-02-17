'use client'

import { useState, useEffect } from 'react'
import type { Barber, Service, Appointment } from '@/lib/db/schema'

const OPEN_HOUR = 9
const CLOSE_HOUR = 20
const SLOT_MINUTES = 30
const TOTAL_SLOTS = ((CLOSE_HOUR - OPEN_HOUR) * 60) / SLOT_MINUTES

function formatTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** 12-hour slot label e.g. "9:00 AM", "12:00 PM" */
function slotLabel(index: number) {
  const minutes = OPEN_HOUR * 60 + index * SLOT_MINUTES
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function ScheduleView({
  barbers,
  services,
  appointmentsByBarber,
  serviceMap,
  barberMap,
  defaultDate,
}: {
  barbers: Barber[]
  services: Service[]
  appointmentsByBarber: Record<string, Appointment[]>
  serviceMap: Record<string, Service>
  barberMap: Record<string, Barber>
  defaultDate: string
}) {
  const [date, setDate] = useState(defaultDate)
  const [appointments, setAppointments] = useState<Appointment[]>(
    Object.values(appointmentsByBarber).flat()
  )
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments?date=${date}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.data) setAppointments(json.data)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh when date changes (no manual Refresh button)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/appointments?date=${date}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.data) setAppointments(json.data)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [date])

  const byBarber = new Map<string, Appointment[]>()
  for (const a of appointments) {
    const list = byBarber.get(a.barberId) ?? []
    list.push(a)
    byBarber.set(a.barberId, list)
  }
  for (const b of barbers) {
    if (!byBarber.has(b.id)) byBarber.set(b.id, [])
  }
  barbers.forEach((b) => {
    const list = (byBarber.get(b.id) ?? []).sort(
      (x, y) => new Date(x.startAt).getTime() - new Date(y.startAt).getTime()
    )
    byBarber.set(b.id, list)
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-headz-black">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-black/15 rounded-lg bg-white text-headz-black focus:outline-none focus:ring-2 focus:ring-headz-red/30"
          />
        </label>
        {loading && (
          <span className="text-sm text-headz-gray">Loading…</span>
        )}
        <button
          type="button"
          onClick={() => setShowWalkIn(true)}
          className="ml-auto px-4 py-2 bg-headz-red text-white rounded-lg text-sm font-medium hover:bg-headz-redDark shadow-sm"
        >
          + Add walk-in
        </button>
        <CalendarExport date={date} barbers={barbers} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="bg-headz-black/[0.04] border-b border-black/10">
              <th className="w-44 p-4 text-left text-xs font-semibold uppercase tracking-wider text-headz-gray">
                Barber
              </th>
              {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
                <th key={i} className="p-2 text-center text-[10px] font-medium text-headz-gray w-16">
                  {slotLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {barbers.map((barber) => (
              <BarberRow
                key={barber.id}
                barber={barber}
                appointments={byBarber.get(barber.id) ?? []}
                serviceMap={serviceMap}
                date={date}
                onSelectAppointment={setSelectedAppointment}
              />
            ))}
          </tbody>
        </table>
      </div>

      {showWalkIn && (
        <WalkInForm
          barbers={barbers}
          services={services}
          date={date}
          onClose={() => setShowWalkIn(false)}
          onSaved={() => {
            setShowWalkIn(false)
            void refresh()
          }}
        />
      )}

      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          barbers={barbers}
          services={services}
          serviceMap={serviceMap}
          barberMap={barberMap}
          currentDate={date}
          onClose={() => setSelectedAppointment(null)}
          onUpdated={() => {
            void refresh()
            setSelectedAppointment(null)
          }}
        />
      )}
    </div>
  )
}

function BarberRow({
  barber,
  appointments,
  serviceMap,
  date,
  onSelectAppointment,
}: {
  barber: Barber
  appointments: Appointment[]
  serviceMap: Record<string, Service>
  date: string
  onSelectAppointment: (a: Appointment) => void
}) {
  const dayStart = new Date(`${date}T${String(OPEN_HOUR).padStart(2, '0')}:00:00-05:00`).getTime()
  const blocks: { startSlot: number; endSlot: number; appointment: Appointment }[] = []
  for (const a of appointments) {
    const start = new Date(a.startAt).getTime()
    const end = new Date(a.endAt).getTime()
    const startSlot = Math.max(0, Math.floor((start - dayStart) / (SLOT_MINUTES * 60 * 1000)))
    const endSlot = Math.min(TOTAL_SLOTS, Math.ceil((end - dayStart) / (SLOT_MINUTES * 60 * 1000)))
    blocks.push({ startSlot, endSlot, appointment: a })
  }

  const cells: React.ReactNode[] = []
  for (let i = 0; i < TOTAL_SLOTS; ) {
    const block = blocks.find((b) => i >= b.startSlot && i < b.endSlot)
    if (block && block.startSlot === i) {
      const span = Math.min(block.endSlot - block.startSlot, TOTAL_SLOTS - i)
      cells.push(
        <td
          key={i}
          colSpan={span}
          className="border-l border-black/5 bg-headz-red/10 p-2 align-top"
          title={`${block.appointment.clientName} · ${serviceMap[block.appointment.serviceId]?.name ?? '—'} · ${formatTime(block.appointment.startAt)} · Click for details`}
        >
          <button
            type="button"
            onClick={() => onSelectAppointment(block.appointment)}
            className="w-full text-left rounded-md px-2 py-1 bg-white/90 border border-headz-red/20 hover:border-headz-red/50 hover:shadow-sm transition cursor-pointer"
          >
            <div className="text-xs font-semibold text-headz-black truncate">
              {block.appointment.clientName}
            </div>
            <div className="text-[10px] text-headz-gray truncate mt-0.5">
              {serviceMap[block.appointment.serviceId]?.name ?? '—'} · {formatTime(block.appointment.startAt)}
            </div>
            {block.appointment.isWalkIn && (
              <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">
                Walk-in
              </span>
            )}
          </button>
        </td>
      )
      i += span
    } else if (!block) {
      cells.push(
        <td key={i} className="border-l border-black/5 p-1.5 align-top">
          <div className="rounded-md bg-headz-cream/80 py-1.5 text-center text-[10px] text-headz-gray">Open</div>
        </td>
      )
      i += 1
    } else {
      i += 1
    }
  }

  return (
    <tr className="border-b border-black/5 hover:bg-headz-cream/50 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-headz-red/30 bg-headz-black/5">
            {barber.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={barber.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-headz-red">
                {barber.name.charAt(0)}
              </span>
            )}
          </div>
          <span className="font-medium text-headz-black">{barber.name}</span>
        </div>
      </td>
      {cells}
    </tr>
  )
}

function CalendarExport({ date, barbers }: { date: string; barbers: Barber[] }) {
  const [open, setOpen] = useState(false)
  const tomorrow = (() => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const downloadUrl = (barberId: string | null) => {
    const params = new URLSearchParams({ date: tomorrow })
    if (barberId) params.set('barberId', barberId)
    return `/api/appointments/calendar?${params.toString()}`
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-4 py-2 border border-black/15 rounded-lg text-sm font-medium text-headz-black hover:bg-headz-cream/80"
      >
        📅 Send to calendars
      </button>
      {open && (
        <>
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-black/10 bg-white py-2 shadow-lg">
            <p className="px-3 py-1 text-xs text-headz-gray">Download ICS for next day (add to Google Calendar)</p>
            <a
              href={downloadUrl(null)}
              download={`headz-schedule-${tomorrow}.ics`}
              className="block px-3 py-2 text-sm hover:bg-black/5"
            >
              All barbers
            </a>
            {barbers.map((b) => (
              <a
                key={b.id}
                href={downloadUrl(b.id)}
                download={`headz-${b.slug}-${tomorrow}.ics`}
                className="block px-3 py-2 text-sm hover:bg-black/5 truncate"
              >
                {b.name}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10"
            aria-label="Close"
          />
        </>
      )}
    </div>
  )
}

function WalkInForm({
  barbers,
  services,
  date,
  onClose,
  onSaved,
}: {
  barbers: Barber[]
  services: Service[]
  date: string
  onClose: () => void
  onSaved: () => void
}) {
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? '')
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [slot, setSlot] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const service = services.find((s) => s.id === serviceId)
  const durationMinutes = service?.durationMinutes ?? 30

  const loadSlots = async () => {
    if (!barberId || !date) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/appointments/slots?barberId=${encodeURIComponent(barberId)}&date=${date}&durationMinutes=${durationMinutes}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load slots')
      const slots: string[] = json.slots ?? []
      setAvailableSlots(slots)
      if (slots.length) {
        setSlot((current) => (slots.includes(current) ? current : slots[0]))
      } else {
        setSlot('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load times')
      setAvailableSlots([])
      setSlot('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!barberId || !date) {
      setAvailableSlots([])
      setSlot('')
      return
    }
    void loadSlots()
  }, [barberId, date, durationMinutes])

  const submit = async () => {
    if (!clientName.trim() || !slot || !barberId || !serviceId || !service) {
      setError('Fill in name and pick a time.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          serviceId,
          durationMinutes: service.durationMinutes,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || undefined,
          startAt: slot,
          isWalkIn: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add walk-in')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add walk-in')
    } finally {
      setLoading(false)
    }
  }

  const noData = barbers.length === 0 || services.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Add walk-in</h3>
        {noData && (
          <p className="text-headz-gray text-sm mb-4">Add barbers and services in the database first.</p>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Barber</label>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="w-full px-3 py-2 border border-black/20 rounded-lg"
              disabled={noData}
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Service</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2 border border-black/20 rounded-lg"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Client name *</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Name"
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
            <label className="block text-sm font-medium mb-1">Time *</label>
            {loading ? (
              <p className="text-sm text-headz-gray">Loading times…</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-headz-gray">No available slots for this barber/date.</p>
            ) : (
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="w-full px-3 py-2 border border-black/20 rounded-lg bg-white text-headz-black"
              >
                {availableSlots.map((s) => (
                  <option key={s} value={s}>
                    {new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-black/20 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || !slot}
            className="flex-1 bg-headz-red text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? '…' : 'Add walk-in'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AppointmentDetailModal({
  appointment,
  barbers,
  services,
  serviceMap,
  barberMap,
  currentDate,
  onClose,
  onUpdated,
}: {
  appointment: Appointment
  barbers: Barber[]
  services: Service[]
  serviceMap: Record<string, Service>
  barberMap: Record<string, Barber>
  currentDate: string
  onClose: () => void
  onUpdated: () => void
}) {
  const [cancelling, setCancelling] = useState(false)
  const [rescheduleMode, setRescheduleMode] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(currentDate)
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([])
  const [rescheduleSlot, setRescheduleSlot] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const service = serviceMap[appointment.serviceId]
  const barber = barberMap[appointment.barberId]
  const durationMinutes = Math.round(
    (new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / 60000
  )

  const loadRescheduleSlots = async () => {
    if (!appointment.barberId || !rescheduleDate) return
    setRescheduleLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/appointments/slots?barberId=${encodeURIComponent(appointment.barberId)}&date=${rescheduleDate}&durationMinutes=${durationMinutes}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load slots')
      const slots: string[] = json.slots ?? []
      setRescheduleSlots(slots)
      setRescheduleSlot(slots[0] ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load times')
    } finally {
      setRescheduleLoading(false)
    }
  }

  useEffect(() => {
    if (rescheduleMode && rescheduleDate) void loadRescheduleSlots()
  }, [rescheduleMode, rescheduleDate])

  const handleCancel = async () => {
    if (!confirm('Cancel this appointment? The client will no longer see it on the schedule.')) return
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const msg = json.details ?? json.error ?? 'Failed to cancel'
        throw new Error(msg)
      }
      onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }

  const handleRescheduleConfirm = async () => {
    if (!rescheduleSlot) return
    setRescheduleLoading(true)
    setError(null)
    try {
      const startAt = new Date(rescheduleSlot)
      const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000)
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const msg = json.details ?? json.error ?? 'Failed to reschedule'
        throw new Error(msg)
      }
      onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reschedule')
    } finally {
      setRescheduleLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Appointment details</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-3 text-sm">
          <p><span className="font-medium text-headz-gray">Client</span> {appointment.clientName}</p>
          {appointment.clientEmail && (
            <p>
              <span className="font-medium text-headz-gray">Email</span>{' '}
              <a href={`mailto:${appointment.clientEmail}`} className="text-headz-red hover:underline">
                {appointment.clientEmail}
              </a>
            </p>
          )}
          {appointment.clientPhone && (
            <p>
              <span className="font-medium text-headz-gray">Phone</span>{' '}
              <a href={`tel:${appointment.clientPhone}`} className="text-headz-red hover:underline">
                {appointment.clientPhone}
              </a>
            </p>
          )}
          <p><span className="font-medium text-headz-gray">Service</span> {service?.name ?? '—'}</p>
          <p>
            <span className="font-medium text-headz-gray">Time</span>{' '}
            {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}
          </p>
          <p><span className="font-medium text-headz-gray">Barber</span> {barber?.name ?? '—'}</p>
          {appointment.isWalkIn && (
            <span className="inline-block text-xs bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">Walk-in</span>
          )}
        </div>

        {!rescheduleMode ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRescheduleMode(true)}
              className="px-4 py-2 border border-headz-red text-headz-red rounded-lg font-medium hover:bg-headz-red/5"
            >
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling…' : 'Cancel appointment'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-black/20 rounded-lg ml-auto">
              Close
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 border border-black/20 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New time</label>
              {rescheduleLoading ? (
                <p className="text-sm text-headz-gray">Loading times…</p>
              ) : rescheduleSlots.length === 0 ? (
                <p className="text-sm text-headz-gray">No slots available.</p>
              ) : (
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-black/20 rounded-lg"
                >
                  {rescheduleSlots.map((s) => (
                    <option key={s} value={s}>
                      {new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRescheduleMode(false)}
                className="px-4 py-2 border border-black/20 rounded-lg"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleRescheduleConfirm()}
                disabled={rescheduleLoading || !rescheduleSlot}
                className="flex-1 bg-headz-red text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
              >
                {rescheduleLoading ? '…' : 'Confirm reschedule'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
