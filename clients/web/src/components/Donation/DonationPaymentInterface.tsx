'use client'

/* Inline Paystack-native tipping. Channel-tab strip + per-channel fields.
 * Fixed: all fields use w-full/min-w-0, card expiry/cvv grid wraps on narrow
 * viewports, channel tabs scroll without pushing dialog width.
 */

import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import { FormLabel } from '@/components/ui/form'
import {
  useDonationCharge,
  useDonationChargeSubmitStep,
  useDonationPaymentChannels,
  useDonationPaymentStatus,
  type DonationChargeRequest,
  type DonationChargeResponse,
  type DonationPaymentChannel,
  type DonationPaymentChannelProvider,
} from '@/hooks/queries/donations'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'
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
  slug: string
  amount: number
  donorEmail: string
  donorName?: string
  message?: string
  canPay: boolean
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

const ChannelIcon = ({
  channel,
  providerCode,
  size = 28,
}: {
  channel: DonationPaymentChannel['id']
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
    if (providerCode === 'airtel') return <AirtelMoneyLogo size={size + 8} />
    return <MpesaLogo size={size + 8} />
  }
  if (channel === 'bank') return <BankGlyph size={size} />
  if (channel === 'bank_transfer') return <BankTransferGlyph size={size} />
  if (channel === 'ussd') return <UssdGlyph size={size} />
  if (channel === 'qr') return <QrGlyph size={size} />
  if (channel === 'eft') return <OzowLogo size={size + 8} />
  return <GenericPaymentGlyph size={size} />
}

const CHANNEL_LABEL: Record<DonationPaymentChannel['id'], string> = {
  card: 'Card',
  mobile_money: 'Mobile money',
  bank: 'Bank account',
  bank_transfer: 'Bank transfer',
  ussd: 'USSD',
  qr: 'QR code',
  eft: 'Instant EFT',
}

function chargeFinal(status: string): boolean {
  return status === 'success' || status === 'failed'
}

