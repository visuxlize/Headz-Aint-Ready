'use client'

import { ExternalLink } from 'lucide-react'

export function AdminScheduleSquireClient() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between shrink-0">
        <div>
          <h1 className="font-serif text-2xl font-bold text-headz-black">Schedule</h1>
          <p className="text-headz-gray text-sm mt-1 max-w-2xl">
            Live view from Squire — manage directly in the Squire app for changes.
          </p>
        </div>
        <a
          href="https://app.getsquire.com/schedule"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-headz-red px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-headz-redDark shrink-0"
        >
          Open in Squire
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-black/10 bg-[#111]"
        style={{ height: 'calc(100vh - 160px)' }}
      >
        <iframe
          src="https://app.getsquire.com/schedule"
          title="Squire schedule"
          className="h-full w-full border-0"
          style={{ minHeight: 'calc(100vh - 160px)' }}
        />
      </div>

      <div className="rounded-xl border border-headz-red/20 bg-headz-black/[0.03] p-4 text-sm text-headz-black">
        <p className="font-medium text-headz-black">Can&apos;t see the calendar?</p>
        <p className="mt-1 text-headz-gray">
          Some networks block embedding the Squire app in an iframe. Open the full schedule in Squire instead.
        </p>
        <a
          href="https://app.getsquire.com/schedule"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-headz-red font-semibold hover:underline"
        >
          Open Squire Schedule <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  )
}
