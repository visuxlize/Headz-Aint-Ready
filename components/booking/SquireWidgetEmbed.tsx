'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SQUIRE } from '@/lib/squire-config'

type Status = 'trying' | 'loaded' | 'failed'

function iframeLooksBroken(doc: Document | null | undefined): boolean {
  if (doc == null) return false
  try {
    const html = doc.body?.innerHTML ?? ''
    if (!html.trim()) return true
    if (html.includes('You need to enable JavaScript')) return true
    return false
  } catch {
    return false
  }
}

export function SquireWidgetEmbed({ onFailed }: { onFailed: () => void }) {
  const [urlIndex, setUrlIndex] = useState(0)
  const [status, setStatus] = useState<Status>('trying')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  /** Browser timers use numeric IDs (DOM); avoids Node `Timeout` vs `number` mismatch under `@types/node`. */
  const checkTimerRef = useRef<number | null>(null)
  const urlTimeoutRef = useRef<number | null>(null)
  const statusRef = useRef<Status>('trying')
  statusRef.current = status

  const currentUrl = SQUIRE.widgetUrls[urlIndex] ?? SQUIRE.widgetUrls[0]

  const clearTimers = useCallback(() => {
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current)
      checkTimerRef.current = null
    }
    if (urlTimeoutRef.current) {
      clearTimeout(urlTimeoutRef.current)
      urlTimeoutRef.current = null
    }
  }, [])

  const tryNextUrl = useCallback(() => {
    clearTimers()
    setUrlIndex((i) => {
      const next = i + 1
      if (next >= SQUIRE.widgetUrls.length) {
        queueMicrotask(() => {
          setStatus('failed')
          onFailed()
        })
        return i
      }
      return next
    })
  }, [clearTimers, onFailed])

  const runLoadCheck = useCallback(() => {
    if (statusRef.current !== 'trying') return
    const el = iframeRef.current
    if (!el) return

    try {
      const doc = el.contentDocument
      if (doc == null) {
        setStatus('loaded')
        clearTimers()
        return
      }
      if (iframeLooksBroken(doc)) {
        tryNextUrl()
        return
      }
      setStatus('loaded')
      clearTimers()
    } catch {
      setStatus('loaded')
      clearTimers()
    }
  }, [clearTimers, tryNextUrl])

  const onIframeLoad = useCallback(() => {
    clearTimers()
    checkTimerRef.current = window.setTimeout(() => {
      runLoadCheck()
    }, 2000)
  }, [clearTimers, runLoadCheck])

  useEffect(() => {
    if (status !== 'trying') return
    clearTimers()
    urlTimeoutRef.current = window.setTimeout(() => {
      if (statusRef.current === 'trying') {
        tryNextUrl()
      }
    }, 10_000)
    return () => {
      clearTimers()
    }
  }, [urlIndex, status, clearTimers, tryNextUrl])

  useEffect(() => () => clearTimers(), [clearTimers])

  if (status === 'failed') {
    return null
  }

  return (
    <div className="relative min-h-[min(620px,calc(100vh-96px))] w-full bg-[#0a0a0a]">
      {status === 'trying' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-headz-black">
          <Loader2 className="h-10 w-10 animate-spin text-headz-red" aria-hidden />
          <p className="text-sm font-medium text-white/80">Loading booking…</p>
        </div>
      )}
      <iframe
        key={currentUrl}
        ref={iframeRef}
        src={currentUrl}
        title="Book at Headz Ain't Ready"
        className={`h-[min(620px,calc(100vh-96px))] min-h-[620px] w-full border-0 transition-opacity duration-500 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        allow="payment; camera; microphone; clipboard-write"
        onLoad={onIframeLoad}
      />
    </div>
  )
}
