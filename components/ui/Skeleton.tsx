'use client'

import { cn } from '@/lib/utils/cn'

const shimmer = 'animate-shimmer rounded-md'

export function Skeleton({
  className,
  variant = 'line',
}: {
  className?: string
  variant?: 'line' | 'card' | 'avatar' | 'chart-bar'
}) {
  const base = cn(shimmer, 'rounded-md', className)
  if (variant === 'card') {
    return <div className={cn(base, 'h-32 w-full rounded-xl')} />
  }
  if (variant === 'avatar') {
    return <div className={cn(base, 'h-10 w-10 rounded-full')} />
  }
  if (variant === 'chart-bar') {
    return <div className={cn(base, 'h-24 w-full rounded-lg')} />
  }
  return <div className={cn(base, 'h-3 w-full')} />
}
