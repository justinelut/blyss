'use client'

import { useEffect, useState } from 'react'

/**
 * LiveRegion component for announcing dynamic content changes to screen readers
 * Requirement 15.8: Announce dynamic content changes using ARIA live regions
 */

interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive' | 'off'
  clearAfter?: number // milliseconds
}

export const LiveRegion = ({
  message,
  politeness = 'polite',
  clearAfter = 5000,
}: LiveRegionProps) => {
  const [announcement, setAnnouncement] = useState(message)

  useEffect(() => {
    setAnnouncement(message)

    if (clearAfter > 0) {
      const timer = setTimeout(() => {
        setAnnouncement('')
      }, clearAfter)

      return () => clearTimeout(timer)
    }
  }, [message, clearAfter])

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

/**
 * Hook for managing live region announcements
 */
export const useLiveRegion = () => {
  const [message, setMessage] = useState('')

  const announce = (text: string) => {
    setMessage(text)
  }

  return { message, announce }
}
