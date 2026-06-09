'use client'

import type { schemas } from '@/lib/api'

import {
  DEFAULT_LOCALE,
  useTranslations,
  type AcceptedLocale,
} from '@/lib/i18n'
import type {
  ConfirmationToken,
  Stripe,
  StripeElements,
  StripeError,
} from '@stripe/stripe-js'
import { createContext, useCallback, useContext, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useAuth } from '@/hooks/auth'
import { useForm } from 'react-hook-form'
import { setValidationErrors } from '../utils/form'
import { useCheckout } from './CheckoutProvider'

const stub = (): never => {
  throw new Error(
    'You forgot to wrap your component in <CheckoutFormProvider>.',
  )
}

export interface CheckoutFormContextProps {
  checkout: schemas['CheckoutPublic']
  form: UseFormReturn<schemas['CheckoutUpdatePublic']>
  update: (
    data: schemas['CheckoutUpdatePublic'],
  ) => Promise<schemas['CheckoutPublic']>
  confirm: (
    data: any,
    stripe?: Stripe | null,
    elements?: StripeElements | null,
  ) => Promise<schemas['CheckoutPublicConfirmed']>
  loading: boolean
  loadingLabel: string | undefined
  isUpdatePending: boolean
}

// @ts-expect-error
export const CheckoutFormContext = createContext<CheckoutFormContextProps>(stub)

