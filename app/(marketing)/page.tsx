import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { barbers, type Barber } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { SITE, PRICE_LIST } from '@/lib/site-config'

export default async function HomePage() {
  let barbersList: Barber[] = []
  try {
    barbersList = await db.select().from(barbers).where(eq(barbers.isActive, true))
  } catch (err) {
    console.error('HomePage: could not load barbers', err)
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero – urban night / subway vibe with dark overlay */}
      <section data-header-dark className="relative bg-headz-black text-white min-h-[85vh] flex flex-col justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1648571113744-928bcc1eaa90?q=80&w=1336&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
          }}
        />
        {/* Dark overlay so white text and red CTA stand out (like reference) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/65 to-black/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-headz-red tracking-[0.3em] text-sm uppercase mb-4">Queens, NYC</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Headz Ain&apos;t Ready
          </h1>
          <p className="text-xl text-white/90 max-w-xl mx-auto mb-8">
            Legendary cuts in Jackson Heights. Book your slot, skip the wait.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center bg-headz-red hover:bg-headz-redDark text-white font-semibold px-8 py-4 rounded transition shadow-lg"
            >
              Book Now
            </Link>
            <a
              href={`tel:${SITE.phoneTel}`}
              className="inline-flex items-center justify-center border border-white/40 hover:border-white text-white font-medium px-8 py-4 rounded transition"
            >
              {SITE.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Dream Team – YouTube Short with dark cityscape (style from reference) */}
      <section data-header-dark className="relative py-20 px-4 sm:px-6 overflow-hidden">
        {/* Dark monochromatic cityscape background */}
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
          <h3 className="text-white font-serif text-3xl sm:text-4xl md:text-5xl tracking-wide italic">
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

      {/* Services */}
      <section id="services" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Services</h2>
        <p className="text-headz-gray text-center max-w-xl mx-auto mb-12">
          From kids to seniors, we&apos;ve got you. Choose your service and book with your preferred barber.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'Kids', desc: 'Precise, gentle cuts that keep kids and parents happy.', href: '/book?category=kids' },
            { title: 'Adults', desc: 'Master barbers. Fresh cuts and styles, every time.', href: '/book?category=adults' },
            { title: 'Seniors', desc: 'Considerate service so everyone leaves looking sharp.', href: '/book?category=seniors' },
          ].map(({ title, desc, href }) => (
            <div key={title} className="bg-white border border-black/10 rounded-xl p-6 shadow-sm hover:shadow-md transition">
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-headz-gray mb-6">{desc}</p>
              <Link href={href} className="inline-flex items-center text-headz-red font-medium hover:underline">
                Book appointment →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Why book */}
      <section data-header-dark className="py-20 bg-headz-black text-white px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Skip the wait</h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-10">
            We get busy. Book ahead so your time is reserved and you walk in knowing exactly when you&apos;re up.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center bg-headz-red hover:bg-headz-redDark font-semibold px-8 py-4 rounded transition"
          >
            Book your cut
          </Link>
        </div>
      </section>

      {/* Team – Dream Team from headzaintready.com */}
      <section id="team" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">The Dream Team</h2>
        <p className="text-headz-gray text-center max-w-xl mx-auto mb-12">
          Headz Ain&apos;t Ready Master Barbers. Pick your favorite when you book.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          {barbersList.length > 0 ? (
            barbersList.map((barber) => (
              <div key={barber.id} className="text-center">
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
                    <div className="w-full h-full bg-headz-black/20" />
                  )}
                </div>
                <h3 className="font-semibold">{barber.name}</h3>
                <p className="text-headz-gray text-sm">Master Barber</p>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-headz-gray text-sm">
              Run <code className="bg-black/10 px-1 rounded">node scripts/seed-headz-barbers.mjs</code> to load the team.
            </p>
          )}
        </div>
      </section>

      {/* Price list */}
      <section id="prices" className="py-20 bg-white border-t border-black/10 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Price list</h2>
          <p className="text-headz-gray text-center text-sm mb-10">
            Clear pricing. No surprises when you book.
          </p>
          <div className="rounded-xl border border-black/10 overflow-hidden shadow-sm bg-white">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_5rem_5.5rem] gap-4 px-5 py-3 bg-headz-black/5 border-b border-black/10 text-xs font-semibold uppercase tracking-wider text-headz-gray">
              <div>Service</div>
              <div className="text-right">Time</div>
              <div className="text-right">Price</div>
            </div>
            {/* Rows */}
            {PRICE_LIST.map(({ name, price, duration }) => (
              <div
                key={name}
                className="grid grid-cols-[1fr_5rem_5.5rem] gap-4 px-5 py-4 border-b border-black/5 last:border-b-0 items-center"
              >
                <span className="text-headz-black font-medium">{name}</span>
                <span className="text-headz-gray text-sm text-right">{duration}</span>
                <span className="text-right font-semibold tabular-nums">{price}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center text-sm text-headz-gray space-y-1">
            <p>{SITE.hoursShort}</p>
            <p>
              <a href={`tel:${SITE.phoneTel}`} className="text-headz-red hover:underline">{SITE.phone}</a>
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Contact</h2>
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
