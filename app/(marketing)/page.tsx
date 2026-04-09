import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { barbersForMarketingCondition } from '@/lib/barbers/public-queries'
import {
  getPublishedFallbackPrices,
  getPublishedFallbackTeam,
  type MarketingBarberCard,
  type MarketingPriceRow,
} from '@/lib/marketing/home-fallbacks'
import { barbers, services, users } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { SITE } from '@/lib/site-config'
import { formatServicePriceDisplay } from '@/lib/services/format-service-price'
import { GOOGLE_READ_REVIEWS_URL, GOOGLE_WRITE_REVIEW_URL } from '@/lib/marketing/google-reviews'
import { formatServiceDurationLabel, marketingServiceDescription } from '@/lib/marketing/price-list-ui'
import { INSTAGRAM_PROFILE_URL, instagramGalleryPhotos } from '@/lib/marketing/instagram-gallery'
import { MarketingHero } from '@/components/marketing/MarketingHero'
import { FadeInOnScroll, FadeInOnScrollLi } from '@/components/marketing/FadeInOnScroll'

export const dynamic = 'force-dynamic'

const REVIEWS = [
  {
    name: 'Carlos M.',
    role: 'Regular · Jackson Heights',
    text: "Been coming here since I was a kid. Real Queens institution. The barbers know their craft — fades are always clean and tight. Wouldn't go anywhere else.",
  },
  {
    name: 'David R.',
    role: 'Walk-in turned regular',
    text: 'Best shop in Jackson Heights, hands down. Walk in, get treated right, walk out looking fresh. Staff is professional and the vibe is always good.',
  },
  {
    name: 'Mike T.',
    role: 'Local · 5+ years',
    text: 'These guys have been cutting hair in this neighborhood for decades and it shows. Consistent, sharp, and always on point. Highly recommend.',
  },
  {
    name: 'Anthony L.',
    role: 'Parent · first cut',
    text: 'Brought my son here for his first cut. The barber was patient and did an amazing job. This is the kind of place you keep coming back to.',
  },
] as const

function RedCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M13.5 4.5L6 12 2.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Public marketing homepage — do not remove these sections (hero, Dream Team video, team grid,
 * services, price list, contact) when refactoring dashboard or APIs. DB failures fall back to
 * published content in `lib/marketing/home-fallbacks.ts`.
 */
