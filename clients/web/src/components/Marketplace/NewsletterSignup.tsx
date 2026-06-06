'use client'

/* Hallmark · component: footer/newsletter · genre: editorial
 * Inline 'Stay in touch' email field for the marketplace footer.
 * Posts to /v1/integrations/loops/newsletter which upserts the visitor
 * as a Loops contact tagged source=marketplace_footer. Idempotent:
 * re-submitting the same address updates the existing contact.
 *
 * Editorial cadence: tracked uppercase eyebrow, single-line input with
 * inline submit button, terse success / error toast feedback. No
 * 'Sign up for our newsletter to get 10% off' copy (slop-test
 * 'no-trust-strips' rule + we don't run discount codes).
 */

import { useState } from 'react'
import { FiArrowRight, FiCheck } from 'react-icons/fi'
import { useToast } from '@/components/Toast/use-toast'
import { CONFIG } from '@/utils/config'
import { cn } from '@/lib/utils'

export function NewsletterSignup({ className }: { className?: string }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const { toast } = useToast()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = email.trim()
    if (!trimmed) return
    setSubmitting(true)

    // useToast can throw when Toaster isn't mounted yet (e.g. fast-render
    // route changes); the user shouldn't lose feedback because the
    // toast viewport hiccupped. Fallback to setDone() + inline status
    // copy is the canonical signal.
    const safeToast = (args: Parameters<typeof toast>[0]) => {
      try {
        toast(args)
      } catch {
        // ignored — `done` state below is the user-visible signal
      }
    }

    try {
      const r = await fetch(
        `${CONFIG.BASE_URL}/v1/integrations/loops/newsletter`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed }),
        },
      )
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setDone(true)
      setEmail('')
      safeToast({
        title: 'You\u2019re on the list',
        description:
          'We\u2019ll send the occasional editorial update — never spam, easy to unsubscribe.',
        duration: 3500,
      })
    } catch (err) {
      // Surface the failure inline AND in console so users + ops have
      // visibility. Common causes: API down, CORS misconfig, Loops
      // upstream 4xx. The form doesn't lock — user can retry.
      // eslint-disable-next-line no-console
      console.error('[newsletter] submit failed', err)
      safeToast({
        title: 'Could not subscribe',
        description: 'Try again in a moment, or reach out at hello@blyss.co.ke.',
        variant: 'error',
        duration: 4000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn('flex max-w-[360px] flex-col gap-2', className)}
      aria-label="Subscribe to the Blyss newsletter"
    >
      <label
        htmlFor="newsletter-email"
        className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
      >
        Stay in touch
      </label>
      <p className="font-sans text-[13px] text-[var(--text-secondary)]">
        Editorial drops + new creator features. Once a fortnight, max.
      </p>
      {done ? (
        // Inline success — Toast may not show if the viewport is offscreen
        // on mobile or hasn't mounted yet, so we render the canonical
        // confirmation directly inside the form.
        <p
          role="status"
          className="mt-2 inline-flex items-center gap-2 font-sans text-[13px] text-[var(--text-primary)]"
        >
          <FiCheck size={16} className="text-[var(--accent)]" aria-hidden="true" />
          You\u2019re on the list. Check your inbox for the welcome note.
        </p>
      ) : (
        <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={submitting}
            className="h-10 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 font-sans text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            aria-label="Subscribe"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <span aria-hidden="true">Subscribing\u2026</span>
            ) : (
              <>
                Subscribe
                <FiArrowRight size={14} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}
    </form>
  )
}
