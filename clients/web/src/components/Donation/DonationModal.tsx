'use client'

import { useInitiateDonation } from '@/hooks/queries/donations'
import { setValidationErrors } from '@/utils/api/errors'
import Button from '@/components/atoms/Button'
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
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  organizationName: string
}

interface DonationFormData {
  amount: string
  donor_name: string
  donor_email: string
  message?: string
}

export const DonationModal = ({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}: DonationModalProps) => {
  const form = useForm<DonationFormData>()
  const { control, handleSubmit, setError, reset } = form
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const initiateDonation = useInitiateDonation()

  const onSubmit: SubmitHandler<DonationFormData> = async (data) => {
    setErrorMessage(null)
    setLoading(true)

    const amountInCents = Math.round(parseFloat(data.amount) * 100)

    if (amountInCents < 100 || amountInCents > 1000000) {
      setError('amount', {
        type: 'manual',
        message: 'Amount must be between 1.00 and 10,000.00',
      })
      setLoading(false)
      return
    }

    const { data: result, error } = await initiateDonation.mutateAsync({
      organization_id: organizationId,
      amount: amountInCents,
      donor_name: data.donor_name,
      donor_email: data.donor_email,
      message: data.message || undefined,
    })

    setLoading(false)

    if (error) {
      if (error.detail && Array.isArray(error.detail)) {
        setValidationErrors(error.detail, setError)
        const generalError = error.detail.find(
          (err) => !Array.isArray(err.loc) || err.loc.length === 0,
        )
        if (generalError?.msg) {
          setErrorMessage(generalError.msg)
        }
      } else if (typeof error.detail === 'string') {
        setErrorMessage(error.detail)
      } else {
        setErrorMessage(
          'An error occurred while processing your donation. Please try again.',
        )
      }
      return
    }

    if (result?.payment_url) {
      window.location.href = result.payment_url
    }
  }

  const handleClose = () => {
    reset()
    setErrorMessage(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Support {organizationName}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Make a one-time donation to support this creator
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="flex flex-col gap-3 sm:gap-4"
            onSubmit={handleSubmit(onSubmit)}
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
                  if (amount < 1) {
                    return 'Minimum donation is 1.00'
                  }
                  if (amount > 10000) {
                    return 'Maximum donation is 10,000.00'
                  }
                  return true
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-500 sm:text-base">
                        KES
                      </span>
                      <Input
                        type="text"
                        placeholder="100.00"
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
              rules={{
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Your Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="John Doe"
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
                  <FormLabel className="text-sm">Your Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Leave a message for the creator..."
                      className="resize-none text-base sm:text-sm"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                loading={loading}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Continue to Payment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
