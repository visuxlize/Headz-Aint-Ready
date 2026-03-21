'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import 'react-day-picker/style.css'

type ViewMode = 'day' | '3day' | 'week' | 'month'

export function DateNavigator({
  date,
  viewMode,
  onChange,
}: {
  date: Date
  viewMode: ViewMode
  onChange: (d: Date) => void
}) {
  const [open, setOpen] = useState(false)

  function step(dir: -1 | 1) {
    const d = new Date(date)
    if (viewMode === 'day') d.setDate(d.getDate() + dir)
    else if (viewMode === '3day') d.setDate(d.getDate() + dir * 3)
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else if (viewMode === 'month') d.setMonth(d.getMonth() + dir)
    onChange(d)
  }

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => step(-1)}
        className="rounded-lg p-2 text-white/80 hover:bg-white/10"
        aria-label="Previous"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        {format(date, 'EEEE, MMMM d')}
        <span className="text-white/50">↓</span>
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        className="rounded-lg p-2 text-white/80 hover:bg-white/10"
        aria-label="Next"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-white/10 bg-[#1A1A1A] p-3 shadow-xl">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  onChange(d)
                  setOpen(false)
                }
              }}
              className="text-white"
            />
          </div>
        </>
      )}
    </div>
  )
}
