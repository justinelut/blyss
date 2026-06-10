import { getQueryClient } from '@/utils/api/query'
import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { formatApiError } from '@/lib/api/format-error'
import { toast } from '@/components/Toast/use-toast'
import { useMutation, useQuery } from '@tanstack/react-query'

/**
 * Inline Paystack-native tipping hooks.
 *
 * These mirror the buyer-checkout inline charge hooks (checkoutPaystack.ts) so
 * the DonationModal can reuse the same channel selector + polling cadence. The
 * donor pays inside Blyss's own UI — never redirected to a Paystack hosted
 * page. They talk to the creator-storefront donation endpoints:
 *
 *   GET  /v1/donation/{slug}/payment-channels
 *   POST /v1/donation/{slug}/                       (initiate tip charge)
 *   POST /v1/donation/charge/submit/{action}/{ref}  (OTP / PIN / phone step)
 *   GET  /v1/donation/payment-status/{ref}          (poll)
 *
 * The endpoints are newer than the generated OpenAPI client, so we cast the
 * client to `any` for these calls (same approach as checkoutPaystack.ts).
 */

export interface DonationPaymentChannelProvider {
  code: string
  name: string
  country?: string
}

export interface DonationPaymentChannel {
  id:
    | 'card'
    | 'mobile_money'
    | 'bank'
    | 'bank_transfer'
    | 'ussd'
    | 'qr'
    | 'eft'
  name: string
  description: string
  fields: string[]
  providers?: DonationPaymentChannelProvider[]
}

export interface DonationChargeRequest {
  amount: number
  donor_name?: string
  donor_email: string
  message?: string
  channel: DonationPaymentChannel['id']
  // Card
  card_number?: string
  cvv?: string
  expiry_month?: string
  expiry_year?: string
  pin?: string
  // Mobile money
  phone?: string
  provider?: string
  // Bank
  bank_code?: string
  bank_account_number?: string
  // Bank transfer
  account_expires_at?: string | null
  // USSD / QR / EFT
  ussd_type?: string
  qr_provider?: string
  eft_provider?: string
}

export interface DonationChargeResponse {
  reference: string
  status: string
  display_text?: string
  ussd_code?: string
  qr_code?: string
  qr_image_url?: string
  account_number?: string
  account_name?: string
  bank_name?: string
  account_expires_at?: string | null
  redirect_url?: string
}

export interface DonationPaymentStatus {
  status: 'pending' | 'success' | 'failed' | 'requires_action'
  message?: string | null
  next_action?: {
    action?: 'otp' | 'pin' | 'phone' | 'birthday'
    display_text?: string
  } | null
}

export const useDonationPaymentChannels = (slug: string) =>
  useQuery({
    queryKey: ['donation-payment-channels', slug],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/donation/{slug}/payment-channels', {
          params: { path: { slug } },
        }),
      ) as Promise<DonationPaymentChannel[]>,
    staleTime: 60 * 1000,
    enabled: !!slug,
  })

export const useDonationCharge = (slug: string) =>
  useMutation({
    mutationFn: (body: DonationChargeRequest) =>
      unwrap(
        (api as any).POST('/v1/donation/{slug}/', {
          params: { path: { slug } },
          body,
        }),
      ) as Promise<DonationChargeResponse>,
    onError: (error: unknown) => {
      // Surface the actual backend / paystack error instead of the
      // silent fallthrough that left donors staring at a generic
      // 'Payment failed' panel. formatApiError handles all three
      // shapes: string detail (paystack-routed), array of validation
      // errors (FastAPI 422), or bare error.message (network).
      toast({
        title: 'Could not start the tip',
        description: formatApiError(
          error,
          'Try again, or pick a different payment method.',
        ),
        variant: 'error',
        duration: 4000,
      })
    },
  })

export const useDonationChargeSubmitStep = (reference: string) =>
  useMutation({
    mutationFn: ({
      action,
      value,
    }: {
      action: 'otp' | 'pin' | 'phone' | 'birthday'
      value: string
    }) =>
      unwrap(
        (api as any).POST(
          '/v1/donation/charge/submit/{action}/{reference}',
          {
            params: { path: { action, reference } },
            body: { value },
          },
        ),
      ) as Promise<DonationChargeResponse>,
  })

/**
 * Polls donation payment-status while pending / requires-action. Auto-stops on
 * success or failed. 3s cadence — matches useCheckoutPaymentStatus.
 */
export const useDonationPaymentStatus = (
  reference: string | null,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ['donation-payment-status', reference],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/donation/payment-status/{reference}', {
          params: { path: { reference } },
        }),
      ) as Promise<DonationPaymentStatus>,
    enabled: enabled && !!reference,
    refetchInterval: (query) => {
      const data = query.state.data as DonationPaymentStatus | undefined
      if (!data) return 3000
      if (data.status === 'success' || data.status === 'failed') return false
      return 3000
    },
    staleTime: 0,
    gcTime: 0,
  })

// ---------------------------------------------------------------------------
// Legacy hosted-redirect initiation (kept for the /donation/initiate endpoint
// and the creator dashboard donations list). The inline tip flow above is the
// canonical path for storefront tipping.
// ---------------------------------------------------------------------------

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
          query: { page: 1, limit: 50 },
        },
      })

      if (result.error) {
        throw result.error
      }

      return result.data
    },
    enabled: !!organizationId,
  })


export interface ReceivedTip {
  id: string
  amount: number
  currency: string
  donor_name: string
  donor_email: string
  message: string | null
  created_at: string
}

export interface TipsSummary {
  total_amount: number
  count: number
  currency: string
}

/** Tips received by a creator org — for the dashboard Tips page. */
export const useReceivedTips = (
  organizationId?: string,
  parameters?: { page?: number; limit?: number },
) =>
  useQuery({
    queryKey: ['donations', 'received', { organizationId, ...parameters }],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/donation/received', {
          params: {
            query: {
              organization_id: organizationId,
              ...(parameters?.page ? { page: parameters.page } : {}),
              ...(parameters?.limit ? { limit: parameters.limit } : {}),
            },
          },
        }),
      ) as Promise<{
        items: ReceivedTip[]
        pagination: { total_count: number; max_page: number }
      }>,
    enabled: !!organizationId,
  })

export const useTipsSummary = (organizationId?: string) =>
  useQuery({
    queryKey: ['donations', 'received', 'summary', { organizationId }],
    queryFn: () =>
      unwrap(
        (api as any).GET('/v1/donation/received/summary', {
          params: { query: { organization_id: organizationId } },
        }),
      ) as Promise<TipsSummary>,
    enabled: !!organizationId,
  })
