'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { DashboardNav } from './DashboardNav'

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const calendarFullBleed =
    (pathname === '/dashboard' && searchParams.get('view') === 'calendar') ||
    pathname === '/dashboard/schedule'

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        calendarFullBleed ? 'overflow-hidden p-0' : 'overflow-auto px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10'
      )}
    >
      <div
        className={cn(
          'flex min-h-0 w-full flex-1 flex-col',
          calendarFullBleed ? 'max-w-none' : 'mx-auto max-w-6xl'
        )}
      >
        {children}
      </div>
    </main>
  )
}

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string
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
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-[#FAFAF8]">
      {/* Mobile: tap outside to close */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar: fixed; hamburger toggles on all breakpoints */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-[#0F0F0F] border-r border-white/10 flex flex-col transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex flex-col min-w-0 leading-tight" onClick={() => setSidebarOpen(false)}>
            <span className="font-serif text-lg text-white tracking-tight">
              HEADZ <span className="text-headz-red">●</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Ain&apos;t Ready</span>
          </Link>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-white/70 hover:text-white rounded-lg shrink-0"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          <Suspense fallback={<div className="text-white/40 text-sm px-3">Loading…</div>}>
            <DashboardNav />
          </Suspense>
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-sm"
            onClick={() => setSidebarOpen(false)}
          >
            <ExternalIcon className="w-4 h-4" />
            View site
          </Link>
        </div>
      </aside>

      {/* Main: offset when sidebar open on md+; mobile stays full width (sidebar overlays) */}
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out ${
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
              <MenuIcon className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10 shrink-0" aria-hidden />
          )}
          <div className="flex-1 min-w-0 flex items-center justify-end gap-3">
            <span className="text-sm text-headz-gray truncate max-w-[140px] sm:max-w-[200px]" title={userEmail}>
              {userEmail}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-headz-red hover:text-headz-redDark font-medium whitespace-nowrap"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <Suspense
          fallback={
            <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          }
        >
          <DashboardMain>{children}</DashboardMain>
        </Suspense>
      </div>
    </div>
  )
}
