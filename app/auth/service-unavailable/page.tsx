import Link from 'next/link'

type Props = { searchParams: Promise<{ reason?: string }> }

/** Shown when staff verification can't reach the database. Session stays valid — user can retry. */
export default async function StaffServiceUnavailablePage({ searchParams }: Props) {
  const { reason } = await searchParams
  const isConfig = reason === 'config'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-headz-black p-4">
      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-1 text-sm font-medium text-white/80 transition hover:text-white"
      >
        ← Back to site
      </Link>
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-white">Can&apos;t reach the shop right now</h1>

        {isConfig ? (
          <div className="space-y-3 text-left text-sm leading-relaxed text-white/80">
            <p>
              The server doesn&apos;t have a working <code className="text-white/90">DATABASE_URL</code>. Staff
              sign-in needs it to verify the allowlist and your profile.
            </p>
            <p className="font-medium text-amber-200/95">If you deploy on Netlify</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open <strong>Site configuration → Environment variables</strong> (or Site settings → Environment
                variables).
              </li>
              <li>
                Add <code className="text-white/90">DATABASE_URL</code> with the same Postgres URI as in your local{' '}
                <code className="text-white/90">.env.local</code> (Supabase → Database → Connection string, usually
                Transaction pool / port <strong>6543</strong>).
              </li>
              <li>
                Add any other server secrets you use locally (e.g. Square, Resend) if those features should work in
                production.
              </li>
              <li>
                <strong>Deploys → Trigger deploy → Deploy site</strong> so new variables apply.
              </li>
            </ol>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-white/75">
            We couldn&apos;t finish signing you in to the staff area. This is usually temporary — your account is still
            signed in. If it keeps happening, confirm <code className="text-white/90">DATABASE_URL</code> on your host
            matches Supabase and trigger a new deploy after changing env vars.
          </p>
        )}

        <p className="text-xs text-white/50">
          Diagnostic: open{' '}
          <a href="/api/health" className="text-headz-red underline hover:text-headz-redDark">
            /api/health
          </a>{' '}
          — <code className="text-white/70">hasDatabaseUrl</code> and <code className="text-white/70">dbOk</code> should
          be true.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex justify-center rounded-lg bg-headz-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-headz-redDark"
          >
            Try again
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex justify-center rounded-lg border border-white/25 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
