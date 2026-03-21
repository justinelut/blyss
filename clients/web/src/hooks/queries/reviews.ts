import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { useMutation, useQuery } from '@tanstack/react-query'

export interface ReviewCreate {
  product_id: string
  order_id: string
  rating: number
  review_text?: string
}

export interface ReviewUpdate {
  rating: number
  review_text?: string
}

export interface ProductReview {
  id: string
  product_id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  rating: number
  review_text: string | null
  is_verified_purchase: boolean
  created_at: string
  updated_at: string
}

export interface ProductRatingSummary {
  average_rating: number
  total_reviews: number
  rating_distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export const useProductReviews = (
  productId: string,
  limit: number = 50,
  offset: number = 0,
) =>
  useQuery({
    queryKey: ['reviews', 'product', productId, limit, offset],
    queryFn: async () => {
      const result = await api.GET('/v1/review/product/{product_id}', {
        params: {
          path: { product_id: productId },
          query: { limit, offset },
        },
      })

      if (result.error) {
        throw result.error
      }

      return result.data
    },
    enabled: !!productId,
  })

export const useProductRatingSummary = (productId: string) =>
  useQuery({
    queryKey: ['reviews', 'summary', productId],
    queryFn: async () => {
      const result = await api.GET('/v1/review/product/{product_id}/summary', {
        params: {
          path: { product_id: productId },
        },
      })

      if (result.error) {
        throw result.error
      }

      return result.data
    },
    enabled: !!productId,
  })

export const useCreateReview = () =>
  useMutation({
    mutationFn: (body: ReviewCreate) => {
      return api.POST('/v1/review/', { body })
    },
    onSuccess: async (result, variables) => {
      if (result.error) {
        return
      }

      const queryClient = getQueryClient()
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'product', variables.product_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'summary', variables.product_id],
      })
    },
  })

export const useUpdateReview = () =>
  useMutation({
    mutationFn: ({ id, ...body }: ReviewUpdate & { id: string }) => {
      return api.PUT('/v1/review/{id}', {
        params: { path: { id } },
        body,
      })
    },
    onSuccess: async (result) => {
      if (result.error) {
        return
      }

      const queryClient = getQueryClient()
      const review = result.data
      if (review && 'product_id' in review) {
        queryClient.invalidateQueries({
          queryKey: ['reviews', 'product', review.product_id],
        })
        queryClient.invalidateQueries({
          queryKey: ['reviews', 'summary', review.product_id],
        })
      }
    },
  })

export const useDeleteReview = () =>
  useMutation({
    mutationFn: (id: string) => {
      return api.DELETE('/v1/review/{id}', {
        params: { path: { id } },
      })
    },
    onSuccess: async (result, id) => {
      if (result.error) {
        return
      }

      const queryClient = getQueryClient()
      queryClient.invalidateQueries({
        queryKey: ['reviews'],
      })
    },
  })
