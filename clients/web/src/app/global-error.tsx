'use client'

import * as Sentry from '@sentry/nextjs'
import { inter } from '@/fonts/fonts'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <html className={`antialiased ${inter.variable}`}>
      <body className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-6 text-center">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-[#1A1A17]">
            Something went very wrong.
          </h1>
          <p className="mt-4 text-[18px] text-[#4A4842]">
            We&rsquo;re looking into it. Try refreshing.
          </p>
        </div>
      </body>
    </html>
  )
}
