'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MARKETING_HERO_TENOR_GIF, MARKETING_HERO_TENOR_MP4 } from '@/lib/marketing/tenor-hero'
import { SITE } from '@/lib/site-config'

type MarketingHeroProps = {
  playfairClassName: string
}

type HeroTimeline = 'waitingMedia' | 'bgRevealing' | 'contentAnimating'

/**
 * In-browser slow-mo for the Tenor MP4. Very low values (e.g. 0.02) are clamped or behave like 0 in Safari,
 * so the hero looks frozen; keep this in a range engines reliably support (≈0.25–1).
 */
const HERO_PLAYBACK_RATE = 0.5

/** Must match `.marketing-hero-bg-reveal` duration in globals.css */
const HERO_BG_REVEAL_MS = 600
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
 * NYC subway clip: loops while in view at {@link HERO_PLAYBACK_RATE}.
 * When the hero leaves the viewport and later re-enters, playback restarts from the beginning.
 */
export function MarketingHero({ playfairClassName }: MarketingHeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  /** `null` until first intersection callback — assume on-screen so we don’t pause before layout/IO settles (avoids black hero on reload). */
  const [heroInView, setHeroInView] = useState<boolean | null>(null)
  const prevInViewRef = useRef<boolean | null>(null)
  const [videoEpoch, setVideoEpoch] = useState(0)
  const [videoFailed, setVideoFailed] = useState(false)
  /** First decoded frame / GIF load — don’t fade the clip in on an empty (black) surface. */
  const [bgMediaReady, setBgMediaReady] = useState(false)
  const [heroTimeline, setHeroTimeline] = useState<HeroTimeline>('waitingMedia')
  /** Remount hero copy when the motion phase starts so CSS delays aren’t spent while the block is hidden. */
  const [contentMountKey, setContentMountKey] = useState(0)

  const prevVideoEpochRef = useRef(videoEpoch)
  useEffect(() => {
    if (prefersReducedMotion) return
    if (prevVideoEpochRef.current === videoEpoch) return
    prevVideoEpochRef.current = videoEpoch
    setBgMediaReady(false)
    setHeroTimeline('waitingMedia')
  }, [videoEpoch, prefersReducedMotion])

  const prevVideoFailedRef = useRef(videoFailed)
  useEffect(() => {
    if (prefersReducedMotion) return
    if (prevVideoFailedRef.current === videoFailed) return
    prevVideoFailedRef.current = videoFailed
    setBgMediaReady(false)
    setHeroTimeline('waitingMedia')
  }, [videoFailed, prefersReducedMotion])

  useLayoutEffect(() => {
    if (!prefersReducedMotion) return
    setHeroTimeline('contentAnimating')
    setContentMountKey((k) => k + 1)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (prefersReducedMotion || !bgMediaReady || heroTimeline !== 'waitingMedia') return
    setHeroTimeline('bgRevealing')
  }, [bgMediaReady, heroTimeline, prefersReducedMotion])

  useEffect(() => {
    if (heroTimeline !== 'bgRevealing') return
    const t = window.setTimeout(() => {
      setContentMountKey((k) => k + 1)
      setHeroTimeline('contentAnimating')
    }, HERO_BG_REVEAL_MS)
    return () => window.clearTimeout(t)
  }, [heroTimeline])

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
        setVideoEpoch((n) => n + 1)
      }
      prevInViewRef.current = inView
    }

    let obs: IntersectionObserver | null = null
    let raf1 = 0
    let raf2 = 0
    // Wait for layout so the first intersection isn’t a false “out of view” while the hero is visible.
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

  useEffect(() => {
    if (prefersReducedMotion || videoFailed) return
    const v = videoRef.current
    if (!v) return

    let cancelled = false

    if (heroInView === false) {
      v.pause()
      return () => {
        cancelled = true
      }
    }

    const applySlowPlayback = () => {
      try {
        v.playbackRate = HERO_PLAYBACK_RATE
      } catch {
        /* Safari may throw until metadata is ready */
      }
    }

    const kick = () => {
      applySlowPlayback()
      v.pause()
      v.currentTime = 0
      void v.play().catch(() => {})
    }

    const onMeta = () => kick()
    applySlowPlayback()
    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) kick()
    else v.addEventListener('loadedmetadata', onMeta, { once: true })

    return () => {
      cancelled = true
      v.removeEventListener('loadedmetadata', onMeta)
    }
  }, [videoEpoch, prefersReducedMotion, videoFailed, heroInView])

  const showHeroMotion = heroTimeline === 'contentAnimating' || prefersReducedMotion

  /** After scissors: line 0 = Queens NYC, line 1 = Welcome…; step 2+ = rest together (bg already revealed). */
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

  return (
    <section
      ref={sectionRef}
      data-header-dark
      className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden bg-[#080808] text-white"
    >
      <div className="absolute inset-0 bg-[#080808]" aria-hidden />

      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {!prefersReducedMotion && !videoFailed ? (
          <div
            className={
              heroTimeline === 'waitingMedia'
                ? 'absolute inset-0 opacity-0'
                : 'marketing-hero-bg-reveal absolute inset-0'
            }
          >
            <video
              key={videoEpoch}
              ref={videoRef}
              src={MARKETING_HERO_TENOR_MP4}
              muted
              playsInline
              preload="auto"
              loop
              className="absolute inset-0 h-full w-full object-cover opacity-30 motion-reduce:opacity-[0.12]"
              aria-hidden
              onError={() => setVideoFailed(true)}
              onLoadedData={markBgMediaReady}
              onCanPlay={markBgMediaReady}
              onPlaying={markBgMediaReady}
            />
          </div>
        ) : null}
        {!prefersReducedMotion && videoFailed ? (
          <div
            className={
              heroTimeline === 'waitingMedia'
                ? 'absolute inset-0 opacity-0'
                : 'marketing-hero-bg-reveal absolute inset-0'
            }
          >
            <img
              key={`gif-${videoEpoch}`}
              src={MARKETING_HERO_TENOR_GIF}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-30 motion-reduce:opacity-[0.12]"
              decoding="async"
              loading="eager"
              fetchPriority="high"
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
        {showHeroMotion ? (
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
              className={`marketing-hero-enter ${playfairClassName} mb-2 font-serif text-7xl font-bold italic leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)] sm:text-8xl md:text-9xl`}
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
              <Link
                href="/book"
                className="inline-flex items-center justify-center border-2 border-headz-red bg-headz-red/25 px-10 py-4 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition hover:bg-headz-red hover:shadow-headz-red/20"
              >
                Book appointment
              </Link>
              <a
                href={`tel:${SITE.phoneTel}`}
                className="inline-flex items-center justify-center border border-white/35 bg-white/5 px-8 py-4 text-sm font-medium text-white backdrop-blur-[2px] transition hover:border-white/60 hover:bg-white/10"
              >
                {SITE.phone}
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
