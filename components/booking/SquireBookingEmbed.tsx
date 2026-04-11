'use client'

/** Thin iframe wrapper for the public Squire booking flow (used where a client embed is needed). */
export default function SquireBookingEmbed() {
  return (
    <div className="relative w-full" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <iframe
        src="https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1"
        title="Book at Headz Ain't Ready"
        className="absolute inset-0 h-full w-full border-0"
        allow="payment; camera; microphone"
        loading="eager"
      />
    </div>
  )
}
