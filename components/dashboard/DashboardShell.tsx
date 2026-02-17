'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen w-full flex bg-headz-cream">
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar: drawer on mobile, fixed on desktop */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 md:w-56 shrink-0 bg-headz-black border-r border-white/10 flex flex-col transition-transform duration-200 ease-out md:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <span className="text-headz-red font-bold text-lg">Headz</span>
            <span className="text-white/70 text-sm">Staff</span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="md:hidden p-2 text-white/70 hover:text-white rounded-lg"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          <DashboardNav />
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-sm"
            onClick={() => setMenuOpen(false)}
          >
            <ExternalIcon className="w-4 h-4" />
            View site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-14 shrink-0 bg-white border-b border-black/10 flex items-center justify-between px-4 sm:px-6 gap-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="md:hidden p-2 -ml-2 text-headz-black hover:bg-black/5 rounded-lg"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
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
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
