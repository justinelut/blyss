'use client'

import { useSubscribeToNewsletter } from '@/hooks/queries/newsletter'
import { setValidationErrors } from '@/utils/api/errors'
import Button from '@polar-sh/ui/components/atoms/Button'
import Input from '@polar-sh/ui/components/atoms/Input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@polar-sh/ui/components/ui/form'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

interface NewsletterSubscriptionFormProps {
  organizationId: string
}

interface NewsletterFormData {
  email: string
}

export const NewsletterSubscriptionForm = ({
  organizationId,
}: NewsletterSubscriptionFormProps) => {
  const form = useForm<NewsletterFormData>()
  const { control, handleSubmit, setError, reset } = form
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const subscribeToNewsletter = useSubscribeToNewsletter()

  const onSubmit: SubmitHandler<NewsletterFormData> = async ({ email }) => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setLoading(true)

    const { error } = await subscribeToNewsletter.mutateAsync({
      email,
      organization_id: organizationId,
    })

    setLoading(false)

    if (error) {
      if (error.detail && Array.isArray(error.detail)) {
        const emailError = error.detail.find(
          (err) => Array.isArray(err.loc) && err.loc.includes('email'),
        )
        if (emailError?.msg) {
          setErrorMessage(emailError.msg)
        }
        setValidationErrors(error.detail, setError)
      } else if (typeof error.detail === 'string') {
        if (
          error.detail.toLowerCase().includes('already subscribed') ||
          error.detail.toLowerCase().includes('existing subscription')
        ) {
          setErrorMessage('This email is already subscribed to the newsletter.')
        } else {
          setErrorMessage(error.detail)
        }
      } else {
        setErrorMessage(
          'An error occurred while subscribing. Please try again.',
        )
      }
      return
    }

    setSuccessMessage(
      'Successfully subscribed! Check your email for confirmation.',
    )
    reset()
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
        Subscribe to Newsletter
      </h3>
      <p className="mb-3 text-sm text-gray-600 sm:mb-4 dark:text-gray-400">
        Get updates about new products and exclusive offers
      </p>

      <Form {...form}>
        <form
          className="flex w-full flex-col gap-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field }) => {
              return (
                <FormItem>
                  <FormControl className="w-full">
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                      <Input
                        type="email"
                        required
                        placeholder="Enter your email"
                        autoComplete="email"
                        className="flex-1 text-base sm:text-sm"
                        {...field}
                      />
                      <Button
                        type="submit"
                        variant="default"
                        loading={loading}
                        disabled={loading}
                        className="w-full sm:w-auto"
                      >
                        Subscribe
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />

          {successMessage && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {errorMessage}
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
