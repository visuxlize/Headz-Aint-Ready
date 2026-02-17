import Link from 'next/link'
import Image from 'next/image'
import { SITE } from '@/lib/site-config'

const LOGO_URL = 'https://seller-brand-assets-f.squarecdn.com/ML84BFGQFNRZQ/55115cf1910f30cc84857ca133d806e5.png?height=250'

export function Footer() {
  return (
    <footer className="bg-headz-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image
              src={LOGO_URL}
              alt="Headz Ain't Ready Barbershop"
              width={120}
              height={40}
              className="h-10 w-auto object-contain brightness-0 invert opacity-90"
            />
            <p className="text-white/70 text-sm mt-2">{SITE.tagline}</p>
          </div>
          <div>
            <p className="font-medium text-sm mb-2">Visit</p>
            <a
              href={SITE.addressUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white text-sm block"
            >
              {SITE.address}
            </a>
            <p className="text-white/70 text-sm mt-1">{SITE.hours}</p>
          </div>
          <div>
            <p className="font-medium text-sm mb-2">Contact</p>
            <a href={`tel:${SITE.phoneTel}`} className="text-white/80 hover:text-white text-sm block">
              {SITE.phone}
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="text-white/80 hover:text-white text-sm block mt-1"
            >
              {SITE.email}
            </a>
            <div className="flex gap-3 mt-2">
              <a
                href={SITE.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white"
                aria-label="Facebook"
              >
                Facebook
              </a>
              <a
                href={SITE.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white"
                aria-label="Instagram"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-6">
            <Link href="/book" className="text-headz-red hover:underline font-medium text-sm">
              Book your cut →
            </Link>
            <Link href="/auth/login" className="text-white/50 hover:text-white text-sm">
              Staff login
            </Link>
          </div>
          <p className="text-white/50 text-sm">© {new Date().getFullYear()} Headz Ain&apos;t Ready Barbershop Inc.</p>
        </div>
      </div>
    </footer>
  )
}