export const DonationPaymentInterface = ({
  slug,
  amount,
  donorEmail,
  donorName,
  message,
  canPay,
  onPaymentSuccess,
}: Props) => {
  const channelsQ = useDonationPaymentChannels(slug)
  const channels = useMemo<DonationPaymentChannel[]>(
    () => channelsQ.data ?? [],
    [channelsQ.data],
  )

  type Tab = {
    key: string
    channel: DonationPaymentChannel
    providerCode?: string
    providerName?: string
  }
  const tabs = useMemo<Tab[]>(() => {
    return channels.flatMap<Tab>((c) => {
      if (c.id === 'mobile_money' && c.providers && c.providers.length > 0) {
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

  const [selectedKey, setSelectedKey] = useState<string>('mobile_money')
  useEffect(() => {
    if (tabs.length === 0) return
    const momo = tabs.find((t) => t.channel.id === 'mobile_money')
    setSelectedKey(momo?.key ?? tabs[0].key)
  }, [tabs])

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

  useEffect(() => {
    if (!selectedTab || !selected) return
    if (selected.id === 'mobile_money' && selectedTab.providerCode) {
      if (momo.provider !== selectedTab.providerCode) {
        setMomo((m) => ({ ...m, provider: selectedTab.providerCode! }))
      }
    }
  }, [selectedTab, selected, momo.provider])

  const charge = useDonationCharge(slug)
  const [chargeResponse, setChargeResponse] =
    useState<DonationChargeResponse | null>(null)
  const reference = chargeResponse?.reference ?? null
  const polling = !!chargeResponse && !chargeFinal(chargeResponse.status)
  const statusQ = useDonationPaymentStatus(reference, polling)
  const submitStep = useDonationChargeSubmitStep(reference ?? '')

  useEffect(() => {
    if (statusQ.data?.status === 'success') {
      onPaymentSuccess?.()
    }
  }, [statusQ.data?.status, onPaymentSuccess])

  const buildChargePayload = (): DonationChargeRequest | null => {
    if (!selected) return null
    const base = {
      amount,
      donor_email: donorEmail,
      donor_name: donorName || undefined,
      message: message || undefined,
    }
    switch (selected.id) {
      case 'card':
        return {
          ...base,
          channel: 'card',
          card_number: card.card_number.replace(/\s+/g, ''),
          expiry_month: card.expiry_month.padStart(2, '0'),
          expiry_year: card.expiry_year,
          cvv: card.cvv,
        }
      case 'mobile_money':
        return {
          ...base,
          channel: 'mobile_money',
          phone: momo.phone,
          provider: momo.provider || selected.providers?.[0]?.code,
        }
      case 'bank':
        return {
          ...base,
          channel: 'bank',
          bank_code: bank.bank_code,
          bank_account_number: bank.bank_account_number,
        }
      case 'bank_transfer':
        return { ...base, channel: 'bank_transfer' }
      case 'ussd':
        return {
          ...base,
          channel: 'ussd',
          ussd_type: ussd.ussd_type || selected.providers?.[0]?.code,
        }
      case 'qr':
        return {
          ...base,
          channel: 'qr',
          qr_provider: qr.qr_provider || selected.providers?.[0]?.code,
        }
      case 'eft':
        return {
          ...base,
          channel: 'eft',
          eft_provider: eft.eft_provider || selected.providers?.[0]?.code,
        }
    }
  }

  const onPay = async () => {
    const body = buildChargePayload()
    if (!body) return
    try {
      const resp = await charge.mutateAsync(body)
      setChargeResponse(resp)
    } catch {
      /* mutation error surfaced below */
    }
  }

  if (channelsQ.isLoading) {
    return <ChannelsSkeleton />
  }

  if (chargeResponse) {
    return (
      <ActiveChargePanel
        charge={chargeResponse}
        status={statusQ.data ?? null}
        submitting={submitStep.isPending}
        onSubmitStep={async (action, value) => {
          const resp = await submitStep.mutateAsync({ action, value })
          setChargeResponse(resp)
        }}
        onRetry={() => setChargeResponse(null)}
      />
    )
  }

  return (
    <div className="min-w-0 space-y-4" data-testid="donation-payment-interface">
      <ChannelTabsStrip
        tabs={tabs}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        disabled={charge.isPending}
      />

      {selected?.id === 'card' && (
        <CardFieldsBlock card={card} setCard={setCard} disabled={charge.isPending} />
      )}
      {selected?.id === 'mobile_money' && (
        <MoMoFieldsBlock momo={momo} setMomo={setMomo} disabled={charge.isPending} />
      )}
      {selected?.id === 'bank' && (
        <BankFieldsBlock bank={bank} setBank={setBank} disabled={charge.isPending} />
      )}
      {selected?.id === 'ussd' && (
        <USSDFieldsBlock
          ussd={ussd}
          setUssd={setUssd}
          providers={selected.providers ?? []}
          disabled={charge.isPending}
        />
      )}
      {selected?.id === 'qr' && (
        <QRFieldsBlock
          qr={qr}
          setQr={setQr}
          providers={selected.providers ?? []}
          disabled={charge.isPending}
        />
      )}
      {selected?.id === 'eft' && (
        <EFTFieldsBlock
          eft={eft}
          setEft={setEft}
          providers={selected.providers ?? []}
          disabled={charge.isPending}
        />
      )}
      {selected?.id === 'bank_transfer' && (
        <p className="text-sm text-[var(--text-secondary)]">
          Click <span className="font-medium">Send tip</span> to generate a
          unique virtual bank account. Send the exact amount and your tip will
          confirm automatically.
        </p>
      )}

      {charge.isError && (
        <p className="text-sm text-red-600">
          {(charge.error as any)?.body?.detail ||
            (charge.error as any)?.message ||
            'Payment failed. Please try again.'}
        </p>
      )}

      <Button
        type="button"
        variant="default"
        className="w-full"
        loading={charge.isPending}
        disabled={!canPay || charge.isPending}
        onClick={onPay}
      >
        Send tip
      </Button>
    </div>
  )
}

// ── Channel tabs strip — scrollable horizontally, contained within parent ──

const ChannelTabsStrip = ({
  tabs,
  selectedKey,
  onSelect,
  disabled,
}: {
  tabs: {
    key: string
    channel: DonationPaymentChannel
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
      'relative flex min-w-0 items-stretch gap-2 overflow-x-auto pb-2',
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
            'min-w-[6rem] rounded-xl border px-3 py-3 transition-colors duration-150',
            '[scroll-snap-align:start]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            active
              ? 'border-[var(--accent)] bg-[var(--surface-elevated)]'
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
    className="flex min-w-0 items-stretch gap-2 pb-2"
  >
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={cn(
          'h-[72px] min-w-[6rem] flex-none animate-pulse rounded-xl',
          'border border-[var(--border)] bg-[var(--surface-sunken)]',
        )}
      />
    ))}
  </div>
)

// ── Per-channel field blocks — all use w-full, card grid wraps on mobile ──

const CardFieldsBlock = ({
  card,
  setCard,
  disabled,
}: {
  card: CardFields
  setCard: (v: CardFields) => void
  disabled?: boolean
}) => (
  <div className="min-w-0 space-y-3">
    <div className="space-y-2">
      <FormLabel className="text-sm">Card number</FormLabel>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 1234 1234 1234"
        className="w-full"
        value={card.card_number}
        disabled={disabled}
        onChange={(e) => setCard({ ...card, card_number: e.target.value })}
      />
    </div>
    {/* Grid wraps: 2 cols on very narrow (≤360), 3 cols on wider */}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      <div className="space-y-2">
        <FormLabel className="text-sm">Month</FormLabel>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp-month"
          placeholder="MM"
          maxLength={2}
          className="w-full"
          value={card.expiry_month}
          disabled={disabled}
          onChange={(e) => setCard({ ...card, expiry_month: e.target.value })}
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
          className="w-full"
          value={card.expiry_year}
          disabled={disabled}
          onChange={(e) => setCard({ ...card, expiry_year: e.target.value })}
        />
      </div>
      <div className="col-span-2 space-y-2 sm:col-span-1">
        <FormLabel className="text-sm">CVC</FormLabel>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="CVC"
          maxLength={4}
          className="w-full"
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
  <div className="min-w-0 space-y-2">
    <FormLabel className="text-sm">Mobile money number</FormLabel>
    <Input
      type="tel"
      inputMode="tel"
      placeholder="+254 712 345 678"
      className="w-full"
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
  <div className="min-w-0 space-y-3">
    <div className="space-y-2">
      <FormLabel className="text-sm">Bank</FormLabel>
      <Input
        type="text"
        placeholder="Bank code (e.g. 057 GTBank)"
        className="w-full"
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
        className="w-full"
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
  providers: DonationPaymentChannelProvider[]
  disabled?: boolean
}) => (
  <div className="min-w-0 space-y-2">
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
  providers: DonationPaymentChannelProvider[]
  disabled?: boolean
}) => (
  <div className="min-w-0 space-y-2">
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
  providers: DonationPaymentChannelProvider[]
  disabled?: boolean
}) => (
  <div className="min-w-0 space-y-2">
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
  submitting,
  onSubmitStep,
  onRetry,
}: {
  charge: DonationChargeResponse
  status: {
    status: string
    next_action?: { action?: string; display_text?: string } | null
  } | null
  submitting: boolean
  onSubmitStep: (
    action: 'otp' | 'pin' | 'phone' | 'birthday',
    value: string,
  ) => Promise<void>
  onRetry: () => void
}) => {
  const [stepValue, setStepValue] = useState('')
  const failed = status?.status === 'failed'
  const action = status?.next_action ?? null

  if (failed) {
    return (
      <div className="min-w-0 space-y-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        <div>
          <span className="font-medium">Payment failed.</span>{' '}
          {charge.display_text || 'Please try a different method.'}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
        >
          Choose another method
        </button>
      </div>
    )
  }

  if (action?.action) {
    const labelByType: Record<string, string> = {
      otp: 'Enter the OTP sent to your phone',
      pin: 'Enter your card PIN',
      phone: 'Enter your phone number',
      birthday: 'Enter your date of birth',
    }
    return (
      <div className="min-w-0 space-y-2">
        <FormLabel className="text-sm">
          {labelByType[action.action] || action.display_text}
        </FormLabel>
        <Input
          type="text"
          className="w-full"
          value={stepValue}
          disabled={submitting}
          onChange={(e) => setStepValue(e.target.value)}
        />
        <Button
          type="button"
          variant="default"
          className="w-full"
          loading={submitting}
          disabled={submitting || !stepValue}
          onClick={() =>
            onSubmitStep(
              action.action as 'otp' | 'pin' | 'phone' | 'birthday',
              stepValue,
            )
          }
        >
          Submit
        </Button>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4 text-sm text-[var(--text-secondary)]"
    >
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      <span className="min-w-0 break-words">
        {charge.display_text ||
          'Waiting for you to authorise the payment on your phone…'}
      </span>
    </div>
  )
}

export default DonationPaymentInterface