export default async function HomePage() {
  let barbersList: MarketingBarberCard[] = []
  let priceRows: MarketingPriceRow[] = []

  const barbersQuery = db
    .select({ barber: barbers })
    .from(barbers)
    .leftJoin(users, eq(barbers.userId, users.id))
    .where(barbersForMarketingCondition)
    .orderBy(asc(barbers.sortOrder))
    .then((rows) => rows.map((r) => r.barber))

  const pricesQuery = db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      price: services.price,
      priceDisplayOverride: services.priceDisplayOverride,
      durationMinutes: services.durationMinutes,
    })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.displayOrder))

  const [barbersSettled, pricesSettled] = await Promise.allSettled([barbersQuery, pricesQuery])

  if (barbersSettled.status === 'fulfilled' && barbersSettled.value.length > 0) {
    barbersList = barbersSettled.value.map((b) => ({
      id: b.id,
      name: b.name,
      avatarUrl: b.avatarUrl,
    }))
  } else {
    if (barbersSettled.status === 'rejected') {
      console.error('HomePage: barbers query failed', barbersSettled.reason)
    }
    barbersList = getPublishedFallbackTeam()
  }

  if (pricesSettled.status === 'fulfilled' && pricesSettled.value.length > 0) {
    priceRows = pricesSettled.value
  } else {
    if (pricesSettled.status === 'rejected') {
      console.error('HomePage: services query failed', pricesSettled.reason)
    }
    priceRows = getPublishedFallbackPrices()
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <MarketingHero playfairClassName="font-headz-display" />

      {/* Dream Team – YouTube Short with dark cityscape */}
      <section data-header-dark className="relative py-20 px-4 sm:px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=1920')",
            filter: 'grayscale(1) brightness(0.4) contrast(1.1)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-white font-light tracking-wide text-xl sm:text-2xl mb-1">
            A compilation of the
          </h2>
          <div className="w-16 h-px bg-white/50 mx-auto my-3" aria-hidden />
          <h3 className="font-headz-display text-3xl text-white sm:text-4xl md:text-5xl tracking-wide">
            Dream Team
          </h3>
          <div className="mt-10 flex justify-center">
            <div className="w-full max-w-[280px] sm:max-w-[320px] mx-auto">
              <div className="aspect-[9/16] w-full rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/20 bg-black/30">
                <iframe
                  src="https://www.youtube.com/embed/N2OLh0p9XjE?start=2"
                  title="Headz Ain't Ready – We Are Queens"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* History + reviews — light section with subtle brand-red wash (no inset “dark widget”) */}
      <section className="relative overflow-hidden bg-[#fafaf8] px-4 py-20 sm:px-6">
        <div
          className="pointer-events-none absolute -right-[min(18rem,25vw)] -top-32 h-[min(28rem,55vw)] w-[min(28rem,55vw)] rounded-full bg-[radial-gradient(circle_at_center,rgba(196,30,58,0.12),transparent_68%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-[min(10rem,18vw)] bottom-0 h-[min(22rem,50vw)] w-[min(22rem,50vw)] rounded-full bg-[radial-gradient(circle_at_center,rgba(196,30,58,0.08),transparent_70%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/90 to-transparent" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-start gap-16 lg:grid-cols-2">
          <FadeInOnScroll>
            <div className="mx-auto w-full max-w-md text-left lg:mx-0">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-headz-red">
                OVER 25 YEARS IN...
              </p>
              <h2 className="font-headz-display mb-5 text-5xl text-headz-black sm:text-6xl">The Industry</h2>
              <p className="mb-10 text-base leading-relaxed text-headz-black/85">
                Headz Ain&apos;t Ready Was Established In 1995 In Jackson Heights, Queens. Since Then We Have
                Been Serving Thousands Of Clients In New York &amp; The Entire Tri-State Area. We&apos;re proud of
                the craft and we let the cuts speak for themselves.
              </p>
              <div className="flex w-full flex-col gap-4">
                <div className="flex w-full min-w-0 items-start gap-4 rounded-2xl border border-black/[0.07] bg-white/80 px-5 py-5 shadow-[0_8px_32px_-20px_rgba(196,30,58,0.25)] ring-1 ring-headz-red/[0.08] backdrop-blur-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-headz-red text-white shadow-md shadow-headz-red/20">
                    <RedCheckIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-semibold text-headz-black">Open 7 Days</p>
                    <p className="mt-1 text-sm leading-snug text-headz-gray">Monday – Sun: 9am – 8pm</p>
                  </div>
                </div>
                <div className="flex w-full min-w-0 items-start gap-4 rounded-2xl border border-black/[0.07] bg-white/80 px-5 py-5 shadow-[0_8px_32px_-20px_rgba(196,30,58,0.25)] ring-1 ring-headz-red/[0.08] backdrop-blur-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-headz-red text-white shadow-md shadow-headz-red/20">
                    <RedCheckIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-semibold text-headz-black">Master Barbers</p>
                    <p className="mt-1 text-sm leading-snug text-headz-gray">&amp; State of the art chairs</p>
                  </div>
                </div>
              </div>
              <div className="mt-10 w-full space-y-3 border-t border-black/[0.06] pt-10">
                <a
                  href={GOOGLE_WRITE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-xl bg-headz-red px-5 py-3.5 text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_6px_20px_-6px_rgba(196,30,58,0.55)] transition hover:brightness-[0.92] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-headz-red"
                >
                  Write a review
                </a>
                <a
                  href={GOOGLE_READ_REVIEWS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-xl border border-headz-red/90 bg-white px-5 py-3.5 text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-headz-red shadow-sm shadow-black/[0.04] transition hover:bg-headz-red/[0.04] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-headz-red"
                >
                  Read reviews
                </a>
              </div>
            </div>
          </FadeInOnScroll>

          <div className="lg:pt-1">
            <FadeInOnScroll delayMs={80}>
              <h3 className="font-headz-display text-3xl text-headz-black sm:text-4xl">
                Why Jackson Heights trusts the chair
              </h3>
            </FadeInOnScroll>
            <ul className="mt-9 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {REVIEWS.map((r, index) => (
                <FadeInOnScrollLi key={r.name} delayMs={120 + index * 90} className="list-none">
                  <div className="flex h-full flex-col rounded-xl border border-black/[0.08] bg-white/75 p-5 shadow-[0_10px_36px_-22px_rgba(196,30,58,0.35)] ring-1 ring-headz-red/[0.06] backdrop-blur-[2px]">
                    <p className="text-[15px] leading-none tracking-tight text-amber-500" aria-label="5 out of 5 stars">
                      ★★★★★
                    </p>
                    <p className="mt-3 flex-1 text-[15px] leading-relaxed text-headz-black/88">{r.text}</p>
                    <div className="mt-5 flex items-center gap-3 border-t border-black/[0.06] pt-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-headz-red/20 to-headz-red/5 text-xs font-bold text-headz-red ring-2 ring-headz-red/15">
                        {r.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate font-semibold text-headz-black">{r.name}</p>
                        <p className="truncate text-sm text-headz-gray">{r.role}</p>
                      </div>
                    </div>
                  </div>
                </FadeInOnScrollLi>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Services — single focused band + one primary CTA */}
      <section
        id="services"
        className="scroll-mt-6 border-t border-black/[0.06] bg-gradient-to-b from-white via-[#fafaf8] to-white py-20 px-4 sm:px-6"
      >
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_24px_70px_-40px_rgba(196,30,58,0.28)] ring-1 ring-headz-red/10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-stretch">
            <div className="relative p-8 sm:p-10 lg:p-12">
              <div
                className="pointer-events-none absolute -right-16 top-1/2 hidden h-48 w-48 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(196,30,58,0.12),transparent_65%)] lg:block"
                aria-hidden
              />
              <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-headz-red">The chair is open</p>
              <h2 className="font-headz-display relative mt-3 text-4xl text-headz-black sm:text-5xl">
                Every age. Every texture.
              </h2>
              <p className="relative mt-4 max-w-xl text-base leading-relaxed text-headz-black/80">
                Kids, adults, seniors — same shop standard. Book your service and barber in one flow, or walk in when
                the door&apos;s spinning.
              </p>
              <ul className="relative mt-10 space-y-6 border-l-2 border-headz-red/45 pl-5">
                {[
                  { k: 'Kids', line: 'Patient hands, clean lines, confidence on the walk to school.' },
                  { k: 'Adults', line: 'Fades, tapers, beards — Queens-level consistency every visit.' },
                  { k: 'Seniors', line: 'Respectful pace, sharp finish, the dignity a long-time regular deserves.' },
                ].map(({ k, line }) => (
                  <li key={k} className="text-left">
                    <span className="font-semibold text-headz-black">{k}</span>
                    <span className="mt-1 block text-sm leading-snug text-headz-gray">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center gap-4 border-t border-black/10 bg-gradient-to-br from-headz-red/[0.07] via-white to-white p-8 sm:p-10 lg:w-[280px] lg:border-l lg:border-t-0 xl:w-[300px]">
              <p className="text-center text-sm font-medium text-headz-black/90 lg:text-left">
                Ready when you are — pick your cut on the next screen.
              </p>
              <Link
                href="/book"
                className="inline-flex min-h-[3.25rem] items-center justify-center bg-headz-red px-8 py-3.5 text-center text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition hover:bg-[var(--headz-red-dark)] hover:shadow-headz-red/25"
              >
                Book your cut
              </Link>
              <Link
                href="#prices"
                className="text-center text-sm font-medium text-headz-red underline-offset-4 hover:underline lg:text-left"
              >
                Browse full price list
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <h2 className="font-headz-display text-center text-3xl mb-4">The Dream Team</h2>
        <p className="text-headz-gray text-center max-w-xl mx-auto mb-12">
          Headz Ain&apos;t Ready Master Barbers. Pick your favorite when you book.
        </p>
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-10">
          {barbersList.map((barber) => (
            <div key={barber.id} className="w-40 shrink-0 text-center sm:w-44 md:w-48">
              <div className="aspect-square rounded-full overflow-hidden mx-auto mb-4 max-w-[200px] bg-headz-black/10">
                {barber.avatarUrl ? (
                  <Image
                    src={barber.avatarUrl}
                    alt={barber.name}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-headz-cream border-2 border-headz-red/15 flex items-center justify-center">
                    <span className="text-headz-red font-semibold text-3xl sm:text-4xl tracking-tight">
                      {barber.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="font-semibold">{barber.name}</h3>
              <p className="text-headz-gray text-sm">Master Barber</p>
            </div>
          ))}
        </div>
      </section>

      {/* Price list + gallery */}
      <section id="prices" className="border-t border-black/10 bg-white py-20 px-4 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="min-w-0 w-full text-left">
            <h2 className="font-headz-display mb-2 text-3xl text-headz-black">Price list</h2>
            <p className="mb-10 max-w-xl text-sm leading-relaxed text-headz-black/70">
              Straight from the chair — every service gets a line, a little context, and the time we lock in for you.
            </p>
            <div className="w-full max-w-none divide-y divide-black/10 border-t border-black/10">
              {priceRows.map((row) => (
                <article key={row.id} className="py-7 first:pt-0 last:pb-0">
                  <h3 className="text-lg font-semibold tracking-tight text-headz-black">{row.name}</h3>
                  <p className="mt-2 max-w-xl text-[15px] italic leading-relaxed text-headz-black/65">
                    {marketingServiceDescription(row)}
                  </p>
                  <p className="mt-3 text-[15px] font-normal tabular-nums text-headz-black">
                    {formatServicePriceDisplay(row)}{' '}
                    <span className="mx-1.5 inline text-headz-black/35" aria-hidden>
                      ·
                    </span>{' '}
                    {formatServiceDurationLabel(row.durationMinutes)}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-8 border-t border-black/10 pt-6 text-sm text-headz-gray">
              <p>{SITE.hoursShort}</p>
            </div>
          </div>
          <div className="min-w-0 w-full text-left lg:pt-1">
            <h2 className="font-headz-display text-2xl text-headz-black">The Work</h2>
            <p className="mt-2 text-headz-red uppercase tracking-widest text-xs font-semibold">Fresh out the chair</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-headz-gray">
              Stills from our{' '}
              <a
                href={INSTAGRAM_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-headz-red underline-offset-2 hover:underline"
              >
                Instagram @headzaintready.nyc
              </a>
              . Tap a photo to open the original post — follow for lineups, reels, and shop drops.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {instagramGalleryPhotos.map((item, index) => (
                <a
                  key={`${item.postUrl}-${index}`}
                  href={item.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-200 shadow-md ring-1 ring-black/5 transition duration-300 hover:scale-[1.02] hover:ring-headz-red/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-headz-red"
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 50vw, 400px"
                    unoptimized
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-white opacity-0 transition group-hover:opacity-100">
                    Open in Instagram
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <h2 className="font-headz-display text-center text-3xl mb-4">Contact</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-8 text-center">
          <a href={`tel:${SITE.phoneTel}`} className="text-headz-red font-medium hover:underline">
            {SITE.phone}
          </a>
          <a href={`mailto:${SITE.email}`} className="text-headz-red font-medium hover:underline">
            {SITE.email}
          </a>
          <a
            href={SITE.addressUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-headz-red font-medium hover:underline"
          >
            {SITE.address}
          </a>
        </div>
        <p className="text-center mt-4 text-headz-gray text-sm">{SITE.hours}</p>
      </section>
    </div>
  )
}
