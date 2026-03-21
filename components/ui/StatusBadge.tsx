import { cn } from '@/lib/utils/cn'

export type StatusBadgeVariant =
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'approved'
  | 'denied'

const styles: Record<StatusBadgeVariant, string> = {
  pending: 'bg-amber-500 text-amber-950',
  completed: 'bg-emerald-500 text-emerald-950',
  cancelled: 'bg-gray-500 text-gray-50',
  no_show: 'bg-red-500 text-red-950',
  approved: 'bg-emerald-500 text-emerald-950',
  denied: 'bg-red-500 text-red-950',
}

export function StatusBadge({ status, className }: { status: StatusBadgeVariant; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wide',
        styles[status],
        className
      )}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
