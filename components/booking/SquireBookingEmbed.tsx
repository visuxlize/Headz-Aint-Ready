'use client'

import { SQUIRE_PUBLIC_BOOKING_URL } from '@/lib/squire/public-booking'

/** Opens Squire booking in a new tab — getsquire.com sends X-Frame-Options: DENY, so iframe embeds always fail. */
export default function SquireBookingEmbed() {
  return (
    <div className="rounded-2xl border border-white/10 bg-headz-black px-6 py-10 text-center">
      <p className="text-sm text-white/60">
        Booking opens on Squire (iframes aren&apos;t allowed by their site). Use the button below.
      </p>
      <a
        href={SQUIRE_PUBLIC_BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-headz-red px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-headz-redDark"
      >
        Book in Squire
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}
