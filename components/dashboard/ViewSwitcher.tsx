'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const STORAGE_KEY = 'headz-dashboard-view-mode'

export type DashboardViewMode =
  | 'schedule_list'
  | 'day'
  | '3day'
  | 'week'
  | 'month'

const labels: Record<DashboardViewMode, string> = {
  schedule_list: 'Schedule View (list)',
  day: 'Day View',
  '3day': '3 Days View',
  week: 'Week View',
  month: 'Month View',
}

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: DashboardViewMode
  onChange: (v: DashboardViewMode) => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
  }, [value])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#1A1A1A] px-3 py-2 text-sm font-medium text-white"
      >
        {labels[value]}
        <ChevronDown className="w-4 h-4 opacity-70" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close" onClick={() => setOpen(false)} />
          <ul className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-white/10 bg-[#111] py-1 shadow-xl">
            {(Object.keys(labels) as DashboardViewMode[]).map((k) => (
              <li key={k}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                  onClick={() => {
                    onChange(k)
                    setOpen(false)
                  }}
                >
                  {labels[k]}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
