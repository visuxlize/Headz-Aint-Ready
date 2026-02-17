import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-headz-red tracking-[0.2em] text-sm uppercase mb-2">404</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-headz-black mb-3">
          Page not found
        </h1>
        <p className="text-headz-gray text-sm mb-8">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-headz-red text-white rounded-lg font-medium hover:bg-headz-redDark transition"
          >
            Back to home
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-headz-black/20 text-headz-black rounded-lg font-medium hover:bg-headz-cream/80 transition"
          >
            Book now
          </Link>
        </div>
        <p className="mt-8 text-sm text-headz-gray">
          <Link href="/dashboard" className="text-headz-red hover:underline">
            Staff dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}
