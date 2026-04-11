import Link from 'next/link'

type Props = { searchParams: Promise<{ reason?: string }> }

/** Shown when staff verification can't reach the database. Session stays valid — user can retry. */
export default async function StaffServiceUnavailablePage({ searchParams }: Props) {
  const { reason } = await searchParams
  const isConfig = reason === 'config'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f0e8] p-4">
      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-1 text-sm font-medium text-headz-black/70 transition hover:text-headz-black"
      >
        ← Back to site
      </Link>
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-headz-red">Headz</p>
        <h1 className="text-2xl font-bold text-headz-black">Can&apos;t open the staff area right now</h1>

        {isConfig ? (
          <p className="text-sm leading-relaxed text-headz-gray">
            The shop&apos;s systems aren&apos;t fully connected yet. Ask whoever manages your website or point-of-sale
            setup to finish the server configuration, then try again.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-headz-gray">
            We couldn&apos;t finish loading your staff profile. This is usually temporary — you may still be signed in.
            Wait a moment, then try again. If it keeps happening, contact your manager or shop admin.
          </p>
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex justify-center rounded-xl bg-headz-red px-4 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-md shadow-headz-red/20 transition-colors hover:bg-headz-redDark"
          >
            Try again
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex justify-center rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-semibold text-headz-black transition-colors hover:bg-black/[0.03]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
