import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { getQueryClient } from '@/utils/api/query'
import {
  keepPreviousData,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
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
    queryFn: () => unwrap(api.GET('/v1/categories/')),
    retry: defaultRetry,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

export const useCategoryBySlug = (slug: string) =>
  useQuery({
    queryKey: ['categories', 'slug', slug],
    queryFn: () =>
      unwrap(
        api.GET('/v1/categories/{slug}', {
          params: { path: { slug } },
        }),
      ),
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
    queryFn: () =>
      unwrap(
        api.GET('/v1/categories/{slug}/products', {
          params: {
            path: { slug: parameters.slug },
            query: {
              page: parameters.page || 1,
              limit: parameters.limit || 24,
            },
          },
        }),
      ),
    retry: defaultRetry,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!parameters.slug,
  })


/**
 * Read the categories currently assigned to a product. The picker on
 * the product-edit form pre-fills its <Select> from this so creators
 * see what they had set last time. Returns an empty array for products
 * that have never been categorised.
 *
 * The endpoint is newer than the generated OpenAPI client, so we cast
 * to `any` (same approach as donations / me-orders hooks).
 */
export const useProductCategories = (productId: string | undefined) =>
  useQuery({
    queryKey: ['categories', 'by-product', productId],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/categories/by-product/{product_id}', {
          params: { path: { product_id: productId } },
        }),
      ) as Promise<Category[]>,
    retry: defaultRetry,
    enabled: !!productId,
    staleTime: 30 * 1000,
  })

/**
 * Assign a product to a category. Used by the create + edit product
 * forms after the product itself is saved. Pairs with
 * useUnassignProductFromCategory to support the single-select UI on
 * top of the many-to-many backend.
 */
export const useAssignProductToCategory = () => {
  const queryClient = getQueryClient()
  return useMutation({
    mutationFn: (vars: { product_id: string; category_id: string }) =>
      unwrap(
        api.POST('/v1/categories/assignments', {
          body: vars,
        }),
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['categories', 'by-product', vars.product_id],
      })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export const useUnassignProductFromCategory = () => {
  const queryClient = getQueryClient()
  return useMutation({
    mutationFn: (vars: { product_id: string; category_id: string }) =>
      unwrap(
        api.DELETE('/v1/categories/assignments/{product_id}/{category_id}', {
          params: { path: vars },
        }),
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['categories', 'by-product', vars.product_id],
      })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

/**
 * Backoffice CRUD mutations. List + read use useCategories /
 * useCategoryBySlug above. These three drive the
 * /backoffice/categories management surface.
 */
export const useCreateCategory = () => {
  const queryClient = getQueryClient()
  return useMutation({
    mutationFn: (vars: {
      name: string
      slug: string
      description?: string | null
      display_order?: number
    }) =>
      unwrap(
        api.POST('/v1/categories/', {
          body: { display_order: 0, ...vars },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export const useUpdateCategory = () => {
  const queryClient = getQueryClient()
  return useMutation({
    mutationFn: (vars: {
      id: string
      name?: string | null
      description?: string | null
      display_order?: number | null
      is_active?: boolean | null
    }) => {
      const { id, ...body } = vars
      return unwrap(
        api.PUT('/v1/categories/{id}', {
          params: { path: { id } },
          body,
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export const useDeleteCategory = () => {
  const queryClient = getQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.DELETE('/v1/categories/{id}', {
          params: { path: { id } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
