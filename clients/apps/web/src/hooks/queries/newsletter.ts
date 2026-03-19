import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { useMutation } from '@tanstack/react-query'

export interface NewsletterSubscriptionCreate {
  email: string
  organization_id: string
}

export const useSubscribeToNewsletter = () =>
  useMutation({
    mutationFn: (body: NewsletterSubscriptionCreate) => {
      return api.POST('/v1/newsletter/subscribe', { body })
    },
    onSuccess: async (result) => {
      if (result.error) {
        return
      }

      const queryClient = getQueryClient()
      queryClient.invalidateQueries({
        queryKey: ['newsletter', 'subscriptions'],
      })
    },
  })
