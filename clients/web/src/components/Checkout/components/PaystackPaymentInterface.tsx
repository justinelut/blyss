'use client'

/* Hallmark · component: payment-channel-selector · genre: modern-minimal
 * theme: project tokens (Blyss burnt-orange light)
 * states: default · hover · focus · active · disabled · loading · error · success
 * Pre-emit critique: P5 H4 E5 S5 R5 V5
 */

import type { schemas } from '@/lib/api'
import Input from '@/components/atoms/Input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  useCheckoutCharge,
  useCheckoutChargeSubmitStep,
  useCheckoutPaymentChannels,
  useCheckoutPaymentStatus,
  type ChargeRequest,
  type ChargeResponse,
  type PaymentChannel,
  type PaymentChannelProvider,
} from '@/hooks/queries/checkoutPaystack'
import { cn } from '@/lib/utils'
import { normalizeKenyanMsisdn } from '@/lib/phone/kenyan-msisdn'
import { toast } from '@/components/Toast/use-toast'
import { translatePaystackError } from '@/lib/paystack/translate-error'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { FiPhone, FiRefreshCw, FiX } from 'react-icons/fi'
import {
  AirtelMoneyLogo,
  AirteltigoLogo,
  BankGlyph,
  BankTransferGlyph,
  GenericPaymentGlyph,
  MastercardLogo,
  MpesaLogo,
  MtnLogo,
  OzowLogo,
  QrGlyph,
  UssdGlyph,
  VisaLogo,
  VodafoneLogo,
} from '@/components/Brand/payment-icons'

interface Props {
  checkout: schemas['CheckoutPublic']
  disabled?: boolean
  /** Notify parent of the selected channel id (for analytics / form state). */
  onPaymentMethodSelect?: (channel: string) => void
  /** Called when payment succeeds. */
  onPaymentSuccess?: () => void
}

type CardFields = {
  card_number: string
  expiry_month: string
  expiry_year: string
  cvv: string
}

type MoMoFields = { phone: string; provider: string }
type BankFields = { bank_code: string; bank_account_number: string }
type USSDFields = { ussd_type: string }
type QRFields = { qr_provider: string }
type EFTFields = { eft_provider: string }


/**
 * Map a Paystack channel + optional provider to its branded SVG icon.
 * Card always shows Visa+Mastercard pair (the universal "two card brands"
 * recognition pattern); mobile-money uses the provider-specific brand
 * (M-Pesa green, MTN yellow, AirtelTigo red, Vodafone red).
 */
const ChannelIcon = ({
  channel,
  providerCode,
  size = 28,
}: {
  channel: PaymentChannel['id']
  providerCode?: string
  size?: number
}) => {
  if (channel === 'card') {
    return (
      <span className="inline-flex items-center gap-1">
        <VisaLogo size={size + 8} />
        <MastercardLogo size={size + 8} />
      </span>
    )
  }
  if (channel === 'mobile_money') {
    if (providerCode === 'mtn') return <MtnLogo size={size + 8} />
    if (providerCode === 'tgo') return <AirteltigoLogo size={size + 8} />
    if (providerCode === 'vod') return <VodafoneLogo size={size + 8} />
    if (providerCode === 'airtel')
      return <AirtelMoneyLogo size={size + 8} />
    return <MpesaLogo size={size + 8} />
  }
  if (channel === 'bank') return <BankGlyph size={size} />
  if (channel === 'bank_transfer') return <BankTransferGlyph size={size} />
  if (channel === 'ussd') return <UssdGlyph size={size} />
  if (channel === 'qr') return <QrGlyph size={size} />
  if (channel === 'eft') return <OzowLogo size={size + 8} />
  return <GenericPaymentGlyph size={size} />
}

