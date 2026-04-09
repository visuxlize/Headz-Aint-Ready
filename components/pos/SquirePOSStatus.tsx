type SquirePOSStatusProps = {
  connected: boolean
  /** Use `dark` on barber / headz-black surfaces; default fits light admin backgrounds. */
  variant?: 'light' | 'dark'
}

export function SquirePOSStatus({ connected, variant = 'light' }: SquirePOSStatusProps) {
  const dark = variant === 'dark'

  if (connected) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
          dark
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            : 'border-emerald-700/25 bg-emerald-50 text-emerald-900'
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${dark ? 'bg-emerald-400' : 'bg-emerald-600'}`}
          aria-hidden
        />
        Squire POS Active
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
        dark ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-300 bg-red-50 text-red-900'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${dark ? 'bg-red-400' : 'bg-red-600'}`} aria-hidden />
      Configure Squire API Key
    </span>
  )
}
