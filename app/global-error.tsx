'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Root error UI when the shell fails. Keep copy generic — log details only to the console.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error?.digest ?? 'unknown', error)
  }, [error])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; min-height: 100vh; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
        `}</style>
      </head>
      <body suppressHydrationWarning style={{ margin: 0, minHeight: '100vh', background: '#f5f0e8', color: '#0c0c0c' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid rgba(12,12,12,0.08)',
              background: 'rgba(255,255,255,0.9)',
              padding: '2.25rem 1.75rem',
              boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
            }}
          >
            <p style={{ color: '#c41e3a', letterSpacing: '0.2em', fontSize: '11px', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
              Error
            </p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: 1.25 }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              Please try again. If this keeps happening, open the site in a private window or disable browser extensions that modify the page.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: '#c41e3a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  padding: '0.75rem 1.25rem',
                  border: '1px solid rgba(12,12,12,0.18)',
                  color: '#0c0c0c',
                  borderRadius: '10px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
