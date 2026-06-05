'use client'

import Input from '@/components/atoms/Input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { DonationPaymentInterface } from './DonationPaymentInterface'

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Creator slug — the inline charge targets POST /v1/donation/{slug}/. */
  creatorSlug: string
  /** Creator display name shown in the modal header. */
  creatorName: string
}

interface DonationFormData {
  amount: string
  donor_name: string
  donor_email: string
  message?: string
}

// KES bounds — min 50, max 50,000 (whole KES in the form; converted to minor
// units for the charge).
const MIN_KES = 50
const MAX_KES = 50_000

/**
 * DonationModal — inline Paystack-native tipping.
 *
 * Collects amount (KES) + optional message + optional name, then renders the
 * DonationPaymentInterface channel selector inline. On success it flips to a
 * thank-you state and auto-closes after 3s. The donor never leaves Blyss — no
 * redirect to a Paystack hosted page.
 */
export const DonationModal = ({
  isOpen,
  onClose,
  creatorSlug,
  creatorName,
}: DonationModalProps) => {
  const form = useForm<DonationFormData>({
    mode: 'onChange',
    defaultValues: { amount: '', donor_name: '', donor_email: '', message: '' },
  })
  const { control, watch, reset, formState } = form
  const [succeeded, setSucceeded] = useState(false)
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleClose = () => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current)
    reset()
    setSucceeded(false)
    onClose()
  }

  // On success, auto-close after 3s.
  useEffect(() => {
    if (!succeeded) return
    autoCloseRef.current = setTimeout(() => {
      handleClose()
    }, 3000)
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [succeeded])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        {succeeded ? (
          <div
            className="flex flex-col items-center gap-3 py-8 text-center"
            data-testid="donation-success"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <DialogTitle className="text-lg sm:text-xl">
              Thank you for supporting {creatorName}!
            </DialogTitle>
            <DialogDescription className="text-sm">
              Your tip was received. A receipt is on its way to your email.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Support {creatorName}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Send a one-time tip to support this creator.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                className="flex flex-col gap-3 sm:gap-4"
                onSubmit={(e) => e.preventDefault()}
              >
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
                      <FormLabel className="text-sm">Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                            KES
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="500"
                            className="pl-14 text-base sm:text-sm"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="donor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Your name (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Jane"
                          className="text-base sm:text-sm"
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
                      <FormLabel className="text-sm">Your email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jane@example.com"
                          autoComplete="email"
                          className="text-base sm:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      <FormLabel className="text-sm">
                        Message (optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Leave a message for the creator…"
                          className="resize-none text-base sm:text-sm"
                          rows={3}
                          maxLength={200}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Inline channel selector — reuses the buyer-checkout
                    PaystackPaymentInterface shape. No redirect. */}
                <DonationPaymentInterface
                  slug={creatorSlug}
                  amount={amountMinorUnits}
                  donorEmail={donorEmail}
                  donorName={donorName}
                  message={message}
                  canPay={canPay}
                  onPaymentSuccess={() => setSucceeded(true)}
                />
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
