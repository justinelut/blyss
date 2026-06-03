import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { operations, schemas, unwrap } from '@/lib/api'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export const useProducts = (
  organizationId: string | string[],
  parameters?: Omit<
    NonNullable<operations['products:list']['parameters']['query']>,
    'organization_id'
  >,
) =>
  useQuery({
    queryKey: ['products', { organizationId, ...(parameters || {}) }],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/', {
          params: {
            query: {
              organization_id: organizationId,
              is_archived:
                parameters?.is_archived === undefined
                  ? false
                  : parameters?.is_archived,
              ...(parameters || {}),
            },
          },
        }),
      ),
    retry: defaultRetry,
    placeholderData: keepPreviousData,
  })

export const useSelectedProducts = (id: string[], includeArchived = false) =>
  useQuery({
    queryKey: ['products', { id }],
    queryFn: async () => {
      const products: schemas['Product'][] = []
      let page = 1
      while (true) {
        const data = await unwrap(
          api.GET('/v1/products/', {
            params: {
              query: {
                id,
                is_archived: includeArchived ? null : false,
                page,
                limit: 1,
              },
            },
          }),
        )
        products.push(...data.items)
        if (data.pagination.max_page === page) {
          break
        }
        page++
      }
      return products
    },
    placeholderData: keepPreviousData,
    retry: defaultRetry,
    enabled: id.length > 0,
  })

export const useProduct = (id?: string | null) =>
  useQuery({
    queryKey: ['products', { id }],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{id}', { params: { path: { id: id ?? '' } } }),
      ),
    retry: defaultRetry,
    enabled: !!id,
  })

export const useCreateProduct = (organization: schemas['Organization']) =>
  useMutation({
    mutationFn: (body: schemas['ProductCreate']) => {
      return api.POST('/v1/products/', { body })
    },
    onSuccess: async (result) => {
      if (result.error) {
        return
      }

      getQueryClient().invalidateQueries({
        queryKey: ['products', { organizationId: organization.id }],
      })
    },
  })

export const useUpdateProduct = (organization: schemas['Organization']) =>
  useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: schemas['ProductUpdate']
    }) => {
      return api.PATCH('/v1/products/{id}', {
        params: { path: { id } },
        body,
      })
    },
    onSuccess: async (result, variables) => {
      if (result.error) {
        return
      }
      const queryClient = getQueryClient()
      queryClient.invalidateQueries({
        queryKey: ['products', { organizationId: organization.id }],
      })
      queryClient.invalidateQueries({
        queryKey: ['products', { id: variables.id }],
      })
    },
  })

export const useUpdateProductBenefits = (
  organization: schemas['Organization'],
) =>
  useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: schemas['ProductBenefitsUpdate']
    }) => {
      return api.POST('/v1/products/{id}/benefits', {
        params: { path: { id } },
        body,
      })
    },
    onSuccess: async (result, variables) => {
      if (result.error) {
        return
      }
      const queryClient = getQueryClient()
      queryClient.invalidateQueries({
        queryKey: ['products', { organizationId: organization.id }],
      })

      queryClient.invalidateQueries({
        queryKey: ['products', { id: variables.id }],
      })
    },
  })

export interface UsePublicProductsParams {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price_asc' | 'price_desc'
  isFeatured?: boolean
  /** true = subscriptions only, false = one-time only, undefined = both */
  isRecurring?: boolean
  /** Filter by creator/organization id */
  organizationId?: string
  page?: number
  limit?: number
}

export const usePublicProducts = (
  parameters?: UsePublicProductsParams,
  options?: {
    initialData?: { items: schemas['Product'][]; pagination: any }
    keepPreviousData?: boolean
    staleTime?: number
  },
) =>
  useQuery({
    queryKey: ['products', 'public', parameters || {}],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/public', {
          params: {
            query: {
              search: parameters?.search,
              category: parameters?.category,
              min_price: parameters?.minPrice,
              max_price: parameters?.maxPrice,
              sort: parameters?.sort || 'newest',
              is_featured: parameters?.isFeatured,
              is_recurring: parameters?.isRecurring,
              organization_id: parameters?.organizationId,
              page: parameters?.page || 1,
              limit: parameters?.limit || 24,
            } as Record<string, unknown>,
          },
        }),
      ),
    retry: defaultRetry,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: options?.initialData,
  })

export interface ProductCategory {
  id: string
  name: string
  count: number
}

export const useProductCategories = () =>
  useQuery({
    queryKey: ['products', 'categories'],
    queryFn: async () => {
      const result = await unwrap(
        api.GET('/v1/products/public', {
          params: {
            query: {
              limit: 100,
              page: 1,
            },
          },
        }),
      )

      const categoryMap = new Map<string, number>()

      result.items.forEach((product) => {
        const category = product.metadata?.category as string | undefined
        if (category) {
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
        }
      })

      const categories: ProductCategory[] = Array.from(
        categoryMap.entries(),
      ).map(([name, count]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        count,
      }))

      return categories.sort((a, b) => a.name.localeCompare(b.name))
    },
    retry: defaultRetry,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

export const useProductBySlug = (slug: string) =>
  useQuery({
    queryKey: ['products', 'slug', slug],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{slug}', {
          params: { path: { slug } },
        }),
      ),
    retry: defaultRetry,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

export const useRelatedProducts = (productId: string, limit: number = 4) =>
  useQuery({
    queryKey: ['products', 'related', productId, limit],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{id}/related', {
          params: {
            path: { id: productId },
            query: { limit },
          },
        }),
      ),
    retry: defaultRetry,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
