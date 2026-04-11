'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, LayoutGrid, User } from 'lucide-react'

const nav = [
  { href: '/dashboard/barber', label: 'My Day', icon: LayoutGrid },
  { href: '/dashboard/barber/pos', label: 'Checkout', icon: CreditCard },
  { href: '/dashboard/barber/profile', label: 'My Profile', icon: User },
]

export function BarberDashboardShell({
  barberName,
  avatarUrl,
  children,
}: {
  barberName: string
  avatarUrl?: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false)
    }
  }, [pathname])

  return (
    <div className="min-h-screen w-full flex bg-headz-cream">
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-[#0F0F0F] border-r border-white/10 flex flex-col transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 md:p-5 border-b border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10 relative">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/80 text-sm font-medium">
                    {barberName.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold truncate">{barberName}</p>
                <p className="text-white/50 text-xs mt-0.5">Barber</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-white/70 hover:text-white rounded-lg shrink-0"
            >
              <span className="sr-only">Close</span>×
            </button>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/dashboard/barber' ? pathname === '/dashboard/barber' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition border-l-2 ${
                  isActive
                    ? 'border-headz-red bg-white/5 text-headz-red'
                    : 'border-transparent text-[#666] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-headz-red' : ''}`} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-[padding] duration-200 ease-out ${
          sidebarOpen ? 'md:pl-64' : 'pl-0'
        }`}
      >
        <header className="h-14 shrink-0 bg-white border-b border-black/10 flex items-center gap-3 px-4 sm:px-6">
          {!sidebarOpen ? (
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={false}
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 text-headz-black hover:bg-black/5 rounded-lg shrink-0"
            >
              ☰
            </button>
          ) : (
            <div className="w-10 shrink-0" aria-hidden />
          )}
          <h1 className="text-sm font-medium text-headz-gray md:hidden truncate">Headz — Barber</h1>
        </header>
        <main className="flex-1 overflow-auto px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8">
          <div
            className={
              pathname.startsWith('/dashboard/barber/pos')
                ? 'w-full max-w-none'
                : 'mx-auto w-full max-w-4xl'
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
