'use client'

import { Toaster } from 'react-hot-toast'

/** Client-only — keeps react-hot-toast out of the server layout bundle (avoids odd webpack/runtime issues). */
export function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        className: '!bg-[#1A1A1A] !text-white',
        style: { border: '1px solid rgba(255,255,255,0.08)' },
      }}
    />
  )
}
