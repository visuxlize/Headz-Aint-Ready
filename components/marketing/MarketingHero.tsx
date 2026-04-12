'use client'

import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MARKETING_HERO_TENOR_GIF } from '@/lib/marketing/tenor-hero'
import { SQUIRE } from '@/lib/squire-config'
import { SITE } from '@/lib/site-config'

type MarketingHeroProps = {
  playfairClassName: string
}

type HeroTimeline = 'waitingMedia' | 'bgRevealing' | 'contentAnimating'

/** Must match `.marketing-hero-enter` / first leg of `.marketing-hero-scissors` in globals.css */
const HERO_LINE_ENTER_MS = 520
/**
 * Must match `.marketing-hero-scissors-snip`: delay 0.52s + duration 0.44s × 2 iterations.
 * Next hero line waits this long so only one motion runs at a time.
 */
const HERO_SCISSORS_TOTAL_MS = 520 + 440 * 2

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

/**
 * NYC subway loop (Tenor GIF) — preloaded from the marketing layout; fades in after first frame.
 */
export function MarketingHero({ playfairClassName }: MarketingHeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const [heroInView, setHeroInView] = useState<boolean | null>(null)
  const prevInViewRef = useRef<boolean | null>(null)
  const [gifEpoch, setGifEpoch] = useState(0)
  const [bgMediaReady, setBgMediaReady] = useState(false)
  const [heroTimeline, setHeroTimeline] = useState<HeroTimeline>('waitingMedia')
  const [contentMountKey, setContentMountKey] = useState(0)

  useLayoutEffect(() => {
    if (!prefersReducedMotion) return
    setHeroTimeline('contentAnimating')
    setContentMountKey((k) => k + 1)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (prefersReducedMotion || !bgMediaReady || heroTimeline !== 'waitingMedia') return
    setHeroTimeline('bgRevealing')
  }, [bgMediaReady, heroTimeline, prefersReducedMotion])

  /** If media is slow or blocked, do not keep headline/CTA unmounted — unstick after a short grace period. */
  useEffect(() => {
    if (prefersReducedMotion || bgMediaReady) return
    const t = window.setTimeout(() => setBgMediaReady(true), 2200)
    return () => window.clearTimeout(t)
  }, [bgMediaReady, prefersReducedMotion])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const onIntersect: IntersectionObserverCallback = ([entry]) => {
      const inView = entry.isIntersecting
      setHeroInView(inView)

      if (prefersReducedMotion) {
        prevInViewRef.current = inView
        return
      }

      const wasInView = prevInViewRef.current
      if (inView && wasInView === false) {
        setGifEpoch((n) => n + 1)
      }
      prevInViewRef.current = inView
    }

    let obs: IntersectionObserver | null = null
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        obs = new IntersectionObserver(onIntersect, {
          threshold: 0,
          rootMargin: '48px 0px 48px 0px',
        })
        obs.observe(el)
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      obs?.disconnect()
    }
  }, [prefersReducedMotion])

  const heroLineDelay = (step: number): CSSProperties => ({
    animationDelay: `${HERO_SCISSORS_TOTAL_MS + step * HERO_LINE_ENTER_MS}ms`,
  })
  const heroRestTogetherStyle = heroLineDelay(2)

  const scissorsStyle: CSSProperties = prefersReducedMotion
    ? {}
    : ({
        '--hero-scissors-enter-delay': '0ms',
        '--hero-scissors-snip-delay': `${HERO_LINE_ENTER_MS}ms`,
      } as CSSProperties)

  const markBgMediaReady = () => setBgMediaReady(true)

  const showBgReveal =
    prefersReducedMotion || heroTimeline === 'bgRevealing' || heroTimeline === 'contentAnimating'

  return (
    <section
      ref={sectionRef}
      data-header-dark
      className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden bg-[#080808] text-white"
    >
      <div className="absolute inset-0 bg-[#080808]" aria-hidden />

      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {!prefersReducedMotion ? (
          <div
            className={
              showBgReveal ? 'marketing-hero-bg-reveal absolute inset-0' : 'absolute inset-0 opacity-0'
            }
          >
            <img
              key={gifEpoch}
              src={MARKETING_HERO_TENOR_GIF}
              alt=""
              width={1920}
              height={1080}
              decoding="async"
              loading="eager"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover opacity-30 motion-reduce:opacity-[0.12]"
              onLoad={markBgMediaReady}
            />
          </div>
        ) : null}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/88 via-black/55 to-black/90" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_80%_at_50%_35%,transparent_0%,rgba(0,0,0,0.5)_70%,rgba(0,0,0,0.82)_100%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[min(42vh,320px)] max-w-4xl flex-col items-center px-4 py-16 text-center sm:min-h-0 sm:px-6 sm:py-20">
        <div key={contentMountKey} className="flex flex-col items-center">
          <span
            className="marketing-hero-scissors mb-2 text-5xl text-white/95 drop-shadow-md select-none sm:text-6xl"
            style={scissorsStyle}
            aria-hidden
          >
            ✂
          </span>
          <p
            className="marketing-hero-enter mb-3 text-headz-red tracking-[0.35em] text-xs font-medium uppercase sm:text-sm"
            style={heroLineDelay(0)}
          >
            Queens, NYC
          </p>
          <p
            className="marketing-hero-enter mb-1 tracking-[0.32em] text-sm font-light text-white uppercase sm:text-base"
            style={heroLineDelay(1)}
          >
            WELCOME TO THE LEGENDARY
          </p>
          <h1
            className={`marketing-hero-enter ${playfairClassName} mb-2 font-serif text-7xl font-bold leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)] sm:text-8xl md:text-9xl`}
            style={heroRestTogetherStyle}
          >
            Queen&apos;s
          </h1>
          <p
            className="marketing-hero-enter mb-4 max-w-lg tracking-[0.25em] text-xs font-medium text-white/90 uppercase sm:text-sm"
            style={heroRestTogetherStyle}
          >
            HEADZ AIN&apos;T READY BARBERSHOP
          </p>
          <p
            className="marketing-hero-enter mb-10 max-w-md text-base text-white/80 sm:text-lg"
            style={heroRestTogetherStyle}
          >
            Legendary cuts in Jackson Heights — book your chair or walk in proud.
          </p>
          <div
            className="marketing-hero-enter flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4"
            style={heroRestTogetherStyle}
          >
            <a
              href={SQUIRE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border-2 border-headz-red bg-headz-red/25 px-10 py-4 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition hover:bg-headz-red hover:shadow-headz-red/20"
            >
              Book appointment
            </a>
            <a
              href={`tel:${SITE.phoneTel}`}
              className="inline-flex items-center justify-center border border-white/35 bg-white/5 px-8 py-4 text-sm font-medium text-white backdrop-blur-[2px] transition hover:border-white/60 hover:bg-white/10"
            >
              {SITE.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
