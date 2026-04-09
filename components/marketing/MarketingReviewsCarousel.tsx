'use client'

import { useCallback, useEffect, useState } from 'react'

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

export function MarketingReviewsCarousel({ reviews }: { reviews: readonly MarketingReviewSlide[] }) {
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

  if (reviews.length === 0) return null

  const r = reviews[index]

  return (
    <div
      className="mt-9"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-black/[0.08] bg-white/75 p-5 shadow-[0_10px_36px_-22px_rgba(196,30,58,0.35)] ring-1 ring-headz-red/[0.06] backdrop-blur-[2px]"
        aria-roledescription="carousel"
        aria-label="Customer reviews"
      >
        <p className="text-[15px] leading-none tracking-tight text-amber-500" aria-label="5 out of 5 stars">
          ★★★★★
        </p>
        <div key={index} className="marketing-review-fade">
          <p className="mt-3 min-h-[8.5rem] text-[15px] leading-relaxed text-headz-black/88 sm:min-h-[7.5rem]" aria-live="polite">
            {r.text}
          </p>
          <div className="mt-5 flex items-center gap-3 border-t border-black/[0.06] pt-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-headz-red/20 to-headz-red/5 text-xs font-bold text-headz-red ring-2 ring-headz-red/15">
              {initialsFromName(r.name)}
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate font-semibold text-headz-black">{r.name}</p>
              <p className="truncate text-sm text-headz-gray">{r.role}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Choose a review">
        {reviews.map((review, i) => (
          <button
            key={review.name}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show review from ${review.name}`}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-headz-red ${
              i === index ? 'w-8 bg-headz-red' : 'w-2 bg-headz-black/20 hover:bg-headz-black/35'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