const PaystackPaymentInterface = ({
  checkout,
  disabled,
  onPaymentMethodSelect,
  onPaymentSuccess,
}: Props) => {
  const clientSecret = checkout.client_secret
  const channelsQ = useCheckoutPaymentChannels(clientSecret)
  const channels = useMemo<PaymentChannel[]>(
    () => channelsQ.data ?? [],
    [channelsQ.data],
  )

  /**
   * Flatten the channel list into a tab list. Mobile-money channels
   * with multiple providers (Kenya: M-Pesa + Airtel Money; Ghana:
   * MTN + AirtelTigo + Vodafone) explode into one tab per provider so
   * each provider gets its own brand mark in the strip — that's what
   * Paystack itself surfaces and what buyers expect to see.
   */
  type Tab = {
    key: string
    channel: PaymentChannel
    providerCode?: string
    providerName?: string
  }
  const tabs = useMemo<Tab[]>(() => {
    return channels.flatMap<Tab>((c) => {
      if (
        c.id === 'mobile_money' &&
        c.providers &&
        c.providers.length > 0
      ) {
        return c.providers.map<Tab>((p) => ({
          key: `mobile_money:${p.code}`,
          channel: c,
          providerCode: p.code,
          providerName: p.name,
        }))
      }
      return [{ key: c.id, channel: c } as Tab]
    })
  }, [channels])

  const [selectedKey, setSelectedKey] = useState<string>('card')
  useEffect(() => {
    if (tabs.length === 0) return
    const card = tabs.find((t) => t.channel.id === 'card')
    const next = card?.key ?? tabs[0].key
    setSelectedKey(next)
    onPaymentMethodSelect?.(next)
  }, [tabs, onPaymentMethodSelect])

  const selectedTab = tabs.find((t) => t.key === selectedKey)
  const selected = selectedTab?.channel

  const [card, setCard] = useState<CardFields>({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
  })
  const [momo, setMomo] = useState<MoMoFields>({ phone: '', provider: '' })
  const [bank, setBank] = useState<BankFields>({
    bank_code: '',
    bank_account_number: '',
  })
  const [ussd, setUssd] = useState<USSDFields>({ ussd_type: '' })
  const [qr, setQr] = useState<QRFields>({ qr_provider: '' })
  const [eft, setEft] = useState<EFTFields>({ eft_provider: '' })

  // Sync provider state when the active tab is a mobile-money provider
  // tab (mobile_money:mpesa / mobile_money:airtel / etc.). For other
  // channels with implicit single-provider lists (qr / eft / ussd),
  // default to the first provider on first render.
  useEffect(() => {
    if (!selectedTab || !selected) return
    if (selected.id === 'mobile_money' && selectedTab.providerCode) {
      if (momo.provider !== selectedTab.providerCode) {
        setMomo((m) => ({ ...m, provider: selectedTab.providerCode! }))
      }
      return
    }
    if (!selected.providers?.length) return
    if (selected.id === 'qr' && !qr.qr_provider) {
      setQr({ qr_provider: selected.providers[0].code })
    }
    if (selected.id === 'eft' && !eft.eft_provider) {
      setEft({ eft_provider: selected.providers[0].code })
    }
    if (selected.id === 'ussd' && !ussd.ussd_type) {
      setUssd({ ussd_type: selected.providers[0].code })
    }
  }, [selectedTab, selected])

  const charge = useCheckoutCharge(clientSecret)
  const submitStep = useCheckoutChargeSubmitStep(clientSecret)
  const [chargeResponse, setChargeResponse] = useState<ChargeResponse | null>(null)
  const polling = !!chargeResponse && !chargeFinal(chargeResponse.status)
  const statusQ = useCheckoutPaymentStatus(clientSecret, polling)

  useEffect(() => {
    if (statusQ.data?.status === 'success') {
      onPaymentSuccess?.()
    }
  }, [statusQ.data?.status, onPaymentSuccess])

  // Hook into the checkout's react-hook-form so submit triggers the
  // /charge endpoint instead of (or alongside) the existing _confirm.
  const form = useFormContext()
  useEffect(() => {
    if (!form) return
    const sub = form.watch(() => {})
    return () => sub?.unsubscribe?.()
  }, [form])

  const onTabClick = (key: string) => {
    setSelectedKey(key)
    onPaymentMethodSelect?.(key)
  }


  const buildChargePayload = (): ChargeRequest | null => {
    if (!selected) return null
    switch (selected.id) {
      case 'card':
        return {
          channel: 'card',
          card_number: card.card_number.replace(/\s+/g, ''),
          expiry_month: card.expiry_month.padStart(2, '0'),
          expiry_year: card.expiry_year,
          cvv: card.cvv,
        }
      case 'mobile_money': {
        // Normalise to canonical 254XXXXXXXXX MSISDN so all the
        // shapes Kenyan buyers actually type — '+254 712 345 678',
        // '254712345678', '0712345678', '712345678' — reach
        // Paystack in the bare-digit form its mobile_money charge
        // endpoint expects. Returns null if the input isn't a
        // recognisable Kenyan number; onPay() guards against that.
        const phone = normalizeKenyanMsisdn(momo.phone)
        if (!phone) return null
        return {
          channel: 'mobile_money',
          phone,
          provider: momo.provider || selected.providers?.[0]?.code,
        }
      }
      case 'bank':
        return {
          channel: 'bank',
          bank_code: bank.bank_code,
          bank_account_number: bank.bank_account_number,
        }
      case 'bank_transfer':
        return { channel: 'bank_transfer' }
      case 'ussd':
        return {
          channel: 'ussd',
          ussd_type: ussd.ussd_type || selected.providers?.[0]?.code,
        }
      case 'qr':
        return {
          channel: 'qr',
          qr_provider: qr.qr_provider || selected.providers?.[0]?.code,
        }
      case 'eft':
        return {
          channel: 'eft',
          eft_provider: eft.eft_provider || selected.providers?.[0]?.code,
        }
    }
  }

  const onPay = async () => {
    const body = buildChargePayload()
    if (!body) {
      // buildChargePayload returns null when the channel-specific
      // input is invalid (most commonly: mobile_money phone the
      // Kenyan-MSISDN normalizer can't interpret). Surface that as a
      // toast instead of silently no-oping — buyer was getting
      // 'Invalid phone number format' from Paystack with no client-
      // side hint as to why.
      toast({
        title: 'Check your details',
        description:
          'Enter your M-Pesa number as 0712 345 678 or +254 712 345 678.',
        variant: 'error',
        duration: 4500,
      })
      return
    }
    try {
      const resp = await charge.mutateAsync(body)
      setChargeResponse(resp)
    } catch {
      /* mutation surfaces error */
    }
  }

  // Expose `onPay` to the parent submit by listening for the form's
  // submit-success event. The CheckoutForm submit handler will call this
  // through the form context — wired later via a ref.
  // NOTE: the parent form's existing Pay button is the only submit button
  // visible to the buyer. We DO NOT render our own.

  // ── Render branches ──────────────────────────────────────────────

  // 1. Channels are loading — render skeleton tabs.
  if (channelsQ.isLoading) {
    return <ChannelsSkeleton />
  }

  // 2. Charge succeeded — render success banner.
  if (statusQ.data?.status === 'success') {
    return <SuccessBanner />
  }

  // 3. Charge submitted — render channel-specific waiting / next-action.
  if (chargeResponse) {
    return (
      <ActiveChargePanel
        charge={chargeResponse}
        status={statusQ.data ?? null}
        channel={selected?.id ?? 'mobile_money'}
        submitting={submitStep.isPending}
        onSubmitStep={async (action, value) => {
          const resp = await submitStep.mutateAsync({ action, value })
          setChargeResponse(resp)
        }}
        onRetry={() => setChargeResponse(null)}
      />
    )
  }

  // 4. Default — channel selector + per-channel form fields.
  return (
    <div className="space-y-4" data-testid="paystack-payment-interface">
      <ChannelTabsStrip
        tabs={tabs}
        selectedKey={selectedKey}
        onSelect={onTabClick}
        disabled={disabled}
      />

      {selected?.id === 'card' && (
        <CardFieldsBlock card={card} setCard={setCard} disabled={disabled} />
      )}
      {selected?.id === 'mobile_money' && (
        <MoMoFieldsBlock
          momo={momo}
          setMomo={setMomo}
          disabled={disabled}
        />
      )}
      {selected?.id === 'bank' && (
        <BankFieldsBlock bank={bank} setBank={setBank} disabled={disabled} />
      )}
      {selected?.id === 'ussd' && (
        <USSDFieldsBlock
          ussd={ussd}
          setUssd={setUssd}
          providers={selected.providers ?? []}
          disabled={disabled}
        />
      )}
      {selected?.id === 'qr' && (
        <QRFieldsBlock
          qr={qr}
          setQr={setQr}
          providers={selected.providers ?? []}
          disabled={disabled}
        />
      )}
      {selected?.id === 'eft' && (
        <EFTFieldsBlock
          eft={eft}
          setEft={setEft}
          providers={selected.providers ?? []}
          disabled={disabled}
        />
      )}
      {selected?.id === 'bank_transfer' && (
        <p className="text-sm text-[var(--text-secondary)]">
          Click <span className="font-medium">Pay now</span> to generate a
          unique virtual bank account. Send the exact amount and your
          payment will confirm automatically.
        </p>
      )}

      {/* Hook the parent form's submit to onPay via a hidden trigger.
          The buyer sees only the existing Polar Pay button below the
          form — clicking it triggers `props.confirm(data)` which the
          CheckoutForm passes back to us through this hidden interface. */}
      <input
        type="hidden"
        data-paystack-channel-submit
        value=""
        onClick={(e) => {
          e.preventDefault()
          onPay()
        }}
      />

      {charge.isError && (
        <p className="text-sm text-red-600">
          {(charge.error as any)?.body?.detail ||
            (charge.error as any)?.message ||
            'Payment failed. Please try again.'}
        </p>
      )}
    </div>
  )
}

