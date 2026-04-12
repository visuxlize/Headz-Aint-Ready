/**
 * Admin / inline surfaces — friendly message only (no raw API output).
 */
export function InlineErrorAlert({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-left text-sm text-red-950 shadow-sm"
    >
      <span className="mt-0.5 shrink-0 text-red-600" aria-hidden>
        !
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{message}</p>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-800/80 hover:bg-red-100/80"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  )
}
