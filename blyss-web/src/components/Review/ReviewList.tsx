'use client'

import { useAuth } from '@/hooks/auth'
import {
  ProductReview,
  useDeleteReview,
  useProductReviews,
  useUpdateReview,
} from '@/hooks/queries/reviews'
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
import { format } from 'date-fns'
import { Edit2, Star, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

interface ReviewListProps {
  productId: string
  limit?: number
}

interface EditReviewFormData {
  rating: number
  review_text?: string
}

const ReviewItem = ({
  review,
  isOwner,
  onEdit,
  onDelete,
}: {
  review: ProductReview
  isOwner: boolean
  onEdit: (review: ProductReview) => void
  onDelete: (reviewId: string) => void
}) => {
  return (
    <div className="border-b border-gray-200 py-4 last:border-b-0 sm:py-6 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 gap-2 sm:gap-3">
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 sm:h-10 sm:w-10 dark:bg-gray-800">
            {review.user_avatar ? (
              <img
                src={review.user_avatar}
                alt={review.user_name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">
                {review.user_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Review Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="truncate font-medium">{review.user_name}</span>
              {review.is_verified_purchase && (
                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Verified Purchase
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="mb-2 flex gap-0.5 sm:gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                    value <= review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Review Text */}
            {review.review_text && (
              <p className="mb-2 text-sm break-words text-gray-700 dark:text-gray-300">
                {review.review_text}
              </p>
            )}

            {/* Date */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {format(new Date(review.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Edit/Delete Buttons */}
        {isOwner && (
          <div className="flex shrink-0 gap-1 sm:gap-2">
            <button
              onClick={() => onEdit(review)}
              className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              aria-label="Edit review"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(review.id)}
              className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-red-400"
              aria-label="Delete review"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const EditReviewForm = ({
  review,
  onCancel,
  onSuccess,
}: {
  review: ProductReview
  onCancel: () => void
  onSuccess: () => void
}) => {
  const form = useForm<EditReviewFormData>({
    defaultValues: {
      rating: review.rating,
      review_text: review.review_text || '',
    },
  })
  const { control, handleSubmit, setError, watch, setValue } = form
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hoveredRating, setHoveredRating] = useState(0)
  const updateReview = useUpdateReview()

  const rating = watch('rating')
  const reviewText = watch('review_text') || ''
  const charCount = reviewText.length
  const maxChars = 1000

  const onSubmit: SubmitHandler<EditReviewFormData> = async (data) => {
    setErrorMessage(null)
    setLoading(true)

    const { data: result, error } = await updateReview.mutateAsync({
      id: review.id,
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
          'An error occurred while updating your review. Please try again.',
        )
      }
      return
    }

    if (result) {
      onSuccess()
    }
  }

  const handleStarClick = (value: number) => {
    setValue('rating', value, { shouldValidate: true })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between sm:mb-3">
        <h4 className="text-sm font-medium sm:text-base">Edit Review</h4>
        <button
          onClick={onCancel}
          className="rounded p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          aria-label="Cancel editing"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Form {...form}>
        <form
          className="flex flex-col gap-2 sm:gap-3"
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
                  <div className="flex gap-0.5 sm:gap-1">
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
                          className={`h-5 w-5 sm:h-6 sm:w-6 ${
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
                    rows={3}
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
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              loading={loading}
              disabled={loading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export const ReviewList = ({ productId, limit = 50 }: ReviewListProps) => {
  const { currentUser } = useAuth()
  const { data: reviewsData, isLoading } = useProductReviews(productId, limit)
  const deleteReview = useDeleteReview()
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)

  const reviews = reviewsData?.items || []

  const handleEdit = (review: ProductReview) => {
    setEditingReviewId(review.id)
  }

  const handleCancelEdit = () => {
    setEditingReviewId(null)
  }

  const handleEditSuccess = () => {
    setEditingReviewId(null)
  }

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return
    }

    setDeletingReviewId(reviewId)
    await deleteReview.mutateAsync(reviewId)
    setDeletingReviewId(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No reviews yet
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="p-4 sm:p-6">
        <h3 className="mb-3 text-base font-semibold sm:mb-4 sm:text-lg">
          Reviews
        </h3>
        <div>
          {reviews.map((review) => {
            const isOwner = currentUser?.id === review.user_id
            const isEditing = editingReviewId === review.id

            if (isEditing) {
              return (
                <EditReviewForm
                  key={review.id}
                  review={review}
                  onCancel={handleCancelEdit}
                  onSuccess={handleEditSuccess}
                />
              )
            }

            return (
              <ReviewItem
                key={review.id}
                review={review}
                isOwner={isOwner}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