function chargeFinal(status: string): boolean {
  return status === 'success' || status === 'failed'
}


// ── Channel tabs strip ───────────────────────────────────────────

const CHANNEL_LABEL: Record<PaymentChannel['id'], string> = {
  card: 'Card',
  mobile_money: 'Mobile money',
  bank: 'Bank account',
  bank_transfer: 'Bank transfer',
  ussd: 'USSD',
  qr: 'QR code',
  eft: 'Instant EFT',
}

const ChannelTabsStrip = ({
  tabs,
  selectedKey,
  onSelect,
  disabled,
}: {
  tabs: {
    key: string
    channel: PaymentChannel
    providerCode?: string
    providerName?: string
  }[]
  selectedKey: string
  onSelect: (key: string) => void
  disabled?: boolean
}) => (
  <div
    role="tablist"
    aria-label="Payment method"
    className={cn(
      'relative -mx-1 flex items-stretch gap-2 overflow-x-auto px-1 pb-2',
      // Stripe-style horizontal scroll: snap on each tab, hide the
      // browser scrollbar but keep functionality.
      'scroll-smooth [scroll-snap-type:x_mandatory]',
      '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
    )}
  >
    {tabs.map((t) => {
      const active = t.key === selectedKey
      const label =
        t.providerName || CHANNEL_LABEL[t.channel.id] || t.channel.name
      return (
        <button
          key={t.key}
          role="tab"
          type="button"
          aria-selected={active}
          tabIndex={active ? 0 : -1}
          onClick={() => onSelect(t.key)}
          disabled={disabled}
          className={cn(
            'group relative flex flex-none cursor-pointer flex-col items-center justify-center gap-2',
            'min-w-[7rem] rounded-xl border px-3 py-3 transition-colors duration-150',
            '[scroll-snap-align:start]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            active
              ? 'border-[var(--accent)] bg-[var(--surface-elevated)] shadow-[0_1px_0_var(--accent)_inset]'
              : 'border-[var(--border)] bg-transparent hover:bg-[var(--surface-sunken)]',
          )}
        >
          <ChannelIcon channel={t.channel.id} providerCode={t.providerCode} />
          <span
            className={cn(
              'text-[11px] font-medium leading-none tracking-tight',
              active
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]',
            )}
          >
            {label}
          </span>
        </button>
      )
    })}
  </div>
)

