import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  product_count: number
  display_order: number
}

export interface CategoryWithProducts extends Category {
  products: any[]
}

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.GET('/v1/categories/')
      return unwrap(response)
    },
    retry: defaultRetry,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

export const useCategoryBySlug = (slug: string) =>
  useQuery({
    queryKey: ['categories', 'slug', slug],
    queryFn: async () => {
      const response = await api.GET('/v1/categories/{slug}', {
        params: { path: { slug } },
      })
      return unwrap(response)
    },
    retry: defaultRetry,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!slug,
  })

export interface UseCategoryProductsParams {
  slug: string
  page?: number
  limit?: number
}

export const useCategoryProducts = (
  parameters: UseCategoryProductsParams,
  options?: {
    keepPreviousData?: boolean
  },
) =>
  useQuery({
    queryKey: ['categories', 'products', parameters],
    queryFn: async () => {
      const response = await api.GET('/v1/categories/{slug}/products', {
        params: {
          path: { slug: parameters.slug },
          query: {
            page: parameters.page || 1,
            limit: parameters.limit || 24,
          },
        },
      })
      return unwrap(response)
    },
    retry: defaultRetry,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!parameters.slug,
  })
