'use client'

import { DM_Mono, DM_Sans, Playfair_Display } from 'next/font/google'
import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'] })

type ServiceRow = {
  id: string
  name: string
  price: string
  displayPrice?: string
  durationMinutes: number
  category: string | null
}

type BarberRow = { id: string; name: string; email: string; initials: string }

type ApptRow = {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  timeSlot: string
  barberId: string
  serviceId: string
  serviceName: string
  servicePrice: string
  barberName: string
  isWalkIn: boolean
}

type CartItem = { serviceId: string; name: string; price: string; qty: number }

type RecentTxn = {
  id: string
  customer: string
  total: number
  time: string
}

type SquareDeviceRow = {
  id: string
  deviceId: string | null
  deviceName: string
  status: string
}

type PosLine = { serviceId: string; name: string; price: string }

const TIP_PRESETS = [15, 20, 25]
const CATEGORY_FILTERS = ['all', 'kids', 'adults', 'seniors', 'add-ons'] as const
const CASH_QUICK = [20, 25, 30, 35, 40, 45, 50, 60, 75, 100]

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

function parsePrice(s: string) {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function formatTime(ts: string) {
  const t = ts.slice(0, 5)
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return ts
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

function PillTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? 'bg-headz-red text-white'
          : 'border border-neutral-600 bg-transparent text-neutral-500 hover:border-neutral-500'
      } ${dmMono.className}`}
    >
      {label}
    </button>
  )
}

function NumPad({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
  const handleKey = (k: string) => {
    if (k === '⌫') {
      onChange(value.slice(0, -1) || '0')
      return
    }
    if (k === '.' && value.includes('.')) return
    if (value === '0' && k !== '.') {
      onChange(k)
      return
    }
    if (value.length >= 9) return
    onChange(value + k)
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => handleKey(k)}
          className={`flex h-[52px] items-center justify-center rounded-lg border text-lg font-medium transition-colors ${
            k === '⌫'
              ? 'border-neutral-800 bg-[#2a1a1a] text-headz-red'
              : 'border-neutral-800 bg-[#1e1e1e] text-white'
          } ${dmMono.className}`}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

function ChargeModal({
  grandTotal,
  tip,
  subtotal,
  barberId,
  barberName,
  customerName,
  appointmentId,
  flatItems,
  pairedDevices,
  selectedDeviceId,
  onSelectDevice,
  settingsPath,
  onClose,
  onDone,
  onNewSale,
}: {
  grandTotal: number
  tip: number
  subtotal: number
  barberId: string
  barberName: string
  customerName: string
  appointmentId?: string
  flatItems: PosLine[]
  pairedDevices: SquareDeviceRow[]
  selectedDeviceId: string
  onSelectDevice: (squareDeviceId: string) => void
  settingsPath: string
  onClose: () => void
  onDone: () => void
  onNewSale: () => void
}) {
  const [method, setMethod] = useState<'card' | 'cash' | null>(null)
  const [cashEntered, setCashEntered] = useState('0')
  const [step, setStep] = useState<'select' | 'terminal_waiting' | 'done'>('select')
  const [email, setEmail] = useState('')
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [activeTxnId, setActiveTxnId] = useState<string | null>(null)
  const txnIdRef = useRef<string | null>(null)
  const [doneMeta, setDoneMeta] = useState<{
    paymentMethod: 'card' | 'cash'
    cardBrand?: string | null
    cardLastFour?: string | null
  } | null>(null)
  const [terminalError, setTerminalError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = grandTotal
  const cashChange = parseFloat(cashEntered) - total
  const serviceLabel = flatItems.map((i) => i.name).join(', ')
  const note = `${serviceLabel} — ${barberName}${customerName.trim() ? ` — ${customerName.trim()}` : ''}`

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopPoll()
    }
  }, [stopPoll])

  const pollTxnForCard = useCallback(async (txnId: string) => {
    for (let i = 0; i < 15; i++) {
      const r = await fetch(`/api/pos/transaction/${txnId}`, { credentials: 'include' })
      const j = await r.json().catch(() => ({}))
      const t = j.transaction as
        | { squarePaymentId?: string | null; cardBrand?: string | null; cardLastFour?: string | null }
        | undefined
      if (t?.squarePaymentId) {
        setDoneMeta({
          paymentMethod: 'card',
          cardBrand: t.cardBrand,
          cardLastFour: t.cardLastFour,
        })
        return
      }
      await new Promise((res) => setTimeout(res, 400))
    }
    setDoneMeta({ paymentMethod: 'card' })
  }, [])

  useEffect(() => {
    if (step !== 'terminal_waiting' || !checkoutId) return

    const tick = async () => {
      try {
        const r = await fetch(`/api/square/terminal-checkout/${encodeURIComponent(checkoutId)}`, {
          credentials: 'include',
        })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) return
        const st = j.status as string
        if (st === 'COMPLETED') {
          stopPoll()
          toast.success('Payment complete')
          setStep('done')
          const tid = txnIdRef.current
          if (tid) await pollTxnForCard(tid)
          else setDoneMeta({ paymentMethod: 'card' })
        } else if (st === 'CANCELED') {
          stopPoll()
          setStep('select')
          setCheckoutId(null)
          setActiveTxnId(null)
          txnIdRef.current = null
          toast.error('Payment cancelled')
        }
      } catch {
        /* ignore transient errors */
      }
    }

    void tick()
    pollRef.current = setInterval(() => void tick(), 3000)
    timeoutRef.current = setTimeout(() => {
      stopPoll()
      setTerminalError('Payment timed out. Try again or cancel.')
    }, 5 * 60 * 1000)

    return () => stopPoll()
  }, [step, checkoutId, pollTxnForCard, stopPoll])

  const runCard = async () => {
    if (!selectedDeviceId) return
    setTerminalError(null)
    const createRes = await fetch('/api/pos/create-transaction', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barberId,
        customerName: customerName.trim() || 'Walk-in',
        appointmentId,
        items: flatItems,
        subtotal,
        tipAmount: tip,
        total,
        paymentMethod: 'card',
      }),
    })
    const createJson = await createRes.json().catch(() => ({}))
    if (!createRes.ok) throw new Error(createJson.error || 'Could not start sale')

    const transactionId = createJson.id as string
    txnIdRef.current = transactionId
    setActiveTxnId(transactionId)

    const tcRes = await fetch('/api/square/terminal-checkout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: selectedDeviceId,
        amountCents: Math.round(total * 100),
        transactionId,
        note,
        tipEnabled: false,
      }),
    })
    const tcJson = await tcRes.json().catch(() => ({}))
    if (!tcRes.ok) throw new Error(tcJson.error || 'Terminal checkout failed')

    setCheckoutId(tcJson.checkoutId as string)
    setStep('terminal_waiting')
  }

  const cancelTerminal = async () => {
    if (!checkoutId) return
    stopPoll()
    try {
      await fetch(`/api/square/terminal-checkout/${encodeURIComponent(checkoutId)}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      /* ignore */
    }
    setCheckoutId(null)
    setActiveTxnId(null)
    txnIdRef.current = null
    setStep('select')
    toast('Payment cancelled')
  }

  const runCash = async () => {
    const createRes = await fetch('/api/pos/create-transaction', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barberId,
        customerName: customerName.trim() || 'Walk-in',
        appointmentId,
        items: flatItems,
        subtotal,
        tipAmount: tip,
        total,
        paymentMethod: 'cash',
      }),
    })
    const createJson = await createRes.json().catch(() => ({}))
    if (!createRes.ok) throw new Error(createJson.error || 'Could not start sale')

    const transactionId = createJson.id as string

    const cashRes = await fetch('/api/square/record-cash', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents: Math.round(total * 100),
        cashGivenCents: Math.round(parseFloat(cashEntered) * 100),
        transactionId,
        appointmentId,
        note,
      }),
    })
    const cashJson = await cashRes.json().catch(() => ({}))
    if (!cashRes.ok) throw new Error(cashJson.error || 'Cash recording failed')

    setDoneMeta({ paymentMethod: 'cash' })
    setStep('done')
    toast.success(`Cash recorded — ${fmt(total)}`)
  }

  const sendReceipt = async () => {
    const to = email.trim()
    if (!to) return
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const res = await fetch('/api/receipts/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        customerName: customerName.trim() || 'Customer',
        items: flatItems.map((i) => ({ name: i.name, price: i.price })),
        subtotal,
        tip,
        total,
        barber: barberName,
        date: today,
        paymentMethod: doneMeta?.paymentMethod === 'card' ? 'Card' : 'Cash',
      }),
    })
    if (res.ok) toast.success('Receipt sent')
    else toast.error('Could not send receipt')
  }

  const selectedDev = pairedDevices.find((d) => d.deviceId === selectedDeviceId)

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[20px] border border-neutral-800 bg-[#141414]">
        <div className="flex items-start justify-between border-b border-neutral-800 px-7 py-6">
          <div>
            <div className={`mb-1 text-[11px] uppercase tracking-widest text-neutral-500 ${dmMono.className}`}>
              Charge Customer
            </div>
            <div className={`text-[32px] font-bold text-white ${playfair.className}`}>{fmt(total)}</div>
            {tip > 0 && (
              <div className={`mt-1 text-[11px] text-neutral-500 ${dmMono.className}`}>includes {fmt(tip)} tip</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-lg text-neutral-400 hover:bg-neutral-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {step === 'select' && (
            <>
              <div className={`mb-4 text-[11px] uppercase tracking-wider text-neutral-500 ${dmMono.className}`}>
                Payment method
              </div>
              <div className="mb-6 grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'card' as const, icon: '💳', label: 'Card' },
                    { id: 'cash' as const, icon: '💵', label: 'Cash' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                      method === m.id
                        ? 'border-headz-red bg-headz-red/10'
                        : 'border-neutral-700 bg-[#1e1e1e] hover:border-neutral-600'
                    }`}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <span className={`text-xs font-semibold tracking-wide text-neutral-300 ${dmMono.className}`}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>

              {method === 'card' && (
                <div>
                  {pairedDevices.length === 0 || !selectedDeviceId ? (
                    <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-5 text-sm text-amber-100">
                      <p className="mb-3">No Square Terminal paired.</p>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = settingsPath
                        }}
                        className={`rounded-lg bg-headz-red px-4 py-2 text-xs font-bold uppercase text-white ${dmMono.className}`}
                      >
                        Go to Settings
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 rounded-xl border border-neutral-800 bg-[#1a1a1a] p-5">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                          <span className={`text-sm text-white ${dmMono.className}`}>{selectedDev?.deviceName ?? 'Terminal'}</span>
                          <span className={`ml-auto text-[10px] font-bold uppercase text-emerald-400 ${dmMono.className}`}>
                            Ready
                          </span>
                        </div>
                        <p className={`text-sm text-neutral-500 ${dmSans.className}`}>
                          Charge {fmt(total)} on the Square Terminal (tip included).
                        </p>
                      </div>
                      {pairedDevices.length > 1 && (
                        <div className="mb-4">
                          <div className={`mb-1 text-[10px] uppercase text-neutral-500 ${dmMono.className}`}>Device</div>
                          <select
                            value={selectedDeviceId}
                            onChange={(e) => onSelectDevice(e.target.value)}
                            className="w-full rounded-lg border border-neutral-700 bg-[#1e1e1e] px-3 py-2 text-sm text-white"
                          >
                            {pairedDevices.map((d) =>
                              d.deviceId ? (
                                <option key={d.id} value={d.deviceId}>
                                  {d.deviceName}
                                </option>
                              ) : null
                            )}
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void runCard().catch((e) => toast.error(e instanceof Error ? e.message : 'Failed'))}
                        className={`w-full rounded-[10px] bg-headz-red py-4 text-[15px] font-bold uppercase tracking-wide text-white ${dmMono.className}`}
                      >
                        Charge {fmt(total)} via Terminal
                      </button>
                    </>
                  )}
                </div>
              )}

              {method === 'cash' && (
                <div>
                  <div className={`mb-2 text-[11px] uppercase tracking-wider text-neutral-500 ${dmMono.className}`}>
                    Cash received
                  </div>
                  <div className="mb-3 rounded-[10px] border border-neutral-800 bg-[#0d0d0d] px-5 py-5 text-center">
                    <div
                      className={`text-4xl ${
                        parseFloat(cashEntered) < total && cashEntered !== '0' ? 'text-headz-red' : 'text-white'
                      } ${playfair.className}`}
                    >
                      ${cashEntered}
                    </div>
                    {parseFloat(cashEntered) >= total && (
                      <div className={`mt-2 text-sm text-emerald-400 ${dmMono.className}`}>Change: {fmt(cashChange)}</div>
                    )}
                  </div>
                  <div className="mb-3 flex flex-wrap justify-center gap-2">
                    {CASH_QUICK.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCashEntered(String(v))}
                        className={`rounded-lg border border-neutral-700 bg-[#1e1e1e] px-2.5 py-1.5 text-xs text-neutral-300 hover:border-neutral-600 ${dmMono.className}`}
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                  <NumPad value={cashEntered} onChange={setCashEntered} />
                  <button
                    type="button"
                    disabled={parseFloat(cashEntered) < total}
                    onClick={() =>
                      void runCash().catch((e) => toast.error(e instanceof Error ? e.message : 'Failed'))
                    }
                    className={`mt-4 w-full rounded-[10px] py-4 text-[15px] font-bold uppercase tracking-wide ${
                      parseFloat(cashEntered) >= total
                        ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                        : 'cursor-not-allowed bg-neutral-800 text-neutral-600'
                    } ${dmMono.className}`}
                  >
                    {parseFloat(cashEntered) >= total
                      ? `Confirm — Change ${fmt(cashChange)}`
                      : 'Enter amount'}
                  </button>
                </div>
              )}
            </>
          )}

          {step === 'terminal_waiting' && (
            <div className="py-6 text-center">
              {terminalError ? (
                <div className="space-y-4">
                  <p className={`text-sm text-headz-red ${dmSans.className}`}>{terminalError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setTerminalError(null)
                      setStep('select')
                      setCheckoutId(null)
                      setActiveTxnId(null)
                      txnIdRef.current = null
                    }}
                    className={`text-sm underline text-neutral-400 ${dmMono.className}`}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-xl border-2 border-headz-red/60 bg-[#1a1a1a] text-2xl ${dmMono.className}`}
                  >
                    ▢
                  </div>
                  <p className={`text-base text-white ${playfair.className}`}>Waiting for customer…</p>
                  <p className={`mt-2 text-xs text-neutral-500 ${dmMono.className}`}>
                    {serviceLabel} · {fmt(total)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void cancelTerminal()}
                    className={`mt-10 text-[11px] text-neutral-500 underline ${dmMono.className}`}
                  >
                    Cancel payment
                  </button>
                </>
              )}
            </div>
          )}

          {step === 'done' && doneMeta && (
            <div>
              <div className="mb-7 text-center">
                <div
                  className={`mx-auto mb-4 flex h-16 w-16 animate-[scale-in_0.35s_ease-out] items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-950/50 text-3xl text-emerald-400`}
                  style={{ animation: 'none' }}
                >
                  ✓
                </div>
                <div className={`text-[22px] text-white ${playfair.className}`}>Payment complete</div>
                <div className={`mt-2 text-sm text-neutral-400 ${dmMono.className}`}>
                  {fmt(total)} · {doneMeta.paymentMethod === 'card' ? 'Card' : 'Cash'}
                </div>
                {doneMeta.paymentMethod === 'card' && doneMeta.cardBrand && doneMeta.cardLastFour && (
                  <div className={`mt-2 inline-block rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300 ${dmMono.className}`}>
                    {doneMeta.cardBrand} ···· {doneMeta.cardLastFour}
                  </div>
                )}
              </div>
              <div className={`mb-2 text-[11px] uppercase tracking-wider text-neutral-500 ${dmMono.className}`}>
                Email receipt
              </div>
              <div className="mb-5 flex gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className={`min-w-0 flex-1 rounded-lg border border-neutral-700 bg-[#1e1e1e] px-3 py-3 text-sm text-white placeholder:text-neutral-600 ${dmSans.className}`}
                />
                <button
                  type="button"
                  onClick={() => void sendReceipt()}
                  className={`rounded-lg bg-headz-red px-4 text-xs font-bold uppercase text-white ${dmMono.className}`}
                >
                  Send
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`mb-3 w-full text-center text-xs text-neutral-500 hover:text-neutral-400 ${dmMono.className}`}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => {
                  onDone()
                  onClose()
                }}
                className={`mb-2 w-full rounded-[10px] bg-headz-red py-3.5 text-sm font-bold uppercase text-white ${dmMono.className}`}
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  onNewSale()
                  onClose()
                }}
                className={`w-full rounded-[10px] border border-neutral-700 py-3.5 text-sm text-neutral-300 hover:bg-neutral-800 ${dmMono.className}`}
              >
                New sale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function HeadzPOS({ onBack }: { onBack?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const dashboardHome = pathname?.includes('/dashboard/barber') ? '/dashboard/barber' : '/dashboard'
  const settingsPath = pathname?.includes('/dashboard/barber') ? '/dashboard' : '/dashboard/settings/devices'

  const goDashboard = () => {
    if (onBack) onBack()
    else router.push(dashboardHome)
  }

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [today, setToday] = useState('')
  const [services, setServices] = useState<ServiceRow[]>([])
  const [barbers, setBarbers] = useState<BarberRow[]>([])
  const [todayAppts, setTodayAppts] = useState<ApptRow[]>([])
  const [mode, setMode] = useState<'walkin' | 'appointment'>('walkin')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedAppt, setSelectedAppt] = useState<ApptRow | null>(null)
  const [barberId, setBarberId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [tipMode, setTipMode] = useState<'percent' | 'dollar'>('percent')
  const [tipPercent, setTipPercent] = useState<number | null>(null)
  const [customTip, setCustomTip] = useState('0')
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('all')
  const [showCharge, setShowCharge] = useState(false)
  const [recent, setRecent] = useState<RecentTxn[]>([])
  const [pairedDevices, setPairedDevices] = useState<SquareDeviceRow[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/pos/bootstrap', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load POS data')
      setToday(json.today ?? '')
      setServices(json.services ?? [])
      const bs = json.barbers ?? []
      setBarbers(bs)
      setTodayAppts(json.appointments ?? [])
      setBarberId((prev) => prev || bs[0]?.id || '')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    async function loadDevices() {
      try {
        const r = await fetch('/api/square/devices', { credentials: 'include' })
        const j = await r.json().catch(() => ({}))
        if (!r.ok || cancelled) return
        const list = (j.devices ?? []) as SquareDeviceRow[]
        const paired = list.filter((d) => d.status === 'paired' && d.deviceId)
        setPairedDevices(paired)
        setSelectedDeviceId((prev) => {
          if (prev && paired.some((p) => p.deviceId === prev)) return prev
          return paired[0]?.deviceId ?? ''
        })
      } catch {
        /* ignore */
      }
    }
    void loadDevices()
    const id = setInterval(() => void loadDevices(), 45000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0),
    [cart]
  )
  const tipAmount =
    tipMode === 'percent'
      ? tipPercent != null
        ? subtotal * (tipPercent / 100)
        : 0
      : parseFloat(customTip) || 0
  const total = subtotal + tipAmount

  const filteredServices = useMemo(() => {
    if (selectedCategory === 'all') return services
    return services.filter((s) => (s.category || 'adults').toLowerCase() === selectedCategory)
  }, [services, selectedCategory])

  const selectedBarber = barbers.find((b) => b.id === barberId)

  const addToCart = (s: ServiceRow) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.serviceId === s.id)
      if (existing) {
        return prev.map((i) => (i.serviceId === s.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { serviceId: s.id, name: s.name, price: s.price, qty: 1 }]
    })
  }

  const updateQty = (serviceId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.serviceId === serviceId ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    )
  }

  const removeLine = (serviceId: string) => {
    setCart((prev) => prev.filter((i) => i.serviceId !== serviceId))
  }

  const pickAppointment = (a: ApptRow) => {
    setSelectedAppt(a)
    setCustomerName(a.customerName)
    setBarberId(a.barberId)
    setCart([{ serviceId: a.serviceId, name: a.serviceName, price: a.servicePrice, qty: 1 }])
  }

  const clearCart = () => {
    setSelectedAppt(null)
    setCart([])
    setCustomerName('')
    setTipPercent(null)
    setCustomTip('0')
  }

  const flatItems = useMemo(
    () =>
      cart.flatMap((i) =>
        Array.from({ length: i.qty }, () => ({
          serviceId: i.serviceId,
          name: i.name,
          price: i.price,
        }))
      ),
    [cart]
  )

  const finishSaleSuccess = useCallback(async () => {
    const name = customerName.trim() || 'Walk-in'
    setRecent((r) => [
      {
        id: `${Date.now()}`,
        customer: name,
        total,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...r,
    ])
    clearCart()
    await refresh()
  }, [customerName, total, refresh])

  if (loading) {
    return (
      <div
        className={`fixed inset-0 z-[120] flex items-center justify-center bg-[#0e0e0e] text-neutral-400 ${dmSans.className}`}
      >
        Loading POS…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={`fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-[#0e0e0e] p-6 text-red-300 ${dmSans.className}`}>
        {loadError}
        <button type="button" className="underline" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    )
  }

  const noBarbers = services.length > 0 && barbers.length === 0
  const hasTerminal = pairedDevices.length > 0 && !!selectedDeviceId

  return (
    <div
      className={`fixed inset-0 z-[120] flex h-[100dvh] flex-col overflow-hidden bg-[#0e0e0e] text-white md:flex-row ${dmSans.className}`}
    >
      <div className="flex w-full shrink-0 flex-col border-b border-neutral-800 md:h-full md:w-[360px] md:border-b-0 md:border-r md:border-neutral-800 bg-[#111]">
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-5">
          <div>
            <div className={`text-lg font-black tracking-tight text-white ${playfair.className}`}>
              HEADZ AIN&apos;T READY
            </div>
            <div className={`mt-0.5 text-[10px] uppercase tracking-[0.14em] text-headz-red ${dmMono.className}`}>
              Jackson Heights, Queens
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={goDashboard}
              className={`rounded-lg border border-neutral-700 bg-[#1e1e1e] px-3 py-1.5 text-[11px] text-neutral-400 hover:bg-neutral-800 ${dmMono.className}`}
            >
              ← ADMIN
            </button>
            <button
              type="button"
              onClick={() => router.push(settingsPath)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${
                hasTerminal
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-400'
                  : 'border-amber-800 bg-amber-950/40 text-amber-200'
              } ${dmMono.className}`}
            >
              <span className={hasTerminal ? 'text-emerald-400' : 'text-amber-400'}>
                {hasTerminal ? '●' : '⚠'}
              </span>
              {hasTerminal ? 'Terminal ready' : 'No terminal'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          <PillTab
            label="Walk-in"
            active={mode === 'walkin'}
            onClick={() => {
              setMode('walkin')
              clearCart()
            }}
          />
          <PillTab
            label="Appointment"
            active={mode === 'appointment'}
            onClick={() => {
              setMode('appointment')
              clearCart()
            }}
          />
        </div>

        {mode === 'appointment' && (
          <div className="max-h-48 overflow-y-auto px-6 pt-4">
            <div className={`mb-2 text-[10px] uppercase tracking-wider text-neutral-600 ${dmMono.className}`}>
              Today&apos;s bookings
            </div>
            {todayAppts.length === 0 ? (
              <p className="text-sm text-neutral-500">No pending appointments today.</p>
            ) : (
              todayAppts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickAppointment(a)}
                  className={`mb-2 w-full rounded-[10px] border px-3.5 py-3 text-left transition-colors ${
                    selectedAppt?.id === a.id
                      ? 'border-headz-red bg-[#1a0e0e]'
                      : 'border-neutral-800 bg-[#161616] hover:border-neutral-700'
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-semibold">{a.customerName}</div>
                      <div className={`mt-0.5 text-[11px] text-neutral-500 ${dmMono.className}`}>
                        {a.serviceName} · {a.barberName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[11px] text-neutral-500 ${dmMono.className}`}>
                        {formatTime(a.timeSlot)}
                      </div>
                      <div className={`mt-0.5 text-sm text-headz-red ${playfair.className}`}>
                        {fmt(parsePrice(a.servicePrice))}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {mode === 'walkin' && (
          <div className="px-6 pt-4">
            <div className={`mb-2 text-[10px] uppercase tracking-wider text-neutral-600 ${dmMono.className}`}>
              Customer name (optional)
            </div>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in customer…"
              className="mb-4 w-full rounded-lg border border-neutral-800 bg-[#161616] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600"
            />
            <div className={`mb-2 text-[10px] uppercase tracking-wider text-neutral-600 ${dmMono.className}`}>
              Barber
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBarberId(b.id)}
                  className={`flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors ${
                    barberId === b.id
                      ? 'border-headz-red bg-[#1a0e0e]'
                      : 'border-neutral-800 bg-[#161616]'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                      barberId === b.id ? 'bg-headz-red' : 'bg-neutral-700'
                    } ${dmMono.className}`}
                  >
                    {(b.initials ?? '?').slice(0, 2)}
                  </div>
                  <span className={`text-[10px] text-neutral-400 ${dmMono.className}`}>{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className={`mb-2 text-[10px] uppercase tracking-wider text-neutral-600 ${dmMono.className}`}>
            Order {cart.length > 0 && <span className="text-headz-red">({cart.length})</span>}
          </div>
          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mb-2 text-3xl opacity-20">✂</div>
              <div className={`text-[11px] text-neutral-600 ${dmMono.className}`}>No services added</div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.serviceId}
                className="flex items-center gap-2 border-b border-[#1e1e1e] py-2.5 first:pt-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{item.name}</div>
                  <div className={`text-[13px] text-headz-red ${playfair.className}`}>{fmt(parsePrice(item.price))}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQty(item.serviceId, -1)}
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-neutral-700 bg-[#1e1e1e] text-neutral-400"
                  >
                    −
                  </button>
                  <span className={`min-w-[16px] text-center text-[13px] ${dmMono.className}`}>{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.serviceId, 1)}
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-neutral-700 bg-[#1e1e1e] text-neutral-400"
                  >
                    +
                  </button>
                </div>
                <div className={`min-w-[52px] text-right text-sm ${playfair.className}`}>
                  {fmt(parsePrice(item.price) * item.qty)}
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(item.serviceId)}
                  className="p-1 text-neutral-600 hover:text-white"
                  aria-label="Remove line"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-[#1e1e1e] px-6 py-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className={`text-[10px] uppercase tracking-wider text-neutral-600 ${dmMono.className}`}>Tip</span>
              <div className="flex gap-1.5">
                <PillTab label="%" active={tipMode === 'percent'} onClick={() => setTipMode('percent')} />
                <PillTab label="$" active={tipMode === 'dollar'} onClick={() => setTipMode('dollar')} />
              </div>
            </div>
            {tipMode === 'percent' ? (
              <div className="flex gap-2">
                {[...TIP_PRESETS, 0].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTipPercent(p === 0 ? null : p)}
                    className={`flex-1 rounded-lg border px-1 py-2 text-center transition-colors ${
                      tipPercent === p || (p === 0 && tipPercent == null)
                        ? 'border-headz-red bg-headz-red text-white'
                        : 'border-neutral-700 bg-[#1e1e1e] text-neutral-400'
                    } ${dmMono.className}`}
                  >
                    <div className="text-xs font-semibold">{p === 0 ? 'None' : `${p}%`}</div>
                    {p > 0 && (
                      <div className="mt-0.5 text-[10px] opacity-80">{fmt(subtotal * (p / 100))}</div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-xl text-neutral-500 ${playfair.className}`}>$</span>
                <input
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={`flex-1 rounded-lg border border-neutral-800 bg-[#1e1e1e] py-2 text-center text-xl text-white ${playfair.className}`}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-auto border-t border-neutral-800 px-6 py-5">
          <div className="flex justify-between text-xs text-neutral-500">
            <span className={dmMono.className}>Subtotal</span>
            <span className={dmMono.className}>{fmt(subtotal)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="mt-1 flex justify-between text-xs text-neutral-500">
              <span className={dmMono.className}>Tip</span>
              <span className={dmMono.className}>{fmt(tipAmount)}</span>
            </div>
          )}
          <div className="mt-3 flex items-end justify-between border-t border-neutral-800 pt-3">
            <span className={`text-lg text-white ${playfair.className}`}>Total</span>
            <span className={`text-[22px] font-bold ${playfair.className}`}>{fmt(total)}</span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => cart.length > 0 && setShowCharge(true)}
            className={`mt-4 w-full rounded-xl py-[18px] text-base font-bold uppercase tracking-wide text-white transition-colors ${
              cart.length > 0 ? 'bg-headz-red hover:bg-headz-redDark' : 'cursor-not-allowed bg-neutral-800 text-neutral-600'
            } ${dmMono.className}`}
          >
            {cart.length > 0 ? `Charge ${fmt(total)}` : '—'}
          </button>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className={`mt-2 w-full py-2.5 text-xs text-neutral-500 hover:text-neutral-400 ${dmMono.className}`}
            >
              Clear order
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#1e1e1e] px-4 md:px-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  selectedCategory === c
                    ? 'bg-headz-red text-white'
                    : 'border border-neutral-700 text-neutral-500 hover:border-neutral-600'
                } ${dmMono.className}`}
              >
                {c === 'all' ? 'all' : c}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <span className={`text-[11px] text-neutral-600 ${dmMono.className}`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            {selectedBarber && (
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-headz-red text-[10px] font-bold text-white ${dmMono.className}`}
                >
                  {(selectedBarber.initials ?? '?').slice(0, 2)}
                </div>
                <span className={`text-[11px] text-neutral-500 ${dmMono.className}`}>{selectedBarber.name}</span>
              </div>
            )}
          </div>
        </div>

        {noBarbers && (
          <div className="border-b border-amber-900/50 bg-amber-950/40 px-4 py-2 text-xs text-amber-200 md:px-8">
            No linked barber accounts — add staff under Settings → Barbers.
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {services.length === 0 ? (
            <p className="text-sm text-neutral-500">Add services under Dashboard → Services.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
              {filteredServices.map((s) => {
                const inCart = cart.find((i) => i.serviceId === s.id)
                const qty = inCart?.qty ?? 0
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addToCart(s)}
                    className={`relative flex flex-col gap-2.5 rounded-[14px] border p-[18px] text-left transition-colors ${
                      qty > 0
                        ? 'border-headz-red bg-[#1a0e0e]'
                        : 'border-neutral-800 bg-[#141414] hover:border-neutral-700'
                    }`}
                  >
                    {qty > 0 && (
                      <span
                        className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-headz-red text-[11px] font-bold text-white ${dmMono.className}`}
                      >
                        {qty}
                      </span>
                    )}
                    <span className="text-[15px] font-semibold leading-snug">{s.name}</span>
                    <div className="flex items-end justify-between gap-2">
                      <span className={`text-[22px] font-bold text-headz-red ${playfair.className}`}>
                        {s.displayPrice ?? fmt(parsePrice(s.price))}
                      </span>
                      <span className={`text-[10px] text-neutral-600 ${dmMono.className}`}>{s.durationMinutes}m</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div className="flex shrink-0 gap-3 overflow-x-auto border-t border-[#1e1e1e] px-4 py-3 md:px-8">
            <span className={`shrink-0 self-center text-[10px] uppercase tracking-wider text-neutral-600 ${dmMono.className}`}>
              Recent
            </span>
            {recent.slice(0, 8).map((t) => (
              <div
                key={t.id}
                className="shrink-0 rounded-lg border border-neutral-800 bg-[#141414] px-3.5 py-2 whitespace-nowrap"
              >
                <div className="text-xs font-medium">{t.customer}</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`text-sm text-headz-red ${playfair.className}`}>{fmt(t.total)}</span>
                  <span className={`text-[10px] text-neutral-600 ${dmMono.className}`}>{t.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCharge && barberId && (
        <ChargeModal
          grandTotal={total}
          tip={tipAmount}
          subtotal={subtotal}
          barberId={barberId}
          barberName={selectedBarber?.name ?? 'Staff'}
          customerName={customerName}
          appointmentId={selectedAppt?.id}
          flatItems={flatItems}
          pairedDevices={pairedDevices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          settingsPath={settingsPath}
          onClose={() => setShowCharge(false)}
          onDone={() => void finishSaleSuccess()}
          onNewSale={() => clearCart()}
        />
      )}
    </div>
  )
}
