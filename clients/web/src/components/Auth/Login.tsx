'use client'

import { usePostHog, type EventName } from '@/hooks/posthog'
import { schemas } from '@/lib/api'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import LoginCodeForm from '../Auth/LoginCodeForm'
import GoogleLoginButton from './GoogleLoginButton'

const Login = ({
  returnTo,
  returnParams,
  signup,
}: {
  returnTo?: string
  returnParams?: Record<string, string>
  signup?: schemas['UserSignupAttribution']
}) => {
  const posthog = usePostHog()

  const pathname = usePathname()
  const searchParams = useSearchParams()

  const eventName: EventName = signup
    ? 'global:user:signup:view'
    : 'global:user:login:view'

  const resolvedReturnTo = useMemo(() => {
    // After login, send creators straight to /dashboard so they land on their
    // store. /dashboard handles the "no org yet" case by redirecting to
    // /dashboard/create. Marketplace shoppers who want to keep browsing can
    // still pass return_to=/ explicitly via the link they came in from.
    const path = returnTo ?? '/dashboard'

    if (returnParams) {
      const returnToParams = new URLSearchParams(returnParams)
      if (returnToParams.size) {
        return `${path}?${returnToParams}`
      }
    }

    return path
  }, [returnTo, returnParams])

  const loginProps = useMemo(() => {
    let eventData = {}

    if (signup) {
      const signupEvent = { ...signup, path: pathname }

      const host = typeof window !== 'undefined' ? window.location.host : ''
      if (host) {
        signupEvent.host = host
      }

      const campaign = searchParams.get('campaign') ?? ''
      if (campaign) {
        signupEvent.campaign = campaign
      }

      const utm = {
        source: searchParams.get('utm_source') ?? '',
        medium: searchParams.get('utm_medium') ?? '',
        campaign: searchParams.get('utm_campaign') ?? '',
      }
      if (utm.source) {
        signupEvent.utm_source = utm.source
      }
      if (utm.medium) {
        signupEvent.utm_medium = utm.medium
      }
      if (utm.campaign) {
        signupEvent.utm_campaign = utm.campaign
      }

      eventData = { signup: signupEvent }
    }

    return { returnTo: resolvedReturnTo, ...eventData }
  }, [pathname, resolvedReturnTo, searchParams, signup])

  useEffect(() => {
    posthog.capture(eventName, loginProps)
  }, [eventName, loginProps, posthog])

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex w-full flex-col gap-y-4">
        <GoogleLoginButton {...loginProps} />
        <div className="flex w-full flex-row items-center gap-6">
          <div className="grow border-t border-[var(--border)]"></div>
          <div className="font-sans text-sm text-[var(--text-muted)]">or</div>
          <div className="grow border-t border-[var(--border)]"></div>
        </div>
        <LoginCodeForm {...loginProps} />
      </div>
      <div className="mt-6 text-center font-sans text-xs text-balance text-[var(--text-muted)]">
        By using Blyss, you agree to our{' '}
        <a
          className="text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
          href="/terms"
        >
          Terms of Service
        </a>{' '}
        &amp;{' '}
        <a
          className="text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
          href="/privacy"
        >
          Privacy Policy
        </a>
        .
      </div>
    </div>
  )
}

export default Login
