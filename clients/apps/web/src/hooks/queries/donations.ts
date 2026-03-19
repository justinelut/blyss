import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { useMutation, useQuery } from '@tanstack/react-query'

export interface DonationCreate {
  organization_id: string
  amount: number
  donor_name: string
  donor_email: string
  message?: string
}

export interface DonationInitiateResponse {
  donation: {
    id: string
    amount: number
    currency: string
    donor_name: string
    donor_email: string
    message: string | null
    organization_id: string
    payment_reference: string
    payment_status: 'pending' | 'success' | 'failed'
    created_at: string
  }
  payment_url: string
}

export const useInitiateDonation = () =>
  useMutation({
    mutationFn: (body: DonationCreate) => {
      return api.POST('/v1/donation/initiate', { body })
    },
    onSuccess: async (result) => {
      if (result.error) {
        return
      }

      const queryClient = getQueryClient()
      queryClient.invalidateQueries({
        queryKey: ['donations'],
      })
    },
  })

export const useCreatorDonations = (organizationId: string) =>
  useQuery({
    queryKey: ['donations', 'creator', organizationId],
    queryFn: async () => {
      const result = await api.GET('/v1/donation/creator/{organization_id}', {
        params: {
          path: { organization_id: organizationId },
        },
      })

      if (result.error) {
        throw result.error
      }

      return result.data
    },
    enabled: !!organizationId,
  })
