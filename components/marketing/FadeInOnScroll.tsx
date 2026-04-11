'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

function useMotionSafeVisible(): boolean {
  const [reduced, setReduced] = useState(false)
  useLayoutEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

type FadeInDivProps = {
  children: ReactNode
  className?: string
  delayMs?: number
}

function isElementInViewport(el: Element, marginPx: number) {
  const rect = el.getBoundingClientRect()
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  return (
    rect.top < vh + marginPx &&
    rect.bottom > -marginPx &&
    rect.left < vw + marginPx &&
    rect.right > -marginPx
  )
}

export function FadeInOnScroll({ children, className, delayMs = 0 }: FadeInDivProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useMotionSafeVisible()
  const [visible, setVisible] = useState(reduced)

  useLayoutEffect(() => {
    if (reduced) {
      setVisible(true)
      return
    }
    const el = ref.current
    if (el && isElementInViewport(el, 80)) {
      setVisible(true)
    }
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true)
      },
      { threshold: 0.05, rootMargin: '80px 0px 80px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [reduced])

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-[850ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-7 opacity-0',
        'motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
        className
      )}
      style={{ transitionDelay: !reduced && visible ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}

type FadeInLiProps = {
  children: ReactNode
  className?: string
  delayMs?: number
}

export function FadeInOnScrollLi({ children, className, delayMs = 0 }: FadeInLiProps) {
  const ref = useRef<HTMLLIElement>(null)
  const reduced = useMotionSafeVisible()
  const [visible, setVisible] = useState(reduced)

  useLayoutEffect(() => {
    if (reduced) {
      setVisible(true)
      return
    }
    const el = ref.current
    if (el && isElementInViewport(el, 80)) {
      setVisible(true)
    }
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true)
      },
      { threshold: 0.05, rootMargin: '80px 0px 80px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [reduced])

  return (
    <li
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-[850ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-7 opacity-0',
        'motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
        className
      )}
      style={{ transitionDelay: !reduced && visible ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </li>
  )
}
