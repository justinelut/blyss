'use client'

import { toast } from '@/components/Toast/use-toast'
import { useCustomerPaymentMethods } from '@/hooks/queries'
import { type Client, schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { ThemingPresetProps } from '@/components/ui/hooks/theming'
import { Elements, ElementsConsumer } from '@stripe/react-stripe-js'
import { Stripe, loadStripe } from '@stripe/stripe-js'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../Modal'
import { OrderPaymentRetry } from './OrderPaymentRetry'
import { SavedCardsSelector } from './SavedCardsSelector'

interface OrderPaymentRetryModalProps {
  order: schemas['CustomerOrder']
  api: Client
  isOpen: boolean
  onClose: () => void
  onSuccess?: (order: schemas['CustomerOrder']) => void
  themingPreset: ThemingPresetProps
}

export const OrderPaymentRetryModal = ({
  order,
  api,
  isOpen,
  onClose,
  onSuccess,
  themingPreset,
}: OrderPaymentRetryModalProps) => {
  const [error, setError] = useState<string>('')
  const [useNewCard, setUseNewCard] = useState<boolean>(false)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null)

  const { data: paymentMethodsData } = useCustomerPaymentMethods(api)
  const cardPaymentMethods = (paymentMethodsData?.items || []).filter(
    (pm): pm is schemas['PaymentMethodCard'] => pm.type === 'card',
  )

  // Mirror AddPaymentMethodModal: only init Stripe if NEXT_PUBLIC_STRIPE_KEY
  // is set. Blyss runs Paystack-only deployments where the env var is
  // empty; loading Stripe with '' triggers an unrecoverable
  // IntegrationError ("Please call Stripe() with your publishable key").
  // The "useNewCard" branch below already gates on `stripePromise`, so a
  // null promise simply hides the new-card form.
  const stripePromise = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_KEY
    return key ? loadStripe(key) : null
  }, [])

  // Resolve Stripe instance for saved payment methods that may require 3DS authentication
  const [stripe, setStripe] = useState<Stripe | null>(null)
  useEffect(() => {
    if (!stripePromise) return
    stripePromise.then(setStripe)
  }, [stripePromise])

  const handleClose = () => {
    setError('')
    setUseNewCard(false)
    setSelectedPaymentMethodId(null)
    onClose()
  }

  const handlePaymentSuccess = () => {
    toast({
      title: 'Payment Successful',
      description: 'Your payment has been processed successfully!',
    })
    onSuccess?.(order)
  }

  const handlePaymentError = (error: string) => {
    setError(error)
    // Reset selection on error so user can try again
    setUseNewCard(false)
    setSelectedPaymentMethodId(null)
    toast({
      title: 'Payment Failed',
      description: error,
      variant: 'error',
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      title="Update Payment Method"
      isShown={isOpen}
      hide={handleClose}
      modalContent={
        <>
          <div className="space-y-4 p-6">
            {/* Error State */}
            {error && (
              <div className="py-4 text-center">
                <p className="mb-4 text-red-600">{error}</p>
                <Button
                  onClick={() => {
                    setError('')
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Payment Method Selection or Payment Form */}
            {!error && (
              <>
                {!useNewCard && !selectedPaymentMethodId && (
                  <SavedCardsSelector
                    paymentMethods={cardPaymentMethods}
                    onSelectPaymentMethod={setSelectedPaymentMethodId}
                    onAddNewCard={() => setUseNewCard(true)}
                  />
                )}

                {selectedPaymentMethodId && stripe && (
                  <OrderPaymentRetry
                    order={order}
                    api={api}
                    stripe={stripe}
                    paymentMethodId={selectedPaymentMethodId}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onClose={handleClose}
                    onBack={() => setSelectedPaymentMethodId(null)}
                  />
                )}

                {useNewCard && stripePromise && (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      locale: 'en',
                      mode: 'payment',
                      amount: order.total_amount,
                      currency: order.currency,
                      setupFutureUsage: 'off_session',
                      paymentMethodCreation: 'manual',
                      appearance: themingPreset.stripe,
                    }}
                  >
                    <ElementsConsumer>
                      {({ stripe, elements }) => (
                        <OrderPaymentRetry
                          order={order}
                          stripe={stripe}
                          elements={elements}
                          api={api}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                          onClose={handleClose}
                          onBack={() => setUseNewCard(false)}
                        />
                      )}
                    </ElementsConsumer>
                  </Elements>
                )}
              </>
            )}
          </div>
        </>
      }
    />
  )
}
