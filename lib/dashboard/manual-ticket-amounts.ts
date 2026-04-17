import type { PosLineItem } from '@/lib/db/schema'

export const CUSTOM_AMOUNT_LINE_LABEL = 'Custom amount' as const

function parseNum(v: string | null | undefined): number {
  if (v == null) return 0
  const n = Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

export function customExtraFromItems(items: PosLineItem[] | null | undefined): number {
  if (!items?.length) return 0
  let sum = 0
  for (const it of items) {
    if (it.name === CUSTOM_AMOUNT_LINE_LABEL) {
      sum += parseNum(String(it.price))
    }
  }
  return sum
}

export function buildManualTicketLines(
  svcRow: { id: string; name: string; price: unknown },
  tip: number,
  opts: { addCustomAmount?: boolean; customAmount?: number }
): { items: PosLineItem[]; serviceAmount: number; customExtra: number; subtotal: number; total: number } {
  const serviceAmount = Number.parseFloat(String(svcRow.price))
  const rawExtra =
    opts.addCustomAmount === true && opts.customAmount != null && Number.isFinite(opts.customAmount)
      ? opts.customAmount
      : 0
  const customExtra = Math.min(Math.max(0, rawExtra), 50_000)
  const subtotal = serviceAmount + customExtra
  const total = subtotal + tip
  const items: PosLineItem[] = [
    { serviceId: svcRow.id, name: svcRow.name, price: serviceAmount.toFixed(2) },
  ]
  if (customExtra > 0) {
    items.push({ name: CUSTOM_AMOUNT_LINE_LABEL, price: customExtra.toFixed(2) })
  }
  return { items, serviceAmount, customExtra, subtotal, total }
}
