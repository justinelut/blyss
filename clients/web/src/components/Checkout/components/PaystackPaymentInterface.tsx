'use client'

import type { schemas } from '@/lib/api'
import { useTranslations, type AcceptedLocale } from '@/lib/i18n'
import Button from '@/components/atoms/Button'
import { cn } from '@/lib/utils'
import { useState } from 'react'

// Simple icon components to avoid external dependencies
const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15,3 21,3 21,9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
)

const SmartphoneIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
)

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
)

interface PaystackPaymentInterfaceProps {
  checkout: schemas['CheckoutPublic']
  locale?: AcceptedLocale
  disabled?: boolean
  onPaymentMethodSelect?: (method: string) => void
}

const PaystackPaymentInterface = ({
  checkout,
  locale = 'en',
  disabled = false,
  onPaymentMethodSelect,
}: PaystackPaymentInterfaceProps) => {
  const t = useTranslations(locale)
  const [selectedMethod, setSelectedMethod] = useState<string>('card')

  // Extract authorization URL from payment processor metadata
  const authorizationUrl = (
    checkout.payment_processor_metadata as {
      authorization_url?: string
    }
  ).authorization_url

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method)
    onPaymentMethodSelect?.(method)
  }

  const handlePaymentRedirect = () => {
    if (authorizationUrl) {
      window.open(authorizationUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const paymentMethods = [
    {
      id: 'card',
      name: 'Card Payment',
      description: 'Pay with your debit or credit card',
      icon: CreditCardIcon,
    },
    {
      id: 'mpesa',
      name: 'M-Pesa',
      description: 'Pay with your M-Pesa mobile money',
      icon: SmartphoneIcon,
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Pay directly from your bank account',
      icon: BuildingIcon,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Payment Method Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Choose Payment Method
        </h3>
        <div className="grid gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => handleMethodSelect(method.id)}
                disabled={disabled}
                className={cn(
                  'flex items-center space-x-3 rounded-lg border p-3 text-left transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-800',
                  selectedMethod === method.id
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2',
                    selectedMethod === method.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600',
                  )}
                >
                  {selectedMethod === method.id && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {method.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {method.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Payment Button */}
      {authorizationUrl && (
        <div className="space-y-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handlePaymentRedirect}
            disabled={disabled}
          >
            <ExternalLinkIcon className="mr-2 h-4 w-4" />
            Continue to Paystack
          </Button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            You will be redirected to Paystack to complete your payment securely
          </p>
        </div>
      )}

      {/* Payment Status */}
      {checkout.status === 'open' && (
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Payment pending - complete your payment on Paystack
            </p>
          </div>
        </div>
      )}

      {checkout.status === 'failed' && (
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Payment failed. Please try again or contact support.
          </p>
        </div>
      )}

      {/* Payment Methods Info */}
      <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
        <p className="font-medium">Supported payment methods:</p>
        <ul className="ml-4 space-y-1">
          <li>• Visa, Mastercard, and other major cards</li>
          <li>• M-Pesa mobile money (Kenya)</li>
          <li>• Bank transfers and direct debits</li>
        </ul>
      </div>
    </div>
  )
}

export default PaystackPaymentInterface
