import {
  useAddCustomerPaymentMethod,
  useConfirmCustomerPaymentMethod,
} from '@/hooks/queries'
import { type Client } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { ThemingPresetProps } from '@/components/ui/hooks/theming'
import {
  Elements,
  ElementsConsumer,
  PaymentElement,
} from '@stripe/react-stripe-js'
import {
  loadStripe,
  type ConfirmationToken,
  type Stripe,
  type StripeElements,
  type StripeError,
} from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
export interface AddPaymentMethodModalProps {
  api: Client
  onPaymentMethodAdded: () => void
  setupIntentParams?: {
    setup_intent_client_secret: string
    setup_intent: string
  }
  hide: () => void
  themePreset: ThemingPresetProps
}

export const AddPaymentMethodModal = ({
  api,
  onPaymentMethodAdded,
  setupIntentParams,
  hide,
  themePreset,
}: AddPaymentMethodModalProps) => {
  // Only initialize Stripe if a publishable key is configured. Blyss runs
  // Paystack-only orgs (KE) where the Stripe env var is unset; calling
  // loadStripe('') triggers an IntegrationError that the customer portal
  // cannot recover from. When the key is absent, we render a "card adds
  // unavailable" state below.
  const stripePromise = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_KEY
    return key ? loadStripe(key) : null
  }, [])
  const addPaymentMethod = useAddCustomerPaymentMethod(api)
  const confirmPaymentMethod = useConfirmCustomerPaymentMethod(api)
  const [error, setError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  const confirm = useCallback(
    async (setupIntentId: string) => {
      const { error: validationError } = await confirmPaymentMethod.mutateAsync(
        {
          setup_intent_id: setupIntentId,
          set_default: true,
        },
      )

      if (validationError) {
        setError('Failed to add payment method, please try again later.')
        setLoading(false)
        return
      }

      setLoading(false)
      onPaymentMethodAdded()
    },
    [confirmPaymentMethod, onPaymentMethodAdded],
  )

  const handleSubmit = useCallback(
    async (
      event: React.FormEvent<HTMLFormElement>,
      stripe: Stripe | null,
      elements: StripeElements | null,
    ) => {
      event.preventDefault()
      if (!stripe || !elements) {
        return
      }

      setError(null)
      setLoading(true)
      const { error: submitError } = await elements.submit()

      if (submitError) {
        if (submitError.message) {
          setError(submitError.message)
        }
        setLoading(false)
        return
      }

      let confirmationToken: ConfirmationToken | undefined
      let error: StripeError | undefined
      try {
        const confirmationTokenResponse = await stripe.createConfirmationToken({
          elements,
          params: {
            payment_method_data: {
              // Stripe requires fields to be explicitly set to null if they are not provided
              billing_details: {
                name: null,
                email: null,
                address: {
                  line1: null,
                  line2: null,
                  postal_code: null,
                  city: null,
                  state: null,
                  country: null,
                },
                phone: null,
              },
            },
          },
        })
        confirmationToken = confirmationTokenResponse.confirmationToken
        error = confirmationTokenResponse.error
      } catch (err) {
        setLoading(false)
        setError('Failed to add payment method, please try again later.')
        return
      }

      if (!confirmationToken || error) {
        setLoading(false)
        setError('Failed to add payment method, please try again later.')
        return
      }

      const { error: validationError, data } =
        await addPaymentMethod.mutateAsync({
          confirmation_token_id: confirmationToken.id,
          set_default: true,
          return_url: window.location.href,
        })

      if (validationError) {
        setError('Failed to add payment method, please try again later.')
        setLoading(false)
        return
      }

      if (data.status === 'requires_action') {
        const { error: actionError, setupIntent } =
          await stripe.handleNextAction({
            clientSecret: data.client_secret,
          })
        if (actionError || !setupIntent) {
          setError(
            (actionError && actionError.message) ||
              'Failed to handle next action.',
          )
          setLoading(false)
          return
        }
        await confirm(setupIntent.id)
      } else {
        setLoading(false)
        onPaymentMethodAdded()
      }
    },
    [addPaymentMethod, confirm, onPaymentMethodAdded],
  )

  // Handle next action after a redirection
  const [confirmed, setConfirmed] = useState(false)
  const router = useRouter()
  useEffect(() => {
    if (setupIntentParams && !confirmed) {
      setConfirmed(true)
      ;(async () => {
        await confirm(setupIntentParams.setup_intent)
        // Remove setup intent params from the URL but keep customer_session_token
        const searchParams = new URLSearchParams(window.location.search)
        searchParams.delete('setup_intent_client_secret')
        searchParams.delete('setup_intent')
        router.replace(`${window.location.pathname}?${searchParams.toString()}`)
      })()
    }
  }, [setupIntentParams, confirm, confirmed])

  if (!stripePromise) {
    // Stripe isn't configured for this deployment. Surface a friendly
    // message rather than letting Stripe.js throw an IntegrationError
    // that the user cannot dismiss.
    return (
      <div className="flex flex-col gap-3 p-8 text-[var(--text-secondary)]">
        <p className="font-sans text-[14px]">
          Adding a saved card is unavailable for this storefront.
        </p>
        <p className="font-sans text-[13px] text-[var(--text-muted)]">
          Pay directly via M-Pesa or card during checkout instead.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <Elements
        stripe={stripePromise}
        options={{
          locale: 'en',
          mode: 'setup',
          paymentMethodCreation: 'manual',
          setupFutureUsage: 'off_session',
          currency: 'usd',
          appearance: themePreset.stripe,
        }}
      >
        <ElementsConsumer>
          {({ stripe, elements }) => (
            <form
              onSubmit={(e) => handleSubmit(e, stripe, elements)}
              className="flex flex-col gap-6"
            >
              <PaymentElement
                options={{
                  layout: 'tabs',
                  fields: {
                    billingDetails: {
                      name: 'never',
                      email: 'never',
                      phone: 'never',
                      address: 'never',
                    },
                  },
                }}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex flex-row items-center gap-2">
                <Button
                  type="submit"
                  className="self-start"
                  disabled={!stripe || loading}
                  loading={loading}
                >
                  Add payment method
                </Button>
                <Button variant="ghost" onClick={hide}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </ElementsConsumer>
      </Elements>
    </div>
  )
}
