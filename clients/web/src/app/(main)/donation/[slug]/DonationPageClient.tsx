'use client'

/* Hallmark · macrostructure: Letter (donation page) · genre: editorial
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * sections: Page head with creator identity · Form column ·
 *           Payment-method selector · Success state
 * nav: N9 (inherited) · footer: Ft1 (inherited)
 * contrast: pass · slop: pass (gates 1, 2, 7, 8, 36, 51–55, 67)
 *
 * Replaces the inline DonationModal with a dedicated /donation/[slug] page.
 * Editorial cadence: creator avatar + name, brief letter-style ask, then a
 * two-column form on desktop (form left, summary right). Mobile collapses
 * to single column with sticky bottom payment CTA.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { OptimizedImage } from '@/components/Image/OptimizedImage'
import { DonationPaymentInterface } from '@/components/Donation/DonationPaymentInterface'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import Input from '@/components/atoms/Input'
import { Textarea } from '@/components/ui/textarea'
import { Eyebrow, typography } from '@/design'
import { cn } from '@/lib/utils'
import { FiArrowLeft, FiCheck } from 'react-icons/fi'

interface DonationPageClientProps {
  creator: {
    id: string
    name: string
    slug: string
    avatar_url?: string | null
    bio?: string | null
  }
}

interface DonationFormData {
  amount: string
  donor_name: string
  donor_email: string
  message?: string
}

const MIN_KES = 50
const MAX_KES = 50_000

const PRESET_AMOUNTS = ['200', '500', '1000', '2500'] as const

export function DonationPageClient({ creator }: DonationPageClientProps) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const ease = [0.32, 0.72, 0, 1] as const

  const form = useForm<DonationFormData>({
    mode: 'onChange',
    defaultValues: { amount: '', donor_name: '', donor_email: '', message: '' },
  })
  const { control, watch, setValue, formState } = form
  const [succeeded, setSucceeded] = useState(false)
  const successRedirectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const amountStr = watch('amount')
  const donorEmail = watch('donor_email')
  const donorName = watch('donor_name')
  const message = watch('message')

  const amountKes = parseFloat(amountStr || '')
  const amountValid =
    !Number.isNaN(amountKes) && amountKes >= MIN_KES && amountKes <= MAX_KES
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail || '')
  const canPay = amountValid && emailValid && !formState.errors.amount
  const amountMinorUnits = amountValid ? Math.round(amountKes * 100) : 0

  // Auto-redirect to creator page after success.
  useEffect(() => {
    if (!succeeded) return
    successRedirectRef.current = setTimeout(() => {
      router.push(`/creators/${creator.slug}`)
    }, 4000)
    return () => {
      if (successRedirectRef.current) clearTimeout(successRedirectRef.current)
    }
  }, [succeeded, router, creator.slug])

  if (succeeded) {
    return (
      <main className="mx-auto max-w-[720px] px-6 py-20 md:px-16 md:py-32">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="flex flex-col items-start gap-6"
          data-testid="donation-success"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
            <FiCheck size={24} aria-hidden="true" />
          </span>
          <Eyebrow accent>Thank you</Eyebrow>
          <h1
            className={cn(
              'font-display text-[clamp(32px,4vw,52px)] font-semibold tracking-[-0.02em] leading-[1.05] text-[var(--text-primary)]',
            )}
          >
            Thank you for supporting {creator.name}.
          </h1>
          <p
            className={cn(
              typography.body,
              'max-w-[56ch] text-[var(--text-secondary)]',
            )}
          >
            Your tip was received. A receipt is on its way to your email.
            We&rsquo;ll send you back to {creator.name}&rsquo;s shop in a moment.
          </p>
          <Link
            href={`/creators/${creator.slug}`}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-sans text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to {creator.name}&rsquo;s shop
          </Link>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-12 md:px-16 md:py-20">
      {/* Back link — typographic */}
      <Link
        href={`/creators/${creator.slug}`}
        className="inline-flex items-center gap-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
      >
        <FiArrowLeft size={14} aria-hidden="true" />
        Back to {creator.name}
      </Link>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        {/* Form column */}
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            <Eyebrow accent>Tip</Eyebrow>
            <h1
              className={cn(
                'font-display text-[clamp(32px,4.5vw,56px)] font-semibold tracking-[-0.02em] leading-[1.04] text-[var(--text-primary)]',
              )}
              style={{ overflowWrap: 'anywhere', minWidth: 0 }}
            >
              Support {creator.name}.
            </h1>
            <p
              className={cn(
                'max-w-[56ch] font-sans text-[16px] leading-[1.55] text-[var(--text-secondary)]',
              )}
            >
              Send a one-time tip to support this creator. Pay with mobile
              money or card. {creator.name} receives the full amount on the
              next payout cycle.
            </p>
          </header>

          <Form {...form}>
            <form
              className="flex flex-col gap-6"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Preset amounts as typographic chips */}
              <div className="flex flex-col gap-3">
                <Eyebrow>Amount</Eyebrow>
                <div className="flex flex-wrap gap-2">
                  {PRESET_AMOUNTS.map((preset) => {
                    const active = amountStr === preset
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setValue('amount', preset, { shouldValidate: true })}
                        aria-pressed={active}
                        className={cn(
                          'inline-flex h-10 items-center justify-center rounded-md border px-4 font-sans text-[14px] font-medium tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                          active
                            ? 'border-[var(--text-primary)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                            : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
                        )}
                      >
                        KSh {Number(preset).toLocaleString('en-KE')}
                      </button>
                    )
                  })}
                </div>

                <FormField
                  control={control}
                  name="amount"
                  rules={{
                    required: 'Amount is required',
                    pattern: {
                      value: /^\d+(\.\d{1,2})?$/,
                      message: 'Please enter a valid amount',
                    },
                    validate: (value) => {
                      const amount = parseFloat(value)
                      if (amount < MIN_KES) return `Minimum tip is KES ${MIN_KES}`
                      if (amount > MAX_KES)
                        return `Maximum tip is KES ${MAX_KES.toLocaleString()}`
                      return true
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Or enter a custom amount (KES)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-sans text-sm tabular-nums text-[var(--text-muted)]">
                            KSh
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="500"
                            className="w-full pl-12 tabular-nums"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Donor info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="donor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Your name (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Jane"
                          className="w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="donor_email"
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Your email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jane@example.com"
                          autoComplete="email"
                          className="w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Optional message */}
              <FormField
                control={control}
                name="message"
                rules={{
                  maxLength: {
                    value: 200,
                    message: 'Message must be 200 characters or fewer',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Message (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Leave a message for ${creator.name}…`}
                        className="w-full resize-none"
                        rows={3}
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DonationPaymentInterface
                slug={creator.slug}
                amount={amountMinorUnits}
                donorEmail={donorEmail}
                donorName={donorName}
                message={message}
                canPay={canPay}
                onPaymentSuccess={() => setSucceeded(true)}
              />
            </form>
          </Form>
        </div>

        {/* Creator card column — sticky on desktop */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-6 border-t border-[var(--border)] pt-8 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <div className="flex items-center gap-4">
              {creator.avatar_url ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <OptimizedImage
                    src={creator.avatar_url}
                    alt={`${creator.name} avatar`}
                    fill
                    sizes="64px"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] font-display text-2xl font-semibold text-[var(--text-secondary)]">
                  {creator.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Tipping
                </p>
                <p className="font-display text-[18px] font-medium leading-[1.3] text-[var(--text-primary)]">
                  {creator.name}
                </p>
              </div>
            </div>

            {creator.bio && (
              <p className="font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                {creator.bio}
              </p>
            )}

            <div className="border-t border-[var(--border)] pt-6">
              <p className="font-sans text-[12px] leading-[1.55] text-[var(--text-muted)]">
                Your tip is processed via Paystack. {creator.name} receives the
                full amount minus payment processor fees on the next payout
                cycle.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
