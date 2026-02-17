'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; min-height: 100vh; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
        `}</style>
      </head>
      <body
        style={{
          minHeight: '100vh',
          background: 'var(--background, #f5f0e8)',
          color: 'var(--foreground, #0c0c0c)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <p style={{ color: '#c41e3a', letterSpacing: '0.2em', fontSize: '12px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Error
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0c0c0c', marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2rem' }}>
            The app couldn’t handle this request. Try again or go back to the home page.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '0.625rem 1.25rem',
                background: '#c41e3a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '0.625rem 1.25rem',
                border: '1px solid rgba(12,12,12,0.2)',
                color: '#0c0c0c',
                borderRadius: '8px',
                fontWeight: 500,
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Back to home
            </a>
          </div>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <pre
              style={{
                marginTop: '2rem',
                background: 'rgba(12,12,12,0.06)',
                padding: '1rem',
                overflow: 'auto',
                fontSize: '12px',
                borderRadius: '8px',
                textAlign: 'left',
              }}
            >
              {error.message}
            </pre>
          )}
        </div>
      </body>
    </html>
  )
}
