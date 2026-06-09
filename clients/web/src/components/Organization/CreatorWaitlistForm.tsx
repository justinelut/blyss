'use client'

import Button from '@/components/atoms/Button'
import { Card } from '@/components/ui/card'
import { api } from '@/utils/client'
import { schemas } from '@/lib/api'
import { CheckCircle, Loader2 } from 'lucide-react'
import React, { useState } from 'react'

interface CreatorWaitlistFormProps {
  organization: schemas['Organization']
  defaultEmail?: string
}

/**
 * Shown on the dashboard when a creator's AI review was denied purely
 * because their country isn't enabled yet (denial_kind === 'country').
 *
 * Deliberately generic: it never names which countries are allowed and
 * never implies the platform is limited to one country — buyers are
 * global, only creator onboarding is staged. Captures the email so the
 * backoffice can gauge per-country demand; the country itself is read
 * server-side from the org (detected at signup), never sent from here.
 */
const CreatorWaitlistForm: React.FC<CreatorWaitlistFormProps> = ({
  organization,
  defaultEmail,
}) => {
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.POST('/v1/organizations/{id}/waitlist', {
        params: { path: { id: organization.id } },
        body: { email: email.trim() },
      })
      setJoined(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (joined) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-6 w-6 shrink-0 text-[var(--accent)]" />
          <div>
            <h3 className="text-lg font-medium">You&rsquo;re on the list</h3>
            <p className="dark:text-polar-400 mt-1 text-sm text-gray-600">
              Thanks! We&rsquo;ll email you the moment creator
              onboarding opens up for your region.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Join the creator waitlist</h3>
          <p className="dark:text-polar-400 mt-1 text-sm text-gray-600">
            We&rsquo;re onboarding creators in waves and aren&rsquo;t open
            in your region just yet. Leave your email and we&rsquo;ll reach
            out as soon as you can start selling.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="dark:border-polar-700 dark:bg-polar-800 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm"
            required
          />
          <Button type="submit" disabled={submitting} className="sm:w-auto">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining
              </>
            ) : (
              'Notify me'
            )}
          </Button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Card>
  )
}

export default CreatorWaitlistForm