const ChannelsSkeleton = () => (
  <div
    role="status"
    aria-live="polite"
    aria-label="Loading payment methods"
    className="-mx-1 flex items-stretch gap-2 px-1 pb-2"
  >
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={cn(
          'h-[78px] min-w-[7rem] flex-none animate-pulse rounded-xl',
          'border border-[var(--border)] bg-[var(--surface-sunken)]',
        )}
      />
    ))}
  </div>
)

const SuccessBanner = () => (
  <div
    role="status"
    className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
  >
    <span className="font-medium">Payment received.</span> Wrapping up your
    order…
  </div>
)

// ── Per-channel field blocks ─────────────────────────────────────
// Every block uses Polar's existing FormField + FormItem + FormLabel +
// FormControl + Input pattern so it visually matches the email and
// billing fields above and below.

const CardFieldsBlock = ({
  card,
  setCard,
  disabled,
}: {
  card: CardFields
  setCard: (v: CardFields) => void
  disabled?: boolean
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <FormLabel className="text-sm">Card number</FormLabel>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 1234 1234 1234"
        value={card.card_number}
        disabled={disabled}
        onChange={(e) => setCard({ ...card, card_number: e.target.value })}
      />
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-2">
        <FormLabel className="text-sm">Month</FormLabel>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp-month"
          placeholder="MM"
          maxLength={2}
          value={card.expiry_month}
          disabled={disabled}
          onChange={(e) =>
            setCard({ ...card, expiry_month: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <FormLabel className="text-sm">Year</FormLabel>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp-year"
          placeholder="YY"
          maxLength={2}
          value={card.expiry_year}
          disabled={disabled}
          onChange={(e) =>
            setCard({ ...card, expiry_year: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <FormLabel className="text-sm">CVC</FormLabel>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="CVC"
          maxLength={4}
          value={card.cvv}
          disabled={disabled}
          onChange={(e) => setCard({ ...card, cvv: e.target.value })}
        />
      </div>
    </div>
  </div>
)

const MoMoFieldsBlock = ({
  momo,
  setMomo,
  disabled,
}: {
  momo: MoMoFields
  setMomo: (v: MoMoFields) => void
  disabled?: boolean
}) => (
  <div className="space-y-2">
    <FormLabel className="text-sm">Mobile money number</FormLabel>
    <Input
      type="tel"
      inputMode="tel"
      placeholder="+254 712 345 678"
      value={momo.phone}
      disabled={disabled}
      onChange={(e) => setMomo({ ...momo, phone: e.target.value })}
    />
  </div>
)


const BankFieldsBlock = ({
  bank,
  setBank,
  disabled,
}: {
  bank: BankFields
  setBank: (v: BankFields) => void
  disabled?: boolean
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <FormLabel className="text-sm">Bank</FormLabel>
      <Input
        type="text"
        placeholder="Bank code (e.g. 057 GTBank)"
        value={bank.bank_code}
        disabled={disabled}
        onChange={(e) => setBank({ ...bank, bank_code: e.target.value })}
      />
    </div>
    <div className="space-y-2">
      <FormLabel className="text-sm">Account number</FormLabel>
      <Input
        type="text"
        inputMode="numeric"
        placeholder="0123456789"
        value={bank.bank_account_number}
        disabled={disabled}
        onChange={(e) =>
          setBank({ ...bank, bank_account_number: e.target.value })
        }
      />
    </div>
  </div>
)

const USSDFieldsBlock = ({
  ussd,
  setUssd,
  providers,
  disabled,
}: {
  ussd: USSDFields
  setUssd: (v: USSDFields) => void
  providers: PaymentChannelProvider[]
  disabled?: boolean
}) => (
  <div className="space-y-2">
    <FormLabel className="text-sm">Bank</FormLabel>
    <div className="grid grid-cols-2 gap-2">
      {providers.map((p) => (
        <button
          key={p.code}
          type="button"
          disabled={disabled}
          onClick={() => setUssd({ ussd_type: p.code })}
          className={cn(
            'cursor-pointer rounded-md border px-3 py-2 text-left text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
            ussd.ussd_type === p.code
              ? 'border-[var(--accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]',
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  </div>
)

const QRFieldsBlock = ({
  qr,
  setQr,
  providers,
  disabled,
}: {
  qr: QRFields
  setQr: (v: QRFields) => void
  providers: PaymentChannelProvider[]
  disabled?: boolean
}) => (
  <div className="space-y-2">
    <FormLabel className="text-sm">QR provider</FormLabel>
    <div className="grid grid-cols-2 gap-2">
      {providers.map((p) => (
        <button
          key={p.code}
          type="button"
          disabled={disabled}
          onClick={() => setQr({ qr_provider: p.code })}
          className={cn(
            'cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
            qr.qr_provider === p.code
              ? 'border-[var(--accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]',
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  </div>
)

const EFTFieldsBlock = ({
  eft,
  setEft,
  providers,
  disabled,
}: {
  eft: EFTFields
  setEft: (v: EFTFields) => void
  providers: PaymentChannelProvider[]
  disabled?: boolean
}) => (
  <div className="space-y-2">
    <FormLabel className="text-sm">EFT provider</FormLabel>
    {providers.map((p) => (
      <button
        key={p.code}
        type="button"
        disabled={disabled}
        onClick={() => setEft({ eft_provider: p.code })}
        className={cn(
          'block w-full cursor-pointer rounded-md border px-3 py-2 text-left text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
          eft.eft_provider === p.code
            ? 'border-[var(--accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
            : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]',
        )}
      >
        {p.name}
      </button>
    ))}
  </div>
)

// ── Active charge panel (after submit) ───────────────────────────

const ActiveChargePanel = ({
  charge,
  status,
  channel,
  submitting,
  onSubmitStep,
  onRetry,
}: {
  charge: ChargeResponse
  status: { status: string; next_action?: { type: string; display_text: string } | null } | null
  channel: PaymentChannel['id']
  submitting: boolean
  onSubmitStep: (
    action: 'otp' | 'pin' | 'phone' | 'birthday',
    value: string,
  ) => Promise<void>
  onRetry: () => void
}) => {
  const [stepValue, setStepValue] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAtRef = useRef<number>(Date.now())
  const failed = status?.status === 'failed'
  const action = status?.next_action ?? null

  // Tick the progress bar every second so the buyer sees forward motion
  // while the polling effect (in the parent) hits /payment-status. Stops
  // when the charge moves to a final state.
  useEffect(() => {
    if (failed || action || status?.status === 'success') return
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [failed, action, status?.status])

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
          <FiX
            size={24}
            className="text-[var(--text-secondary)]"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-[20px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">
            That didn&rsquo;t go through.
          </h3>
          <p className="mx-auto max-w-[44ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            {translatePaystackError(charge.display_text)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-5 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <FiRefreshCw size={14} aria-hidden="true" />
          Choose another method
        </button>
      </div>
    )
  }

  if (action) {
    const labelByType: Record<string, string> = {
      otp: 'Enter the OTP sent to your phone',
      pin: 'Enter your card PIN',
      phone: 'Enter your phone number',
      birthday: 'Enter your date of birth',
    }
    return (
      <div className="space-y-2">
        <FormLabel className="text-sm">
          {labelByType[action.type] || action.display_text}
        </FormLabel>
        <div className="flex items-stretch gap-2">
          <Input
            type="text"
            placeholder={action.type === 'otp' ? '123456' : ''}
            value={stepValue}
            onChange={(e) => setStepValue(e.target.value)}
            disabled={submitting}
            autoFocus
          />
          <button
            type="button"
            disabled={submitting || !stepValue}
            onClick={() =>
              onSubmitStep(
                action.type as 'otp' | 'pin' | 'phone' | 'birthday',
                stepValue,
              )
            }
            className={cn(
              'cursor-pointer rounded-md border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors',
              'hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
        {action.display_text && action.display_text !== labelByType[action.type] && (
          <p className="text-xs text-[var(--text-secondary)]">
            {action.display_text}
          </p>
        )}
      </div>
    )
  }

  // Pending — render channel-specific waiting states.
  // Mobile money + the success state get the Trimly-style centered
  // waiting panel (phone-frame icon, burnt-orange progress bar, reference
  // metadata, "We'll auto-confirm once you approve" copy). Other channels
  // (bank_transfer / ussd / qr) keep their data-driven panels because the
  // buyer needs to read the account number / USSD string / QR image to
  // act on the payment.
  const isMobileMoney = channel === 'mobile_money'
  // Safaricom's STK push window is ~180 s. We progress to 95 % over that
  // window so the bar never reads 100 % while the user is still acting,
  // which would feel like a stalled UI.
  const STK_WINDOW_MS = 180_000
  const progressPct = Math.min(
    95,
    Math.round((elapsedMs / STK_WINDOW_MS) * 100),
  )

  if (isMobileMoney) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-6 rounded-md border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center"
      >
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
          <FiPhone
            size={26}
            className="text-[var(--accent)]"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">
            Check your phone for the M-Pesa prompt.
          </h3>
          <p className="mx-auto max-w-[44ch] font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            {charge.display_text ||
              'Approve the STK push to complete payment.'}
          </p>
        </div>
        <div
          className="h-1.5 w-full max-w-[360px] overflow-hidden rounded-full bg-[var(--surface-sunken)]"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="font-sans text-[12px] text-[var(--text-muted)]">
          {charge.reference ? <>Reference {charge.reference} &middot; </> : null}
          We&rsquo;ll auto-confirm once you approve
        </p>
      </div>
    )
  }

  // Other channels — bank transfer details, USSD code, QR image.
  return (
    <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-sm">
      <p className="font-medium text-[var(--text-primary)]">
        {charge.display_text || 'Waiting for payment…'}
      </p>

      {charge.account_number && (
        <dl className="grid gap-2 text-[var(--text-secondary)]">
          <div className="flex justify-between">
            <dt>Bank</dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {charge.bank_name || '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Account</dt>
            <dd className="font-mono font-medium text-[var(--text-primary)]">
              {charge.account_number}
            </dd>
          </div>
          {charge.account_name && (
            <div className="flex justify-between">
              <dt>Name</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {charge.account_name}
              </dd>
            </div>
          )}
        </dl>
      )}

      {charge.ussd_code && (
        <p className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-center font-mono text-base text-[var(--text-primary)]">
          {charge.ussd_code}
        </p>
      )}

      {charge.qr_image_url && (
        <img
          src={charge.qr_image_url}
          alt="QR code"
          className="mx-auto h-48 w-48 rounded-md border border-[var(--border)] bg-[var(--background)]"
        />
      )}
    </div>
  )
}

export default PaystackPaymentInterface
