import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { useQuery, useMutation } from '@tanstack/react-query'

/**
 * Hooks driving the inline Paystack-native checkout flow.
 *
 * The buyer pays inside Polar's own checkout UI — never redirected to
 * Paystack. These hooks talk to the backend's per-checkout endpoints:
 *
 *   GET  /v1/checkouts/client/{client_secret}/payment-channels
 *   POST /v1/checkouts/client/{client_secret}/charge
 *   POST /v1/checkouts/client/{client_secret}/charge/submit/{action}
 *   GET  /v1/checkouts/client/{client_secret}/payment-status
 *
 * The /charge endpoint accepts a `channel` discriminator and the
 * channel-specific fields. The backend translates that into Paystack's
 * /charge payload shape and returns a normalised response.
 */

export interface PaymentChannelProvider {
  code: string
  name: string
  country?: string
}

export interface PaymentChannel {
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
  providers?: PaymentChannelProvider[]
}

export interface ChargeRequest {
  channel: PaymentChannel['id']
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

export interface ChargeResponse {
  reference: string
  status: string
  display_text: string
  // Optional next-action / channel-specific extras
  ussd_code?: string
  qr_code?: string
  qr_image_url?: string
  account_number?: string
  account_name?: string
  bank_name?: string
  account_expires_at?: string | null
  redirect_url?: string
}

export interface PaymentStatus {
  status: 'pending' | 'success' | 'failed' | 'requires_action'
  message?: string | null
  next_action?: {
    type: 'otp' | 'pin' | 'phone' | 'birthday'
    display_text: string
  } | null
}

export const useCheckoutPaymentChannels = (clientSecret: string) =>
  useQuery({
    queryKey: ['checkout-payment-channels', clientSecret],
    queryFn: () =>
      unwrap(
        (api as any).GET(
          '/v1/checkouts/client/{client_secret}/payment-channels',
          { params: { path: { client_secret: clientSecret } } },
        ),
      ) as Promise<PaymentChannel[]>,
    staleTime: 60 * 1000,
    enabled: !!clientSecret,
  })

export const useCheckoutCharge = (clientSecret: string) =>
  useMutation({
    mutationFn: (body: ChargeRequest) =>
      unwrap(
        (api as any).POST('/v1/checkouts/client/{client_secret}/charge', {
          params: { path: { client_secret: clientSecret } },
          body,
        }),
      ) as Promise<ChargeResponse>,
  })

export const useCheckoutChargeSubmitStep = (clientSecret: string) =>
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
          '/v1/checkouts/client/{client_secret}/charge/submit/{action}',
          {
            params: { path: { client_secret: clientSecret, action } },
            body: { value },
          },
        ),
      ) as Promise<ChargeResponse>,
  })

/**
 * Polls the payment-status endpoint while the charge is pending /
 * requires-action. Returns null until the first fetch completes.
 *
 * Refetch interval is short (3s) so the buyer sees state transitions
 * quickly. The server endpoint is idempotent.
 */
export const useCheckoutPaymentStatus = (
  clientSecret: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ['checkout-payment-status', clientSecret],
    queryFn: () =>
      unwrap(
        (api as any).GET(
          '/v1/checkouts/client/{client_secret}/payment-status',
          { params: { path: { client_secret: clientSecret } } },
        ),
      ) as Promise<PaymentStatus>,
    enabled: enabled && !!clientSecret,
    refetchInterval: (query) => {
      const data = query.state.data as PaymentStatus | undefined
      if (!data) return 3000
      if (data.status === 'success' || data.status === 'failed') return false
      return 3000
    },
    staleTime: 0,
    gcTime: 0,
  })
