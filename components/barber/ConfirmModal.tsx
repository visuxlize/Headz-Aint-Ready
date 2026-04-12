'use client'

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
  danger,
  overlayClassName,
  panelClassName,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
  loading?: boolean
  danger?: boolean
  /** e.g. `backdrop-blur-sm` */
  overlayClassName?: string
  /** Override panel card styles (dashboard void dialogs) */
  panelClassName?: string
}) {
  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 ${overlayClassName ?? ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className={
          panelClassName ??
          'w-full max-w-md rounded-xl border border-black/10 bg-white p-6 shadow-xl'
        }
      >
        <h3 id="confirm-modal-title" className="font-serif text-lg font-bold text-headz-black">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-headz-gray">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold text-headz-black transition hover:bg-headz-cream/90 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
              danger
                ? 'bg-red-600 shadow-red-900/20 hover:bg-red-700'
                : 'bg-headz-red shadow-headz-red/25 hover:bg-headz-redDark'
            }`}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
