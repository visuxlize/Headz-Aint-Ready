'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-headz-red tracking-[0.2em] text-sm uppercase mb-2">Error</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-headz-black mb-3">
          Something went wrong
        </h1>
        <p className="text-headz-gray text-sm mb-8">
          This page couldn’t be loaded. You can try again or head back home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 bg-headz-red text-white rounded-lg font-medium hover:bg-headz-redDark transition"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 border border-headz-black/20 text-headz-black rounded-lg font-medium hover:bg-headz-cream/80 transition"
          >
            Back to home
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
