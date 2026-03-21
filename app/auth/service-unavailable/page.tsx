import Link from 'next/link'

/** Shown when staff verification can't reach the database. Session stays valid — user can retry. */
export default function StaffServiceUnavailablePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-headz-black">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white/80 hover:text-white text-sm font-medium transition flex items-center gap-1"
      >
        ← Back to site
      </Link>
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-white">Can&apos;t reach the shop right now</h1>
        <p className="text-white/75 text-sm leading-relaxed">
          We couldn&apos;t finish signing you in to the staff area. This is usually temporary — your account is still
          signed in.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex justify-center rounded-lg bg-headz-red hover:bg-headz-redDark px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Try again
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex justify-center rounded-lg border border-white/25 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
