import { SQUIRE_PUBLIC_BOOKING_URL } from '@/lib/squire/public-booking'

export const metadata = {
  title: "Book | Headz Ain't Ready",
  description: "Book your haircut at Headz Ain't Ready, Jackson Heights.",
}

export default function BookPage() {
  return (
    <div className="min-h-screen bg-headz-black flex flex-col">
      <div className="bg-headz-black border-b border-white/10 px-4 py-4 text-center">
        <p className="text-headz-red text-xs uppercase tracking-[0.25em] font-semibold mb-1">
          Jackson Heights, Queens
        </p>
        <h1 className="font-headz-display text-white text-2xl sm:text-3xl">Book Your Cut</h1>
        <p className="text-white/50 text-sm mt-1">
          Powered by Squire — your time is locked in the moment you confirm.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <p className="max-w-md text-sm text-white/60 leading-relaxed">
          Booking runs on Squire in a secure window. We can&apos;t embed their calendar here (their site blocks
          iframes), so tap below to pick your service, barber, and time.
        </p>
        <a
          href={SQUIRE_PUBLIC_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-headz-red px-10 py-4 text-base font-bold uppercase tracking-wide text-white shadow-lg shadow-headz-red/25 transition hover:bg-headz-redDark sm:text-lg"
        >
          Book in Squire
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <p className="mt-6 text-xs text-white/40">Opens getsquire.com in a new tab</p>
        <a href="tel:+17184296841" className="mt-10 text-sm text-headz-red/90 underline-offset-4 hover:underline">
          Prefer to call? (718) 429-6841
        </a>
      </div>
    </div>
  )
}
