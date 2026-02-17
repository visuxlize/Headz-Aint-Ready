'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

const LOGO_URL = 'https://seller-brand-assets-f.squarecdn.com/ML84BFGQFNRZQ/55115cf1910f30cc84857ca133d806e5.png?height=250'
const HEADER_HEIGHT = 80

const nav = [
  { href: '/', label: 'Home' },
  { href: '/#services', label: 'Services' },
  { href: '/#team', label: 'Team' },
  { href: '/#prices', label: 'Prices' },
  { href: '/book', label: 'Book' },
  { href: '/#contact', label: 'Contact' },
]

/** Returns true when the sticky header is over a dark section (so we use white text). */
function isOverDarkSection(): boolean {
  if (typeof document === 'undefined') return false
  const darkSections = document.querySelectorAll('[data-header-dark]')
  if (darkSections.length === 0) return false
  for (let i = 0; i < darkSections.length; i++) {
    const rect = darkSections[i].getBoundingClientRect()
    if (rect.top < HEADER_HEIGHT && rect.bottom > 0) return true
  }
  return false
}

const AT_TOP_THRESHOLD = 8

export function Header() {
  const pathname = usePathname()
  const [atTop, setAtTop] = useState(true)
  const [darkSection, setDarkSection] = useState(false)

  const update = useCallback(() => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
    setAtTop(scrollY < AT_TOP_THRESHOLD)
    setDarkSection(isOverDarkSection())
  }, [])

  useEffect(() => {
    update()
    const raf = requestAnimationFrame(() => update())
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update, pathname])

  useEffect(() => {
    const t = setTimeout(update, 50)
    return () => clearTimeout(t)
  }, [pathname, update])

  const isDark = !atTop && darkSection
  const headerBg = isDark
    ? 'bg-headz-black/95 backdrop-blur-sm border-b border-white/20'
    : 'bg-white/95 backdrop-blur-sm border-b border-black/10'
  const textClass = isDark
    ? 'text-white hover:text-white'
    : 'text-headz-black hover:text-headz-black'
  const linkClass = `text-sm font-medium transition-colors duration-200 ${textClass}`

  return (
    <header className={`sticky top-0 z-50 ${headerBg} transition-[background-color,border-color] duration-200`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
        <Link href="/" className={`flex items-center gap-2 shrink-0 ${textClass}`} aria-label="Headz Ain't Ready home">
          <Image
            src={LOGO_URL}
            alt=""
            width={140}
            height={48}
            className="h-10 w-auto object-contain"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
          <Link
            href="/book"
            className="bg-headz-red hover:bg-headz-redDark text-white px-4 py-2 rounded font-medium text-sm transition"
          >
            Book Now
          </Link>
        </nav>
        <div className="md:hidden flex items-center gap-4">
          <Link
            href="/book"
            className="bg-headz-red text-white px-3 py-1.5 rounded text-sm font-medium"
          >
            Book
          </Link>
        </div>
      </div>
    </header>
  )
}
