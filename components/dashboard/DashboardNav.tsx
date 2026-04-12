'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  CalendarDays,
  Contact,
  DollarSign,
  ReceiptText,
  TrendingUp,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const items: { href: string; label: string; icon: typeof BarChart2 }[] = [
  { href: '/dashboard', label: 'Overview', icon: BarChart2 },
  { href: '/dashboard/tickets', label: 'Tickets', icon: ReceiptText },
  { href: '/dashboard/tickets/barbers', label: 'Barbers', icon: Users },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/dashboard/payments', label: 'Payments', icon: DollarSign },
  { href: '/dashboard/reports', label: 'Reports', icon: TrendingUp },
  { href: '/dashboard/settings/staff', label: 'Staff Profiles', icon: Contact },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : item.href === '/dashboard/tickets'
              ? pathname === '/dashboard/tickets'
              : pathname === item.href || pathname.startsWith(item.href + '/')
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
