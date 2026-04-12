'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type HeadzFormSelectOption = {
  value: string
  label: string
  avatarUrl?: string | null
}

function initialsFromLabel(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return `${p[0]![0]}${p[1]![0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function Avatar({
  label,
  avatarUrl,
  size = 'md',
}: {
  label: string
  avatarUrl?: string | null
  size?: 'sm' | 'md'
}) {
  const sm = size === 'sm'
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn(
          'shrink-0 rounded-full border border-headz-red/20 object-cover',
          sm ? 'h-6 w-6' : 'h-8 w-8'
        )}
      />
    )
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-headz-red/12 font-bold text-headz-red',
        sm ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[11px]'
      )}
    >
      {initialsFromLabel(label).slice(0, 2)}
    </span>
  )
}

type HeadzFormSelectProps = {
  value: string
  onChange: (value: string) => void
  options: HeadzFormSelectOption[]
  placeholder?: string
  disabled?: boolean
  /** Avatar + name in trigger and rows (barber picker). */
  variant?: 'default' | 'barber'
  className?: string
  /** Smaller padding for inline edit panels. */
  size?: 'md' | 'sm'
}

export function HeadzFormSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  variant = 'default',
  className,
  size = 'md',
}: HeadzFormSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const btnId = useId()

  const selected = options.find((o) => o.value === value) ?? null
  const showBarber = variant === 'barber'

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const sm = size === 'sm'
  const triggerPad = sm ? 'py-2 pl-3 pr-9' : 'py-3 pl-3.5 pr-11'
  const textSize = sm ? 'text-sm' : 'text-sm'

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        id={btnId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            close()
            return
          }
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            if (!disabled) {
              e.preventDefault()
              setOpen(true)
            }
          }
        }}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border-2 border-black/[0.08] bg-white text-left font-medium text-headz-black shadow-inner shadow-black/[0.02] transition-colors',
          triggerPad,
          textSize,
          'focus:border-headz-red/50 focus:outline-none focus:ring-4 focus:ring-headz-red/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-headz-red/40 ring-4 ring-headz-red/10'
        )}
      >
        {showBarber && selected ? (
          <>
            <Avatar label={selected.label} avatarUrl={selected.avatarUrl} size={sm ? 'sm' : 'md'} />
            <span className="min-w-0 flex-1 truncate">{selected.label}</span>
          </>
        ) : selected ? (
          <span className="min-w-0 flex-1 truncate">{selected.label}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-headz-gray">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            'pointer-events-none absolute text-headz-gray transition-transform',
            sm ? 'right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2' : 'right-3.5 top-1/2 h-4 w-4 -translate-y-1/2',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg shadow-black/10 ring-1 ring-black/5"
          role="presentation"
        >
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={btnId}
            className="max-h-60 overflow-y-auto py-1"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-headz-red/10 font-semibold text-headz-black'
                      : 'text-headz-black hover:bg-headz-cream/80'
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt.value)
                    close()
                  }}
                >
                  {showBarber ? (
                    <Avatar label={opt.label} avatarUrl={opt.avatarUrl} size="sm" />
                  ) : null}
                  <span className="min-w-0 flex-1 leading-snug">{opt.label}</span>
                  {isSelected ? (
                    <span className="shrink-0 text-headz-red" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
