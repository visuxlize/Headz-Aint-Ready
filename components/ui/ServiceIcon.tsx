import { cn } from '@/lib/utils/cn'

export type ServiceCategory = 'cuts' | 'beard' | 'add-ons'

export function ServiceIcon({
  category,
  size = 20,
  className,
}: {
  category: ServiceCategory
  size?: number
  className?: string
}) {
  const s = size
  const common = cn('inline-block shrink-0 text-current', className)
  if (category === 'beard') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M4 8c2-3 6-4 8-4s6 1 8 4v6c0 3-2 6-5 7l-1 3h-4l-1-3c-3-1-5-4-5-7V8z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (category === 'add-ons') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M5 19l1-2 2 1-1 2-2-1zm12 0l1-2 2 1-1 2-2-1z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
      <path
        d="M8.5 6.5c1.5-1 3.5-1 5 0l6 4c.8.5 1.2 1.4 1 2.3-.2.9-.9 1.6-1.8 1.7h-2M8.5 6.5L4 10.5c-.9.1-1.6.8-1.8 1.7-.2.9.2 1.8 1 2.3l6 4c1.5 1 3.5 1 5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="1.5" fill="currentColor" />
      <circle cx="17" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}
