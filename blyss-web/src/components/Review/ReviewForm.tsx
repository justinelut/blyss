'use client'

import { useAuth } from '@/hooks/auth'
import { useCreateReview } from '@/hooks/queries/reviews'
import { setValidationErrors } from '@/utils/api/errors'
import Button from '@/components/atoms/Button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

interface ReviewFormProps {
  productId: string
  orderId?: string
  hasVerifiedPurchase: boolean
  onSuccess?: () => void
}

interface ReviewFormData {
  rating: number
  review_text?: string
}

export const ReviewForm = ({
  productId,
  orderId,
  hasVerifiedPurchase,
  onSuccess,
}: ReviewFormProps) => {
  const { authenticated } = useAuth()
  const form = useForm<ReviewFormData>({
    defaultValues: {
      rating: 0,
      review_text: '',
    },
  })
  const { control, handleSubmit, setError, watch, setValue } = form
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hoveredRating, setHoveredRating] = useState(0)
  const createReview = useCreateReview()

  const rating = watch('rating')
  const reviewText = watch('review_text') || ''
  const charCount = reviewText.length
  const maxChars = 1000

  if (!authenticated) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please log in to leave a review
        </p>
      </div>
    )
  }

  if (!hasVerifiedPurchase) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You must purchase this product before leaving a review
        </p>
      </div>
    )
  }

  const onSubmit: SubmitHandler<ReviewFormData> = async (data) => {
    if (!orderId) {
      setErrorMessage('Order ID is required to submit a review')
      return
    }

    if (data.rating === 0) {
      setError('rating', {
        type: 'manual',
        message: 'Please select a rating',
      })
      return
    }

    setErrorMessage(null)
    setLoading(true)

    const { data: result, error } = await createReview.mutateAsync({
      product_id: productId,
      order_id: orderId,
      rating: data.rating,
      review_text: data.review_text || undefined,
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
          'An error occurred while submitting your review. Please try again.',
        )
      }
      return
    }

    if (result) {
      form.reset()
      onSuccess?.()
    }
  }

  const handleStarClick = (value: number) => {
    setValue('rating', value, { shouldValidate: true })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-950">
      <h3 className="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">
        Write a Review
      </h3>

      <Form {...form}>
        <form
          className="flex flex-col gap-3 sm:gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            control={control}
            name="rating"
            rules={{
              required: 'Rating is required',
              min: { value: 1, message: 'Please select a rating' },
              max: { value: 5, message: 'Rating must be between 1 and 5' },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Rating</FormLabel>
                <FormControl>
                  <div className="flex gap-1 sm:gap-1.5">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleStarClick(value)}
                        onMouseEnter={() => setHoveredRating(value)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="touch-manipulation transition-transform active:scale-95 sm:hover:scale-110"
                        aria-label={`Rate ${value} stars`}
                      >
                        <Star
                          className={`h-7 w-7 sm:h-8 sm:w-8 ${
                            value <= (hoveredRating || rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="review_text"
            rules={{
              maxLength: {
                value: maxChars,
                message: `Review must be ${maxChars} characters or less`,
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Review (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Share your experience with this product..."
                    className="resize-none text-base sm:text-sm"
                    rows={4}
                    maxLength={maxChars}
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <FormMessage />
                  <span>
                    {charCount}/{maxChars}
                  </span>
                </div>
              </FormItem>
            )}
          />

          {errorMessage && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="default"
              loading={loading}
              disabled={loading || rating === 0}
            >
              Submit Review
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
