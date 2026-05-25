'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({ error }: { error: Error }) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 text-center">
      <h1 className="font-display text-[clamp(32px,4vw,56px)] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        Something broke on our side.
      </h1>
      <p className="mt-4 max-w-[48ch] font-sans text-[18px] leading-[1.5] text-[var(--text-secondary)]">
        The team&rsquo;s been notified. Try refreshing in a minute.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-10 inline-flex h-11 items-center rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
      >
        Refresh
      </button>
    </div>
  )
}
