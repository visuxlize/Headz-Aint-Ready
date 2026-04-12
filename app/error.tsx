'use client'

import { useEffect } from 'react'
import { ErrorScreen } from '@/components/errors/ErrorScreen'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error?.digest ?? error)
  }, [error])

  return (
    <ErrorScreen
      title="Something went wrong"
      description="This page couldn’t load. You can try again or head back to the home page."
      primaryLabel="Try again"
      onPrimary={() => reset()}
      secondaryHref="/"
      secondaryLabel="Back to home"
      tertiaryHref="/dashboard"
      tertiaryLabel="Staff dashboard"
    />
  )
}
