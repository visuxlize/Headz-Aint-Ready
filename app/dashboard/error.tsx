'use client'

import { useEffect } from 'react'
import { ErrorScreen } from '@/components/errors/ErrorScreen'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error?.digest ?? error)
  }, [error])

  return (
    <ErrorScreen
      title="Something went wrong"
      description="This dashboard page couldn’t load. You can try again or go back to the overview."
      primaryLabel="Try again"
      onPrimary={() => reset()}
      secondaryHref="/dashboard"
      secondaryLabel="Dashboard home"
      tertiaryHref="/"
      tertiaryLabel="Public site"
    />
  )
}
