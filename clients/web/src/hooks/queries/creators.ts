import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { schemas, unwrap } from '@/lib/api'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export interface UseCreatorsParams {
  search?: string
  limit?: number
  offset?: number
}

export const useCreators = (
  parameters?: UseCreatorsParams,
  options?: {
    initialData?: schemas['CreatorSummarySchema'][]
    keepPreviousData?: boolean
    staleTime?: number
  },
) =>
  useQuery({
    queryKey: ['creators', parameters || {}],
    queryFn: () =>
      unwrap(
        api.GET('/v1/organizations/creators', {
          params: {
            query: {
              search: parameters?.search,
              limit: parameters?.limit || 100,
              offset: parameters?.offset || 0,
            },
          },
        }),
      ),
    retry: defaultRetry,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: options?.initialData,
  })

export const useCreator = (
  slug?: string | null,
  options?: {
    initialData?: schemas['CreatorStorefrontSchema']
    staleTime?: number
  },
) =>
  useQuery({
    queryKey: ['creators', { slug }],
    queryFn: () =>
      unwrap(
        api.GET('/v1/organizations/creators/{slug}', {
          params: { path: { slug: slug ?? '' } },
        }),
      ),
    retry: defaultRetry,
    enabled: !!slug,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: options?.initialData,
  })

export interface CreatorCategoryOption {
  id: string
  slug: string
  name: string
  display_order: number
}

/**
 * Backoffice-managed creator categories, surfaced as the /creators directory
 * filter and the onboarding / settings picker. Callers prepend the UI-only
 * "All" tab.
 */
export const useCreatorCategories = (options?: {
  initialData?: CreatorCategoryOption[]
}) =>
  useQuery({
    queryKey: ['creator-categories'],
    queryFn: () =>
      unwrap((api as any).GET('/v1/creator-categories/')) as Promise<
        CreatorCategoryOption[]
      >,
    retry: defaultRetry,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: options?.initialData,
  })

export const useUpdateProfile = (organizationId: string) =>
  useMutation({
    mutationFn: (body: schemas['ProfileUpdateSchema']) => {
      return api.PATCH('/v1/organizations/{id}/profile', {
        params: { path: { id: organizationId } },
        body,
      })
    },
    onSuccess: async (result) => {
      const { data, error } = result
      if (error) {
        return
      }

      const queryClient = getQueryClient()

      queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId],
      })

      queryClient.invalidateQueries({
        queryKey: ['creators', { slug: data.slug }],
      })

      queryClient.invalidateQueries({
        queryKey: ['creators'],
      })
    },
  })
