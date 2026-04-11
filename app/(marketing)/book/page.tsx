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
      <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 96px)' }}>
        <iframe
          src="https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1"
          title="Book at Headz Ain't Ready"
          className="w-full h-full absolute inset-0 border-0"
          style={{ minHeight: 'calc(100vh - 96px)' }}
          allow="payment; camera; microphone"
          loading="eager"
        />
      </div>
    </div>
  )
}
