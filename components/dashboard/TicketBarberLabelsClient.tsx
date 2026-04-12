'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { TicketBarberLabelRow } from '@/lib/dashboard/ticket-barber-labels-query'
import { publicMessageForFailedResponse } from '@/lib/errors/public-message'
import { cn } from '@/lib/utils/cn'

type FormRow = TicketBarberLabelRow & {
  ticketNameInput: string
  ticketAvatarInput: string
}

function toFormRows(initial: TicketBarberLabelRow[]): FormRow[] {
  return initial.map((r) => ({
    ...r,
    ticketNameInput: r.ticketDisplayName ?? '',
    ticketAvatarInput: r.ticketDisplayAvatarUrl ?? '',
  }))
}

export function TicketBarberLabelsClient({ initial }: { initial: TicketBarberLabelRow[] }) {
  const [rows, setRows] = useState<FormRow[]>(() => toFormRows(initial))
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const update = (id: string, patch: Partial<Pick<FormRow, 'ticketNameInput' | 'ticketAvatarInput'>>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const uploadAvatar = async (barberId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller')
      return
    }
    setUploadingId(barberId)
    try {
      const fd = new FormData()
      fd.set('barberId', barberId)
      fd.set('file', file)
      const res = await fetch('/api/dashboard/tickets/barber-avatar', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok) {
        toast.error(j.error ?? publicMessageForFailedResponse(res))
        return
      }
      if (j.url) {
        update(barberId, { ticketAvatarInput: j.url })
        toast.success('Avatar uploaded')
      }
    } finally {
      setUploadingId(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const barbers = rows.map((r) => ({
        id: r.id,
        ticketDisplayName: r.ticketNameInput.trim() === '' ? null : r.ticketNameInput.trim(),
        ticketDisplayAvatarUrl: r.ticketAvatarInput.trim() === '' ? null : r.ticketAvatarInput.trim(),
      }))
      const res = await fetch('/api/dashboard/tickets/barber-labels', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbers }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(j.error ?? publicMessageForFailedResponse(res))
        return
      }
      toast.success('Saved')
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          ticketDisplayName: r.ticketNameInput.trim() === '' ? null : r.ticketNameInput.trim(),
          ticketDisplayAvatarUrl: r.ticketAvatarInput.trim() === '' ? null : r.ticketAvatarInput.trim(),
        }))
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-12 pt-2 sm:pt-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/tickets"
            className="text-sm font-medium text-headz-gray transition hover:text-headz-red"
          >
            ← Back to Tickets
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-bold text-headz-black">Barbers</h1>
          <p className="mt-1 max-w-xl text-sm text-headz-gray">
            Names and avatars here apply only to the Tickets page (dropdown and today’s list). They do not change
            the marketing site, booking, staff accounts, or profile photos elsewhere.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-headz-red bg-headz-red px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-headz-red/90 disabled:opacity-50'
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save all
        </button>
      </div>

      <ul className="space-y-4">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-2xl border border-headz-red/15 bg-gradient-to-b from-white to-headz-cream/30 p-5 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-headz-gray">{r.slug}</p>
            <p className="mt-1 text-sm text-headz-gray">
              Marketing / site name:{' '}
              <span className="font-medium text-headz-black">{r.marketingName}</span>
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-headz-gray">
                  Tickets dropdown name
                </label>
                <input
                  value={r.ticketNameInput}
                  onChange={(e) => update(r.id, { ticketNameInput: e.target.value })}
                  placeholder={`Default: ${r.marketingName}`}
                  className="mt-1 w-full rounded-xl border-2 border-black/[0.08] bg-white px-3 py-2.5 text-sm text-headz-black placeholder:text-headz-gray/70"
                />
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <label className="text-[10px] font-bold uppercase tracking-wider text-headz-gray sm:text-right">
                  Tickets avatar (max 5MB)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-black/[0.08] bg-white px-3 py-2 text-sm text-headz-black transition hover:bg-headz-cream/50">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploadingId === r.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) void uploadAvatar(r.id, f)
                    }}
                  />
                  {uploadingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-headz-gray" />
                  ) : null}
                  {uploadingId === r.id ? 'Uploading…' : 'Choose image'}
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              {r.ticketAvatarInput.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.ticketAvatarInput.trim()}
                  alt=""
                  className="h-16 w-16 rounded-full border border-headz-red/20 object-cover"
                />
              ) : r.marketingAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.marketingAvatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-full border border-headz-red/20 object-cover opacity-60"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-headz-black/5 text-xs text-headz-gray">
                  —
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          No barbers matched the ticket allowlist. Check that slugs in the database match{' '}
          <code className="rounded bg-black/5 px-1">lib/dashboard/manual-ticket-barbers.ts</code>.
        </p>
      ) : null}
    </div>
  )
}
