import { Playfair_Display } from 'next/font/google'
import { Header } from '@/components/site/Header'
import { Footer } from '@/components/site/Footer'

const headzDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  style: ['italic'],
  display: 'swap',
  variable: '--font-headz-display',
})

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={headzDisplay.variable}>
      <Header />
      {children}
      <Footer />
    </div>
  )
}
