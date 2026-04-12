import { Playfair_Display } from 'next/font/google'
import { Header } from '@/components/site/Header'
import { Footer } from '@/components/site/Footer'
import { MARKETING_HERO_TENOR_GIF } from '@/lib/marketing/tenor-hero'

const headzDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  style: ['normal'],
  display: 'swap',
  variable: '--font-headz-display',
})

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link rel="preconnect" href="https://media1.tenor.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://media1.tenor.com" />
      <link rel="preload" href={MARKETING_HERO_TENOR_GIF} as="image" fetchPriority="high" />
      <div className={headzDisplay.variable}>
        <Header />
        {children}
        <Footer />
      </div>
    </>
  )
}
