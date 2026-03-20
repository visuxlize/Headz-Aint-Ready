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
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
  loading?: boolean
  danger?: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-black/10">
        <h3 className="text-lg font-semibold text-headz-black">{title}</h3>
        <p className="text-sm text-headz-gray mt-2">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-black/15 text-sm font-medium hover:bg-headz-cream/80"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-headz-red hover:bg-headz-redDark'
            }`}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
