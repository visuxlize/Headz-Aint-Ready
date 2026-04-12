import { ErrorScreen } from '@/components/errors/ErrorScreen'
import { SQUIRE } from '@/lib/squire-config'

export default function NotFound() {
  return (
    <ErrorScreen
      variant="not-found"
      title="Page not found"
      description="The page you’re looking for doesn’t exist or was moved."
      secondaryHref="/"
      secondaryLabel="Back to home"
      tertiaryHref="/dashboard"
      tertiaryLabel="Staff dashboard"
    >
      <a
        href={SQUIRE.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-headz-black/15 bg-white px-6 py-3 text-sm font-semibold text-headz-black transition hover:bg-headz-cream/60 sm:w-auto"
      >
        Book now
      </a>
    </ErrorScreen>
  )
}
