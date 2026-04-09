'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const AUTO_ADVANCE_MS = 4000

export type MarketingReviewSlide = {
  name: string
  role: string
  text: string
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export type MarketingReviewsCarouselProps = {
  reviews: readonly MarketingReviewSlide[]
  className?: string
}

export function MarketingReviewsCarousel({ reviews, className = '' }: MarketingReviewsCarouselProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reviews.length <= 1 || paused || reduceMotion) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % reviews.length)
    }, AUTO_ADVANCE_MS)
    return () => window.clearInterval(id)
  }, [reviews.length, paused, reduceMotion])

  const goTo = useCallback(
    (i: number) => {
      setIndex(((i % reviews.length) + reviews.length) % reviews.length)
    },
    [reviews.length],
  )

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + reviews.length) % reviews.length)
  }, [reviews.length])

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % reviews.length)
  }, [reviews.length])

  if (reviews.length === 0) return null

  const r = reviews[index]

  return (
    <div
      className={`mt-8 flex min-h-0 flex-1 flex-col ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <div
        className="relative flex min-h-[18rem] flex-1 flex-col rounded-2xl border border-black/[0.07] bg-white/85 shadow-[0_8px_32px_-20px_rgba(196,30,58,0.25)] ring-1 ring-headz-red/[0.08] backdrop-blur-sm sm:min-h-[16rem]"
        aria-roledescription="carousel"
        aria-label="Customer reviews"
      >
        <div className="pointer-events-none absolute left-0 top-8 bottom-8 w-1 rounded-full bg-headz-red/80 sm:top-10 sm:bottom-10" aria-hidden />

        <div className="flex flex-1 items-stretch gap-1 pl-4 pr-2 py-8 sm:gap-2 sm:pl-6 sm:pr-3 sm:py-10">
          <button
            type="button"
            aria-label="Previous review"
            onClick={() => goPrev()}
            className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-full border border-black/[0.08] bg-white text-headz-black/70 shadow-sm transition hover:border-headz-red/30 hover:bg-headz-red/[0.04] hover:text-headz-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-headz-red"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>

          <div className="min-w-0 flex-1 pl-2 sm:pl-3">
            <p className="text-base leading-none tracking-tight text-amber-500" aria-label="5 out of 5 stars">
              ★★★★★
            </p>
            <div key={index} className="marketing-review-fade flex min-h-[12rem] flex-col sm:min-h-[11rem]">
              <p
                className="mt-4 flex-1 text-base leading-relaxed text-headz-black/88 sm:text-[17px]"
                aria-live="polite"
              >
                {r.text}
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-black/[0.06] pt-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-headz-red/20 to-headz-red/5 text-xs font-bold text-headz-red ring-2 ring-headz-red/20">
                  {initialsFromName(r.name)}
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-headz-black">{r.name}</p>
                  <p className="truncate text-sm text-headz-gray">{r.role}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Next review"
            onClick={() => goNext()}
            className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-full border border-black/[0.08] bg-white text-headz-black/70 shadow-sm transition hover:border-headz-red/30 hover:bg-headz-red/[0.04] hover:text-headz-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-headz-red"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap items-center justify-center gap-2.5 px-2"
        role="tablist"
        aria-label="Choose a review"
      >
        {reviews.map((review, i) => (
          <button
            key={review.name}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show review from ${review.name}`}
            onClick={() => goTo(i)}
            className={`min-h-[2.25rem] min-w-[2.25rem] rounded-full border text-xs font-semibold tabular-nums transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-headz-red ${
              i === index
                ? 'border-headz-red bg-headz-red text-white shadow-md shadow-headz-red/25'
                : 'border-black/[0.1] bg-white text-headz-black/50 hover:border-headz-red/25 hover:text-headz-red'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
