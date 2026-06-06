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
    if (!email.trim()) return
    setSubmitting(true)
    try {
      const r = await fetch(
        `${CONFIG.BASE_URL}/v1/integrations/loops/newsletter`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        },
      )
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setDone(true)
      setEmail('')
      toast({
        title: 'You’re on the list',
        description:
          'We’ll send the occasional editorial update — never spam, easy to unsubscribe.',
        duration: 3500,
      })
    } catch {
      toast({
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
      <div className="mt-2 flex items-center gap-2">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={submitting || done}
          className="h-10 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 font-sans text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--text-primary)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || done || !email.trim()}
          aria-label={done ? 'Subscribed' : 'Subscribe'}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {done ? (
            <FiCheck size={16} aria-hidden="true" />
          ) : submitting ? (
            <span aria-hidden="true">...</span>
          ) : (
            <>
              Subscribe
              <FiArrowRight size={14} aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
