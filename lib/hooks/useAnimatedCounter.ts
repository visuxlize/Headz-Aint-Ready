'use client'

import { useEffect, useRef, useState } from 'react'

export function useAnimatedCounter(target: number, duration = 600): number {
  const [value, setValue] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const from = prev.current
    const diff = target - from
    if (diff === 0) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - t) ** 3
      setValue(from + diff * eased)
      if (t < 1) requestAnimationFrame(tick)
      else {
        setValue(target)
        prev.current = target
      }
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}
