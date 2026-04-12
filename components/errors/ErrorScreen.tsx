import type { ReactNode } from 'react'
import Link from 'next/link'

type Variant = 'error' | 'not-found'

export function ErrorScreen({
  variant = 'error',
  title,
  description,
  primaryLabel = 'Try again',
  onPrimary,
  secondaryHref = '/',
  secondaryLabel = 'Back to home',
  tertiaryHref,
  tertiaryLabel,
  children,
}: {
  variant?: Variant
  title: string
  description: string
  primaryLabel?: string
  onPrimary?: () => void
  secondaryHref?: string
  secondaryLabel?: string
  tertiaryHref?: string
  tertiaryLabel?: string
  children?: ReactNode
}) {
  const badge = variant === 'not-found' ? '404' : 'Error'
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] px-4 py-16 flex flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.06] bg-white/80 px-8 py-10 text-center shadow-lg shadow-black/[0.04] backdrop-blur-sm">
        <p className="text-headz-red mb-2 text-xs font-semibold uppercase tracking-[0.22em]">{badge}</p>
        <h1 className="font-headz-display text-headz-black mb-3 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-headz-gray mb-8 text-sm leading-relaxed">{description}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {onPrimary ? (
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-headz-red px-6 py-3 text-sm font-semibold text-white shadow-md shadow-headz-red/20 transition hover:brightness-95"
            >
              {primaryLabel}
            </button>
          ) : null}
          <Link
            href={secondaryHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-headz-black/15 bg-white px-6 py-3 text-sm font-semibold text-headz-black transition hover:bg-headz-cream/60"
          >
            {secondaryLabel}
          </Link>
        </div>
        {children ? <div className="mt-6 flex flex-col gap-2">{children}</div> : null}
        {tertiaryHref && tertiaryLabel ? (
          <p className="mt-8 text-sm text-headz-gray">
            <Link href={tertiaryHref} className="font-medium text-headz-red underline-offset-2 hover:underline">
              {tertiaryLabel}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
