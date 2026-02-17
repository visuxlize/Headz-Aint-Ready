'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const LOGO_URL = 'https://seller-brand-assets-f.squarecdn.com/ML84BFGQFNRZQ/55115cf1910f30cc84857ca133d806e5.png?height=250'
const HEADER_HEIGHT = 72

const nav = [
  { href: '/', label: 'Home' },
  { href: '/#services', label: 'Services' },
  { href: '/#team', label: 'Team' },
  { href: '/#prices', label: 'Prices' },
  { href: '/book', label: 'Book' },
  { href: '/#contact', label: 'Contact' },
]

export function Header() {
  const [onDark, setOnDark] = useState(false)

  useEffect(() => {
    const checkAll = () => {
      const darkSections = document.querySelectorAll('[data-header-dark]')
      if (darkSections.length === 0) {
        setOnDark(false)
        return
      }
      let any = false
      darkSections.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < HEADER_HEIGHT && rect.bottom > 0) any = true
      })
      setOnDark(any)
    }

    checkAll()
    window.addEventListener('scroll', checkAll, { passive: true })
    window.addEventListener('resize', checkAll)
    return () => {
      window.removeEventListener('scroll', checkAll)
      window.removeEventListener('resize', checkAll)
    }
  }, [])

  const headerBg = onDark
    ? 'bg-headz-black/90 backdrop-blur border-b border-white/10'
    : 'bg-white/90 backdrop-blur border-b border-black/10'
  const linkClass = onDark
    ? 'text-white/90 hover:text-white text-sm font-medium transition-colors duration-200'
    : 'text-headz-black/90 hover:text-headz-black text-sm font-medium transition-colors duration-200'

  return (
    <header className={`sticky top-0 z-50 ${headerBg} transition-colors duration-200`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src={LOGO_URL}
            alt="Headz Ain't Ready Barbershop"
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
