'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  BarChart2,
  CalendarDays,
  CalendarX,
  DollarSign,
  Scissors,
  Tablet,
  TrendingUp,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const items = [
  { href: '/dashboard?view=overview', label: 'Overview', icon: BarChart2, match: 'overview' as const },
  { href: '/dashboard?view=calendar', label: 'Calendar', icon: CalendarDays, match: 'calendar' as const },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarDays, match: 'path' as const, path: '/dashboard/schedule' },
  { href: '/dashboard/time-off', label: 'Time Off', icon: CalendarX, match: 'path' as const, path: '/dashboard/time-off' },
  { href: '/dashboard/settings/services', label: 'Services', icon: Scissors, match: 'path' as const, path: '/dashboard/settings/services' },
  { href: '/dashboard/settings/devices', label: 'Devices', icon: Tablet, match: 'path' as const, path: '/dashboard/settings/devices' },
  { href: '/dashboard/settings/barbers', label: 'Barbers', icon: Users, match: 'path' as const, path: '/dashboard/settings/barbers' },
  { href: '/dashboard/payments', label: 'Payments', icon: DollarSign, match: 'path' as const, path: '/dashboard/payments' },
  { href: '/dashboard/no-shows', label: 'No-Shows', icon: AlertCircle, match: 'path' as const, path: '/dashboard/no-shows' },
  { href: '/dashboard/reports', label: 'Reports', icon: TrendingUp, match: 'path' as const, path: '/dashboard/reports' },
]

export function DashboardNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = searchParams.get('view') ?? 'overview'

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        let active = false
        if (item.match === 'overview') {
          active = pathname === '/dashboard' && view !== 'calendar'
        } else if (item.match === 'calendar') {
          active = pathname === '/dashboard' && view === 'calendar'
        } else if (item.match === 'path' && 'path' in item) {
          active = pathname === item.path || pathname.startsWith(item.path + '/')
        }
        const Icon = item.icon
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition border-l-2',
                active
                  ? 'border-headz-red bg-white/5 text-headz-red'
                  : 'border-transparent text-[#666] hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-headz-red' : '')} />
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
