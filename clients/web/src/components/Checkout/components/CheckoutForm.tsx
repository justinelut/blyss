'use client'

import type { schemas } from '@/lib/api'
import { enums } from '@/lib/api'
import { useTranslations, type AcceptedLocale } from '@/lib/i18n'
import Button from '@/components/atoms/Button'
import CountryPicker from '@/components/atoms/CountryPicker'
import CountryStatePicker from '@/components/atoms/CountryStatePicker'
import Input from '@/components/atoms/Input'
import { Checkbox } from '@/components/ui/checkbox'
import PaystackPaymentInterface from './PaystackPaymentInterface'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ThemingPresetProps } from '@/components/ui/hooks/theming'
import { cn } from '@/lib/utils'
import {
  Elements,
  ElementsConsumer,
  PaymentElement,
} from '@stripe/react-stripe-js'
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripeElementsOptions,
  StripePaymentElementChangeEvent,
} from '@stripe/stripe-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { UseFormReturn, WatchObserver } from 'react-hook-form'
import { hasProductCheckout, isLegacyRecurringProductPrice } from '../guards'
import { getPublicServerURL } from '@/utils/api'
import { useDebouncedCallback } from '../hooks/debounce'
import { isDisplayedField, isRequiredField } from '../utils/address'
import { convertLocaleToStripeElementLocale } from '../utils/locale'
import CustomFieldInput from './CustomFieldInput'
import PolarLogo from './PolarLogo'
import { usePaystackPublicKey } from '@/hooks/queries/paystackConfig'
import {
  paystackPop,
  generatePaystackReference,
} from '@/utils/paystack-pop'
import { toast } from '@/components/Toast/use-toast'

const WALLET_PAYMENT_METHODS = ['apple_pay', 'google_pay', 'link']