export const CheckoutFormProvider = ({
  children,
  locale = DEFAULT_LOCALE,
}: React.PropsWithChildren<{ locale?: AcceptedLocale }>) => {
  const { checkout, update: updateOuter, confirm: confirmOuter } = useCheckout()
  const t = useTranslations(locale)
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState<string | undefined>()
  const [isUpdatePending, setIsUpdatePending] = useState(false)
  // Pre-populate the checkout form from the signed-in user when the checkout
  // doesn't already carry their email/name. Saves the buyer from re-typing
  // identity data Blyss already has. Anonymous checkouts fall through to
  // empty defaults as before.
  const { currentUser } = useAuth()
  const prefilledEmail =
    (checkout.customer_email as string | null | undefined) ||
    currentUser?.email ||
    null
  const prefilledName =
    (checkout.customer_name as string | null | undefined) ||
    (currentUser as { name?: string | null } | undefined)?.name ||
    null

  const form = useForm<schemas['CheckoutUpdatePublic']>({
    defaultValues: {
      ...checkout,
      customer_email: prefilledEmail,
      customer_name: prefilledName,
      customer_billing_address: checkout.customer_billing_address as
        | schemas['AddressInput'] // We need to typecast here for some reason (it tries to match all_countries to supported_countries)
        | null,
      discount_code: checkout.discount ? checkout.discount.code : undefined,
      allow_trial: undefined,
    },
    shouldUnregister: true,
  })
  const { setError } = form

  const update = useCallback(
    async (
      checkoutUpdatePublic: schemas['CheckoutUpdatePublic'],
    ): Promise<schemas['CheckoutPublic']> => {
      setIsUpdatePending(true)
      const { ok, value, error } = await updateOuter(
        checkoutUpdatePublic,
      ).finally(() => {
        setIsUpdatePending(false)
      })
      if (ok) {
        return value
      } else {
        if (error) {
          switch (error.error) {
            case 'PolarRequestValidationError':
              console.log('validation error', { error })
              setValidationErrors(error.detail, setError)
              break
            case 'AlreadyActiveSubscriptionError':
            case 'NotOpenCheckout':
            case 'PaymentNotReady':
              setError('root', { message: error.detail })
              break
            case 'ResourceNotFound':
            case 'ExpiredCheckoutError':
              break
          }
        }
        throw error
      }
    },
    [updateOuter, setError],
  )

  const _confirm = useCallback(
    async (
      checkoutConfirmStripe: schemas['CheckoutConfirmStripe'],
    ): Promise<schemas['CheckoutPublicConfirmed']> => {
      const { ok, value, error } = await confirmOuter(checkoutConfirmStripe)

      if (ok) {
        return value
      }

      if (error) {
        switch (error.error) {
          case 'PolarRequestValidationError':
            setValidationErrors(error.detail, setError)
            break
          case 'PaymentError':
          case 'AlreadyActiveSubscriptionError':
          case 'NotOpenCheckout':
          case 'PaymentNotReady':
            setError('root', { message: error.detail })
            break
          case 'TrialAlreadyRedeemed':
            setError('root', { message: error.detail })
            await update({ allow_trial: false })
            break
          case 'ResourceNotFound':
          case 'ExpiredCheckoutError':
            break
        }
      }

      throw error
    },
    [confirmOuter, setError],
  )

  const confirm = useCallback(
    async (
      data: any,
      stripe?: Stripe | null,
      elements?: StripeElements | null,
    ): Promise<schemas['CheckoutPublicConfirmed']> => {
      setLoading(true)

      // Handle non-payment forms (free products)
      if (!checkout.is_payment_form_required) {
        setLoadingLabel(t('checkout.loading.processingOrder'))
        try {
          const checkoutConfirmed = await _confirm(data)
          return checkoutConfirmed
        } catch (error) {
          throw error
        } finally {
          setLoading(false)
        }
      }

      // Handle Paystack payments — Blyss's only processor in production.
      // The actual charge is fired by PaystackPaymentInterface via its
      // /charge/{channel} endpoint and polled for status. The form's
      // visible 'Pay now' button just dispatches a click on the hidden
      // <input data-paystack-channel-submit /> trigger inside the
      // PaystackPaymentInterface tree, which calls onPay(). After that,
      // the polling effect inside the interface handles success/failure
      // — there's no Stripe ConfirmationToken to mint here.
      //
      // CRITICAL: we MUST NOT return a CheckoutPublicConfirmed-shaped
      // object here. The outer @polar-sh/checkout-frontend SDK watches
      // for confirmed status on the resolved value of confirm() and
      // redirects to the success URL when it sees one. Our charge is
      // not actually confirmed at click-time — only the STK push has
      // been initiated. Returning a confirmed object made the page
      // 'redirect instantly' before the buyer ever saw the M-Pesa
      // PIN-prompt UI.
      //
      // Mode A (Paystack Inline JS popup): the form's confirm
      // callback in PaystackCheckoutForm now does TWO things:
      //   1. Hits /confirm to lock the checkout
      //   2. Opens Paystack's popup with the confirmed checkout's
      //      details (email + amount + subaccount + metadata)
      // The popup handles card / M-Pesa / 3DS / fraud signals and
      // returns a charge.success webhook to our backend which
      // creates the Order. Nothing for the SDK form-provider to
      // do here — the standard confirm path runs cleanly.

      // Handle Stripe payments
      if (!stripe || !elements) {
        setLoading(false)
        throw new Error('Stripe elements not provided')
      }

      setLoadingLabel(t('checkout.loading.processingPayment'))

      const { error: submitError } = await elements.submit()
      if (submitError) {
        // Don't show validation errors, as they are already shown in their form
        if (submitError.type !== 'validation_error') {
          setError('root', { message: submitError.message })
        }
        setLoading(false)
        throw new Error(submitError.message)
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
                name: data.customer_name || null,
                email: data.customer_email,
                address: {
                  line1: data.customer_billing_address?.line1 || null,
                  line2: data.customer_billing_address?.line2 || null,
                  postal_code:
                    data.customer_billing_address?.postal_code || null,
                  city: data.customer_billing_address?.city || null,
                  state: data.customer_billing_address?.state || null,
                  country: data.customer_billing_address?.country || null,
                },
                phone: null,
              },
            },
          },
        })
        confirmationToken = confirmationTokenResponse.confirmationToken
        error = confirmationTokenResponse.error
      } catch (error) {
        setLoading(false)
        throw error
      }

      if (!confirmationToken || error) {
        const fallbackMessage = t('checkout.loading.confirmationTokenFailed')
        setError('root', {
          message: error?.message || fallbackMessage,
        })
        setLoading(false)
        throw new Error(error?.message || fallbackMessage)
      }

      let updatedCheckout: schemas['CheckoutPublicConfirmed']
      try {
        updatedCheckout = await _confirm({
          ...data,
          confirmation_token_id: confirmationToken.id,
        })
      } catch (error) {
        setLoading(false)
        throw error
      }

      setLoadingLabel(t('checkout.loading.paymentSuccessful'))

      const { intent_status, intent_client_secret } =
        updatedCheckout.payment_processor_metadata

      if (intent_status === 'requires_action') {
        const { error } = await stripe.handleNextAction({
          clientSecret: intent_client_secret,
        })
        if (error) {
          setLoading(false)
          setError('root', { message: error.message })
          throw new Error(error.message)
        }
      }

      setLoading(false)
      return updatedCheckout
    },
    [checkout, setError, _confirm, t],
  )

  return (
    <CheckoutFormContext.Provider
      value={{
        checkout,
        form,
        update,
        confirm,
        loading,
        loadingLabel,
        isUpdatePending,
      }}
    >
      {children}
    </CheckoutFormContext.Provider>
  )
}

export const useCheckoutForm = () => {
  return useContext(CheckoutFormContext)
}