const XIcon = ({ className }: { className?: string }) => {
  return (
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

interface BaseCheckoutFormProps {
  form: UseFormReturn<schemas['CheckoutUpdatePublic']>
  checkout: schemas['CheckoutPublic']
  confirm: (data: any) => Promise<schemas['CheckoutPublicConfirmed']>
  update: (
    data: schemas['CheckoutUpdatePublic'],
  ) => Promise<schemas['CheckoutPublic']>
  loading: boolean
  loadingLabel: string | undefined
  disabled?: boolean
  isUpdatePending?: boolean
  themePreset: ThemingPresetProps
  locale?: AcceptedLocale
  isWalletPayment?: boolean
  beforeSubmit?: React.ReactNode
}

const BaseCheckoutForm = ({
  form,
  checkout,
  confirm,
  update,
  loading,
  loadingLabel,
  disabled,
  isUpdatePending,
  children,
  themePreset: themePresetProps,
  locale: localeProp,
  isWalletPayment,
  beforeSubmit,
}: React.PropsWithChildren<BaseCheckoutFormProps>) => {
  const interval = hasProductCheckout(checkout)
    ? isLegacyRecurringProductPrice(checkout.product_price)
      ? checkout.product_price.recurring_interval
      : checkout.product.recurring_interval
    : null
  const {
    control,
    handleSubmit,
    watch,
    clearErrors,
    resetField,
    setValue,
    formState: { errors },
  } = form

  const discount = checkout.discount
  const isDiscountWithoutCode = discount && discount.code === null

  const { is_business_customer: isBusinessCustomer } = checkout

  const locale: AcceptedLocale = localeProp || 'en'

  const t = useTranslations(locale)

  const country = watch('customer_billing_address.country')
  const watcher: WatchObserver<schemas['CheckoutUpdatePublic']> = useCallback(
    async (value, { name }) => {
      if (!name) {
        return
      }

      let payload: schemas['CheckoutUpdatePublic'] = {}
      // Update country, make sure to reset other address fields
      if (name === 'customer_billing_address.country') {
        const { customer_billing_address: customerBillingAddress } = value
        if (customerBillingAddress && customerBillingAddress.country) {
          payload = {
            ...payload,
            customer_billing_address: {
              country: customerBillingAddress.country,
            },
          }
        }
        // Update other address fields
      } else if (name.startsWith('customerBillingAddress')) {
        const { customer_billing_address: customerBillingAddress } = value
        if (customerBillingAddress && customerBillingAddress.country) {
          payload = {
            ...payload,
            customer_billing_address: {
              ...customerBillingAddress,
              country: customerBillingAddress.country,
            },
          }
          clearErrors('customer_billing_address')
        }
      }

      if (Object.keys(payload).length === 0) {
        return
      }

      try {
        await update(payload)
      } catch {}
    },
    [clearErrors, update],
  )
  const debouncedWatcher = useDebouncedCallback(watcher, 500, [watcher])

  const discountCode = watch('discount_code')

  useEffect(() => {
    if (!discountCode && !checkout.discount) {
      clearErrors('discount_code')
    }
  }, [discountCode, checkout.discount, clearErrors])

  const updateBusinessCustomer = useCallback(
    async (isBusinessCustomer: boolean) => {
      try {
        await update({ is_business_customer: isBusinessCustomer })
      } catch {}
    },
    [update],
  )

  useEffect(() => {
    const subscription = watch(debouncedWatcher)
    return () => subscription.unsubscribe()
  }, [watch, debouncedWatcher])

  const taxId = watch('customer_tax_id')
  const addTaxID = useCallback(async () => {
    if (!taxId) {
      return
    }
    clearErrors('customer_tax_id')
    try {
      await update({ customer_tax_id: taxId })
    } catch {}
  }, [update, taxId, clearErrors])
  const clearTaxId = useCallback(async () => {
    clearErrors('customer_tax_id')
    try {
      await update({ customer_tax_id: null })
      resetField('customer_tax_id')
    } catch {}
  }, [update, clearErrors, resetField])

  const onSubmit = async (data: schemas['CheckoutUpdatePublic']) => {
    // Don't send undefined/null data in the custom field object to please the SDK
    const cleanedFieldData = data.custom_field_data
      ? Object.fromEntries(
          Object.entries(data.custom_field_data).filter(
            ([_, value]) => value !== undefined && value !== null,
          ),
        )
      : {}

    if (
      data.discount_code === '' ||
      // Avoid overwriting a programmatically set discount without a code.
      (!data.discount_code && isDiscountWithoutCode)
    ) {
      delete data.discount_code
    }

    await confirm({
      ...data,
      locale: localeProp,
      customFieldData: cleanedFieldData,
    }).catch((err: unknown) => {
      // Paystack handoff: confirm() intentionally throws this marker so
      // the polar-sdk's redirect-on-confirmed logic doesn't fire before
      // the inline charge has actually been confirmed by polling. Eat
      // the error here so react-hook-form doesn't surface it as a form
      // root error — the ActiveChargePanel inside PaystackPaymentInterface
      // owns the buyer's canonical signal from this point.
      if (
        err &&
        typeof err === 'object' &&
        (err as { paystackHandoff?: true }).paystackHandoff === true
      ) {
        return
      }
      throw err
    })
  }

  const validTaxID = !!checkout.customer_tax_id

  // Make sure to clear the discount code field if the discount is removed by the API
  useEffect(() => {
    if (!checkout.discount) {
      resetField('discount_code')
    }
  }, [checkout, resetField])

  const checkoutLabel = useMemo(() => {
    if (checkout.active_trial_interval) {
      return t('checkout.cta.startTrial')
    }

    if (checkout.is_payment_form_required) {
      return interval
        ? t('checkout.cta.subscribeNow')
        : t('checkout.cta.payNow')
    }

    return t('checkout.cta.getFree')
  }, [checkout, interval, t])

  return (
    <div className="flex flex-col justify-between gap-y-12 text-[var(--text-primary)] [&_input]:!h-12 [&_input]:!rounded-md [&_input]:!border-0 [&_input]:!bg-[var(--surface-sunken)] [&_input]:!text-[var(--text-primary)] [&_input]:!shadow-none [&_input]:placeholder:!text-[var(--text-muted)] [&_input:focus]:!border-b [&_input:focus]:!border-[var(--border-strong)] [&_input:focus]:!ring-0 [&_label]:!text-[var(--text-primary)] [&_[role=combobox]]:!h-12 [&_[role=combobox]]:!rounded-md [&_[role=combobox]]:!border-0 [&_[role=combobox]]:!bg-[var(--surface-sunken)] [&_[role=combobox]]:!text-[var(--text-primary)] [&_[role=combobox]]:!shadow-none">
      <div className="flex flex-col gap-y-10">
        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-y-8"
          >
            <div className="flex flex-col gap-y-5">
              <FormField
                control={control}
                name="customer_email"
                rules={{
                  required: t('checkout.form.fieldRequired'),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('checkout.form.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        {...field}
                        value={field.value || ''}
                        disabled={checkout.customer_id !== null}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {children}

              {checkout.is_payment_form_required && !isWalletPayment && (
                <FormField
                  control={control}
                  name="customer_name"
                  rules={{
                    required: t('checkout.form.fieldRequired'),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('checkout.form.cardholderName')}</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          autoComplete="name"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(checkout.is_payment_form_required ||
                checkout.require_billing_address) && (
                <>
                  <FormItem>
                    <FormLabel>
                      {t('checkout.form.billingAddress.label')}
                    </FormLabel>
                    {isDisplayedField(
                      checkout.billing_address_fields.line1,
                    ) && (
                      <FormControl>
                        <FormField
                          control={control}
                          name="customer_billing_address.line1"
                          rules={{
                            required: isRequiredField(
                              checkout.billing_address_fields.line1,
                            )
                              ? t('checkout.form.fieldRequired')
                              : false,
                          }}
                          render={({ field }) => (
                            <>
                              <Input
                                type="text"
                                autoComplete="billing address-line1"
                                placeholder={t(
                                  'checkout.form.billingAddress.line1',
                                )}
                                {...field}
                                value={field.value || ''}
                              />
                              <FormMessage />
                            </>
                          )}
                        />
                      </FormControl>
                    )}
                    {isDisplayedField(
                      checkout.billing_address_fields.line2,
                    ) && (
                      <FormControl>
                        <FormField
                          control={control}
                          name="customer_billing_address.line2"
                          rules={{
                            required: isRequiredField(
                              checkout.billing_address_fields.line2,
                            )
                              ? t('checkout.form.fieldRequired')
                              : false,
                          }}
                          render={({ field }) => (
                            <>
                              <Input
                                type="text"
                                autoComplete="billing address-line2"
                                placeholder={t(
                                  'checkout.form.billingAddress.line2',
                                )}
                                {...field}
                                value={field.value || ''}
                              />
                              <FormMessage />
                            </>
                          )}
                        />
                      </FormControl>
                    )}
                    {(isDisplayedField(
                      checkout.billing_address_fields.postal_code,
                    ) ||
                      isDisplayedField(
                        checkout.billing_address_fields.city,
                      )) && (
                      <div className="grid grid-cols-2 gap-x-2">
                        {isDisplayedField(
                          checkout.billing_address_fields.postal_code,
                        ) && (
                          <FormControl>
                            <FormField
                              control={control}
                              name="customer_billing_address.postal_code"
                              rules={{
                                required: isRequiredField(
                                  checkout.billing_address_fields.postal_code,
                                )
                                  ? t('checkout.form.fieldRequired')
                                  : false,
                              }}
                              render={({ field }) => (
                                <div>
                                  <Input
                                    type="text"
                                    autoComplete="billing postal-code"
                                    placeholder={t(
                                      'checkout.form.billingAddress.postalCode',
                                    )}
                                    {...field}
                                    value={field.value || ''}
                                  />
                                  <FormMessage />
                                </div>
                              )}
                            />
                          </FormControl>
                        )}
                        {isDisplayedField(
                          checkout.billing_address_fields.city,
                        ) && (
                          <FormControl>
                            <FormField
                              control={control}
                              name="customer_billing_address.city"
                              rules={{
                                required: isRequiredField(
                                  checkout.billing_address_fields.city,
                                )
                                  ? t('checkout.form.fieldRequired')
                                  : false,
                              }}
                              render={({ field }) => (
                                <div>
                                  <Input
                                    type="text"
                                    autoComplete="billing address-level2"
                                    placeholder={t(
                                      'checkout.form.billingAddress.city',
                                    )}
                                    {...field}
                                    value={field.value || ''}
                                  />
                                  <FormMessage />
                                </div>
                              )}
                            />
                          </FormControl>
                        )}
                      </div>
                    )}
                    {isDisplayedField(
                      checkout.billing_address_fields.state,
                    ) && (
                      <FormControl>
                        <FormField
                          control={control}
                          name="customer_billing_address.state"
                          rules={{
                            required: isRequiredField(
                              checkout.billing_address_fields.state,
                            )
                              ? t('checkout.form.fieldRequired')
                              : false,
                          }}
                          render={({ field }) => (
                            <>
                              <CountryStatePicker
                                autoComplete="billing address-level1"
                                country={country}
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder={
                                  country === 'US'
                                    ? t('checkout.form.billingAddress.state')
                                    : t('checkout.form.billingAddress.province')
                                }
                                fallbackPlaceholder={t(
                                  'checkout.form.billingAddress.stateProvince',
                                )}
                              />
                              <FormMessage />
                            </>
                          )}
                        />
                      </FormControl>
                    )}
                    {isDisplayedField(
                      checkout.billing_address_fields.country,
                    ) && (
                      <FormControl>
                        <FormField
                          control={control}
                          name="customer_billing_address.country"
                          rules={{
                            required: isRequiredField(
                              checkout.billing_address_fields.country,
                            )
                              ? t('checkout.form.fieldRequired')
                              : false,
                          }}
                          render={({ field }) => (
                            <>
                              <CountryPicker
                                allowedCountries={
                                  enums.addressInputCountryValues
                                }
                                autoComplete="billing country"
                                value={field.value || undefined}
                                onChange={field.onChange}
                                placeholder={t(
                                  'checkout.form.billingAddress.country',
                                )}
                                locale={locale}
                              />
                              <FormMessage />
                            </>
                          )}
                        />
                      </FormControl>
                    )}
                    {errors.customer_billing_address?.message && (
                      <p className="text-destructive-foreground text-sm">
                        {errors.customer_billing_address.message}
                      </p>
                    )}
                  </FormItem>

                  <FormField
                    control={control}
                    name="is_business_customer"
                    render={({ field }) => (
                      <FormItem className="-mt-4">
                        <div className="flex flex-row items-center space-y-0 space-x-2">
                          <FormControl>
                            <Checkbox
                              className={cn(
                                'cursor-pointer border-[var(--border-strong)]',
                                field.value ? 'border-[var(--accent)]' : '',
                              )}
                              checked={field.value ? field.value : false}
                              onCheckedChange={(checked) => {
                                if (isUpdatePending) return
                                field.onChange(checked)
                                updateBusinessCustomer(!!checked)
                              }}
                            />
                          </FormControl>
                          <FormLabel className="dark:text-polar-400 cursor-pointer font-normal">
                            {t('checkout.form.purchasingAsBusiness')}
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isBusinessCustomer && (
                    <div className="flex flex-col gap-y-4 rounded-md border border-[var(--border)] p-4">
                      <span className="text-sm font-medium">
                        {t('checkout.form.billingDetails')}
                      </span>
                      <FormField
                        control={control}
                        name="customer_billing_name"
                        rules={{
                          required: t('checkout.form.fieldRequired'),
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="text"
                                autoComplete="billing organization"
                                placeholder={t('checkout.form.businessName')}
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="customer_tax_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="text"
                                  autoComplete="off"
                                  placeholder={`${t('checkout.form.taxId')} (${t('checkout.form.optional')})`}
                                  {...field}
                                  value={field.value || ''}
                                  disabled={validTaxID}
                                />
                                <div className="absolute inset-y-0 right-1 z-10 flex items-center gap-1">
                                  {!validTaxID && taxId && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={addTaxID}
                                    >
                                      {t('checkout.form.apply')}
                                    </Button>
                                  )}
                                  {validTaxID && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => clearTaxId()}
                                    >
                                      <XIcon className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </>
              )}
              {checkout.attached_custom_fields &&
                checkout.attached_custom_fields.map(
                  ({ custom_field, required }) => (
                    <FormField
                      key={custom_field.id}
                      control={control}
                      name={`custom_field_data.${custom_field.slug}`}
                      rules={{
                        required: required
                          ? t('checkout.form.fieldRequired')
                          : undefined,
                      }}
                      render={({ field }) => (
                        <CustomFieldInput
                          customField={custom_field}
                          required={required}
                          field={field}
                          themePreset={themePresetProps}
                        />
                      )}
                    />
                  ),
                )}
            </div>
            {beforeSubmit}
            <div className="flex w-full flex-col items-center justify-center gap-y-2">
              <Button
                type="submit"
                size="lg"
                wrapperClassNames="text-base"
                className="!h-12 w-full !rounded-md !bg-[var(--accent)] !text-[var(--accent-foreground)] !shadow-none hover:!bg-[var(--accent-hover)]"
                disabled={disabled || isUpdatePending}
                loading={loading}
              >
                {checkoutLabel}
              </Button>
              {loading && loadingLabel && (
                <p className="text-sm text-[var(--text-muted)]">
                  {loadingLabel}
                </p>
              )}
              {disabled && !loading && (
                <p className="text-sm text-[var(--danger)]">
                  {t('checkout.cta.paymentsUnavailable')}
                </p>
              )}
              {errors.root && (
                <p className="text-sm text-[var(--danger)]">
                  {errors.root.message}
                </p>
              )}
            </div>
          </form>
        </Form>
        <div>
          <p className="text-center text-xs leading-relaxed text-[var(--text-secondary)]">
            {checkout.is_payment_form_required
              ? checkout.active_trial_interval
                ? t('checkout.footer.mandateSubscriptionTrial')
                : interval
                  ? t('checkout.footer.mandateSubscription')
                  : t('checkout.footer.mandateOneTime')
              : t('checkout.footer.merchantOfRecord')}
          </p>
        </div>
      </div>
      <a
        href="https://blyss.co.ke?utm_source=checkout"
        className="flex w-full flex-row items-center justify-center gap-x-3 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        target="_blank"
      >
        <span>{t('checkout.footer.poweredBy')}</span>
        <PolarLogo className="h-5" />
      </a>
    </div>
  )
}

interface CheckoutFormProps {
  form: UseFormReturn<schemas['CheckoutUpdatePublic']>
  checkout: schemas['CheckoutPublic']
  update: (
    data: schemas['CheckoutUpdatePublic'],
  ) => Promise<schemas['CheckoutPublic']>
  confirm: (
    data: schemas['CheckoutConfirmStripe'],
    stripe: Stripe | null,
    elements: StripeElements | null,
  ) => Promise<schemas['CheckoutPublicConfirmed']>
  loading: boolean
  loadingLabel: string | undefined
  disabled?: boolean
  isUpdatePending?: boolean
  theme?: 'light' | 'dark'
  themePreset: ThemingPresetProps
  locale?: AcceptedLocale
  beforeSubmit?: React.ReactNode
}

const StripeCheckoutForm = (props: CheckoutFormProps) => {
  const {
    checkout,
    update,
    confirm,
    loading,
    loadingLabel,
    disabled,
    isUpdatePending,
    themePreset: themePresetProps,
    locale,
  } = props
  const {
    payment_processor_metadata: { publishable_key },
  } = checkout
  // Only initialise Stripe.js when we actually have a publishable key.
  // Blyss runs on Paystack and never sets a Stripe key, so
  // loadStripe('') throws "Please call Stripe() with your publishable
  // key. You used an empty string." Passing null to <Elements> is
  // valid (it just doesn't load Stripe) and silences that console
  // error on every Paystack checkout.
  const stripePromise = useMemo(
    () => (publishable_key ? loadStripe(publishable_key) : null),
    [publishable_key],
  )

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | undefined
  >()
  const isWalletPayment = selectedPaymentMethod
    ? WALLET_PAYMENT_METHODS.includes(selectedPaymentMethod)
    : false

  const elementsOptions = useMemo<StripeElementsOptions>(() => {
    if (
      checkout.is_payment_setup_required &&
      checkout.is_payment_required &&
      checkout.total_amount
    ) {
      return {
        mode: 'subscription',
        setupFutureUsage: 'off_session',
        paymentMethodCreation: 'manual',
        amount: checkout.total_amount,
        currency: checkout.currency,
      }
    } else if (checkout.is_payment_required && checkout.total_amount) {
      return {
        mode: 'payment',
        paymentMethodCreation: 'manual',
        amount: checkout.total_amount,
        currency: checkout.currency,
      }
    }

    return {
      mode: 'setup',
      paymentMethodCreation: 'manual',
      setupFutureUsage: 'off_session',
      currency: checkout.currency,
    }
  }, [checkout])

  return (
    <Elements
      stripe={stripePromise}
      options={{
        ...elementsOptions,
        locale: locale ? convertLocaleToStripeElementLocale(locale) : undefined,
        customerSessionClientSecret: (
          checkout.payment_processor_metadata as {
            customer_session_client_secret?: string
          }
        ).customer_session_client_secret,
        appearance: themePresetProps.stripe,
      }}
    >
      <ElementsConsumer>
        {({
          stripe,
          elements,
        }: {
          elements: StripeElements | null
          stripe: Stripe | null
        }) => (
          <BaseCheckoutForm
            {...props}
            checkout={checkout}
            confirm={(data) => confirm(data, stripe, elements)}
            update={update}
            loading={loading}
            loadingLabel={loadingLabel}
            isUpdatePending={isUpdatePending}
            isWalletPayment={isWalletPayment}
          >
            {checkout.is_payment_form_required && (
              <PaymentElement
                options={{
                  paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
                  layout: 'tabs',
                  fields: {
                    billingDetails: {
                      name: 'never',
                      email: 'never',
                      phone: 'never',
                      address: 'never',
                    },
                  },
                  terms: {
                    applePay: 'never',
                    auBecsDebit: 'never',
                    bancontact: 'never',
                    card: 'never',
                    cashapp: 'never',
                    googlePay: 'never',
                    ideal: 'never',
                    paypal: 'never',
                    sepaDebit: 'never',
                    sofort: 'never',
                    usBankAccount: 'never',
                  },
                }}
                onChange={(event: StripePaymentElementChangeEvent) => {
                  setSelectedPaymentMethod(event.value.type)
                }}
              />
            )}
          </BaseCheckoutForm>
        )}
      </ElementsConsumer>
    </Elements>
  )
}

const DummyCheckoutForm = (props: CheckoutFormProps) => {
  const { checkout, disabled } = props
  return (
    <BaseCheckoutForm
      {...props}
      confirm={async () => ({
        ...checkout,
        status: 'confirmed',
        customer_session_token: '',
      })}
      update={async () => checkout}
      disabled={disabled ?? true}
    />
  )
}

const PaystackCheckoutForm = (props: CheckoutFormProps) => {
  const { checkout } = props
  const [selectedChannel, setSelectedChannel] = useState<string>('paystack-pop')
  const [popupCancelled, setPopupCancelled] = useState(false)

  const { data: paystackConfig } = usePaystackPublicKey()
  const publicKey = paystackConfig?.public_key

  /**
   * Mode A confirm: hits the existing /confirm backend (which
   * updates customer email + locks the checkout for fulfillment),
   * THEN opens Paystack's popup with the public key. Buyer
   * authorizes inside Paystack's secure modal — popup handles
   * card / M-Pesa / 3DS / fraud checks.
   *
   * onSuccess from the popup → window.location to the confirmation
   * page where SequentialCheckoutContinue + the existing webhook
   * pipeline take over.
   *
   * onCancel → clear the cancelled state so the buyer can retry by
   * clicking Pay again.
   */
  const confirmPaystack = useCallback(
    async (data: any) => {
      // 1. Hit the existing confirm endpoint (sets customer email,
      //    locks checkout state, emits SSE 'confirmed' event for
      //    SequentialCheckoutContinue to pick up later).
      const updated = await props.confirm(data, null, null)

      // 2. Open the Paystack popup with the now-confirmed checkout's
      //    details. The form's email is on `updated.customer_email`.
      if (!publicKey) {
        toast({
          title: 'Payment unavailable',
          description:
            'Paystack public key not configured. Try again shortly.',
          variant: 'error',
        })
        throw new Error('paystack_public_key_missing')
      }

      // Resolve the creator's Paystack subaccount for split settlement.
      // The public checkout's `organization` schema does NOT expose
      // subaccount_code, so the backend confirm() stamps it (and the
      // public_key) into payment_processor_metadata. Read it there first,
      // then fall back to any org field for safety.
      const ppMeta =
        ((updated as any)?.payment_processor_metadata as
          | Record<string, any>
          | undefined) ||
        ((checkout as any)?.payment_processor_metadata as
          | Record<string, any>
          | undefined) ||
        {}
      const subaccount =
        (ppMeta.subaccount_code as string | undefined) ||
        ((updated.organization as any)?.subaccount_code as string | undefined) ||
        ((checkout.organization as any)?.subaccount_code as string | undefined)

      if (
        !subaccount &&
        (updated.payment_processor === 'paystack' ||
          checkout.payment_processor === 'paystack')
      ) {
        toast({
          title: 'This item is unavailable right now',
          description:
            'The creator has not finished setting up payouts. Please try again later.',
          variant: 'error',
        })
        throw new Error('paystack_subaccount_missing')
      }

      const email =
        updated.customer_email ||
        ((updated as any).customer?.email as string | undefined) ||
        (checkout as any).customer_email ||
        ''

      const amount = updated.total_amount ?? checkout.total_amount ?? 0
      // Paystack-supported currencies for this merchant. Mirrors the
      // server-side PAYSTACK_SUPPORTED_CURRENCIES setting; defaults to
      // ['KES', 'USD'] because Blyss's main merchant account has both
      // currencies enabled (matches the env-var default in
      // server/polar/config.py). Anything else reaching the popup
      // would throw "Currency not supported by merchant", which is
      // misleading (the merchant CAN support more, just hasn't been
      // enabled).
      //
      // The server already clamps Checkout.currency at creation time;
      // this is a belt-and-suspenders fallback so historical checkouts
      // (or any future code path that bypasses the clamp) don't crash
      // the popup.
      const PAYSTACK_SUPPORTED_CURRENCIES = ['KES', 'USD']
      const requestedCurrency = (
        (updated.currency || checkout.currency || 'KES') as string
      ).toUpperCase()
      const currency = PAYSTACK_SUPPORTED_CURRENCIES.includes(requestedCurrency)
        ? requestedCurrency
        : (() => {
            console.warn(
              '[paystack] Checkout.currency %s is not in the merchant-supported set %o; clamping to KES to avoid "Currency not supported by merchant".',
              requestedCurrency,
              PAYSTACK_SUPPORTED_CURRENCIES,
            )
            return 'KES'
          })()
      const reference = generatePaystackReference(updated.id || checkout.id)

      // Channel selection rules for Mode A:
      //   - Subscription products: card only. Paystack stores the
      //     authorization code from a successful card charge so we
      //     can charge again at renewal. M-Pesa STK can't be saved
      //     server-side for off-session charging — Safaricom requires
      //     STK approval per charge.
      //   - One-time products: full KE channel set (card + M-Pesa).
      const product = (updated.product as any) || (checkout.product as any)
      const isRecurring = !!(product && product.is_recurring)
      const channels: ('card' | 'mobile_money')[] = isRecurring
        ? ['card']
        : currency === 'KES'
          ? ['card', 'mobile_money']
          : ['card']

      paystackPop({
        publicKey,
        email,
        amount,
        currency,
        reference,
        subaccount,
        channels,
        metadata: {
          // Threaded into charge.success webhook → handle_success
          checkout_id: updated.id || checkout.id,
          // Subscription flag echoed back so the webhook can route
          // recurring vs one-time correctly even if Polar's
          // checkout.product.is_recurring lookup races with the
          // Paystack callback ordering.
          is_recurring: isRecurring ? 'true' : 'false',
          ...((updated as any).user_metadata?.cart_item_ids
            ? {
                cart_item_ids: (updated as any).user_metadata.cart_item_ids,
              }
            : {}),
        },
        onSuccess: () => {
          if (typeof window === 'undefined') return
          window.location.href = `/checkout/${checkout.client_secret}/confirmation`
        },
        onCancel: () => {
          setPopupCancelled(true)
          // The buyer closed the popup. By the time onCancel fires the
          // page has already been navigated to /checkout/{secret}/confirmation
          // by props.confirm()'s checkoutConfirmedRedirect, and the
          // checkout row is locked at status='confirmed'. The polling
          // confirmation page would otherwise wait forever for a charge
          // that never lands. Reset the checkout server-side back to
          // 'open' and bounce the buyer to /checkout/{secret} so they
          // can retry. /checkout/{secret} sees status='open' and
          // re-renders this same form.
          //
          // Plain fetch + window.location because the popup outlives the
          // React component (paystackPop attaches a global modal); state
          // updates and router pushes from inside React no longer affect
          // the now-navigated page tree.
          if (typeof window === 'undefined') return
          const apiBase = getPublicServerURL()
          fetch(
            `${apiBase}/v1/checkouts/client/${checkout.client_secret}/abandon`,
            { method: 'POST', credentials: 'include' },
          ).finally(() => {
            window.location.href = `/checkout/${checkout.client_secret}`
          })
        },
      })

      return updated
    },
    [props, publicKey, checkout],
  )

  return (
    <BaseCheckoutForm
      {...props}
      checkout={checkout}
      confirm={confirmPaystack}
    >
      {/*
        The trust line + cancelled-state hint live in the children
        slot — the same DOM position where Stripe's <PaymentElement />
        renders for the Stripe processor. No email field, no extra
        Pay button — Polar's BaseCheckoutForm already provides those.
      */}
      <PaystackPaymentInterface
        checkout={checkout}
        disabled={props.disabled}
        onPaymentMethodSelect={setSelectedChannel}
        cancelled={popupCancelled}
      />
    </BaseCheckoutForm>
  )
}

const CheckoutForm = (props: CheckoutFormProps) => {
  if (props.checkout.payment_processor === 'paystack') {
    return <PaystackCheckoutForm {...props} />
  }
  return <StripeCheckoutForm {...props} />
}

export default CheckoutForm
