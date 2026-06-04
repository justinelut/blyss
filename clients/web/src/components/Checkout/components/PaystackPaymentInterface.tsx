'use client'

import type { schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import { Input } from '@/components/ui/input'
import {
  useCheckoutCharge,
  useCheckoutChargeSubmitStep,
  useCheckoutPaymentChannels,
  useCheckoutPaymentStatus,
  type ChargeRequest,
  type ChargeResponse,
  type PaymentChannel,
} from '@/hooks/queries/checkoutPaystack'
import { cn } from '@/lib/utils'
import { CheckCircle, CreditCard, Loader2, Smartphone, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface Props {
  checkout: schemas['CheckoutPublic']
  disabled?: boolean
  /**
   * Notify parent of the selected channel id (for analytics / form state).
   * Kept for backward-compat with the old prop signature.
   */
  onPaymentMethodSelect?: (channel: string) => void
  /**
   * Called when payment succeeds and we want to advance to the
   * confirmation page. The parent already knows the client_secret.
   */
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

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  card: CreditCard,
  mobile_money: Smartphone,
  bank: CreditCard,
  bank_transfer: CreditCard,
  ussd: Smartphone,
  qr: Smartphone,
  eft: CreditCard,
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

  const [selectedId, setSelectedId] = useState<PaymentChannel['id']>('card')
  useEffect(() => {
    // Default to first available channel; card if present, else first.
    if (channels.length === 0) return
    const card = channels.find((c) => c.id === 'card')
    const next = card?.id ?? channels[0].id
    setSelectedId(next)
    onPaymentMethodSelect?.(next)
  }, [channels, onPaymentMethodSelect])

  const selected = channels.find((c) => c.id === selectedId)

  // Channel-specific input state. Each channel has its own slice so
  // switching channels doesn't lose previously entered values.
  const [card, setCard] = useState<CardFields>({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
  })
  const [momo, setMomo] = useState<MoMoFields>({ phone: '', provider: 'mpesa' })
  const [bank, setBank] = useState<BankFields>({
    bank_code: '',
    bank_account_number: '',
  })
  const [ussd, setUssd] = useState<USSDFields>({ ussd_type: '' })
  const [qr, setQr] = useState<QRFields>({ qr_provider: '' })
  const [eft, setEft] = useState<EFTFields>({ eft_provider: '' })

  const charge = useCheckoutCharge(clientSecret)
  const submitStep = useCheckoutChargeSubmitStep(clientSecret)

  // Once we have a charge reference, poll status. The poll auto-stops on
  // success / failed (see refetchInterval in the hook).
  const [chargeResponse, setChargeResponse] = useState<ChargeResponse | null>(
    null,
  )
  const polling = !!chargeResponse && !chargeFinal(chargeResponse.status)
  const statusQ = useCheckoutPaymentStatus(clientSecret, polling)

  // Trigger onPaymentSuccess once status flips to success.
  useEffect(() => {
    if (statusQ.data?.status === 'success') {
      onPaymentSuccess?.()
    }
  }, [statusQ.data?.status, onPaymentSuccess])

  const onChannelClick = (id: PaymentChannel['id']) => {
    setSelectedId(id)
    onPaymentMethodSelect?.(id)
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
      case 'mobile_money':
        return {
          channel: 'mobile_money',
          phone: momo.phone,
          provider: momo.provider,
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
        return { channel: 'ussd', ussd_type: ussd.ussd_type }
      case 'qr':
        return { channel: 'qr', qr_provider: qr.qr_provider }
      case 'eft':
        return { channel: 'eft', eft_provider: eft.eft_provider }
    }
  }

  const onPay = async () => {
    const body = buildChargePayload()
    if (!body) return
    try {
      const resp = await charge.mutateAsync(body)
      setChargeResponse(resp)
    } catch (err) {
      // mutation already surfaces error in react-query state; nothing to do
    }
  }

  const onSubmitStep = async (
    action: 'otp' | 'pin' | 'phone' | 'birthday',
    value: string,
  ) => {
    const resp = await submitStep.mutateAsync({ action, value })
    setChargeResponse(resp)
  }

  // Done — payment finalised.
  if (statusQ.data?.status === 'success') {
    return <SuccessPanel />
  }

  // Charge submitted; either polling, awaiting next-action input, or failed.
  if (chargeResponse) {
    return (
      <ActiveChargePanel
        charge={chargeResponse}
        status={statusQ.data ?? null}
        submitting={submitStep.isPending}
        onSubmitStep={onSubmitStep}
        onRetry={() => setChargeResponse(null)}
      />
    )
  }

  return (
    <div className="space-y-4" data-testid="paystack-payment-interface">
      <div className="grid gap-2 sm:grid-cols-2">
        {channels.map((c) => {
          const Icon = CHANNEL_ICON[c.id] ?? CreditCard
          const active = c.id === selectedId
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChannelClick(c.id)}
              disabled={disabled}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                active
                  ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]'
                  : 'border-[var(--border)] hover:bg-[var(--surface-sunken)]',
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 flex-none text-[var(--accent)]" />
              <div>
                <div className="font-medium text-[var(--text-primary)]">
                  {c.name}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {c.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selected?.id === 'card' && (
        <CardFieldsBlock card={card} setCard={setCard} disabled={disabled} />
      )}
      {selected?.id === 'mobile_money' && (
        <MoMoFieldsBlock
          momo={momo}
          setMomo={setMomo}
          providers={selected.providers ?? []}
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
          We&apos;ll generate a unique virtual bank account for you. Send the
          exact amount and your payment will confirm automatically.
        </p>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={onPay}
        disabled={disabled || charge.isPending || !selected}
        loading={charge.isPending}
      >
        {charge.isPending ? 'Processing…' : 'Pay'}
      </Button>

      {charge.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {(charge.error as any)?.body?.detail ||
            (charge.error as any)?.message ||
            'Payment failed. Please try again.'}
        </div>
      )}
    </div>
  )
}

function chargeFinal(status: string): boolean {
  return status === 'success' || status === 'failed'
}

export default PaystackPaymentInterface


// ── Per-channel field blocks ───────────────────────────────────────

const CardFieldsBlock = ({
  card,
  setCard,
  disabled,
}: {
  card: CardFields
  setCard: (v: CardFields) => void
  disabled?: boolean
}) => (
  <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="cc-number"
      placeholder="Card number"
      value={card.card_number}
      disabled={disabled}
      onChange={(e) => setCard({ ...card, card_number: e.target.value })}
    />
    <div className="grid grid-cols-3 gap-2">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="cc-exp-month"
        placeholder="MM"
        maxLength={2}
        value={card.expiry_month}
        disabled={disabled}
        onChange={(e) => setCard({ ...card, expiry_month: e.target.value })}
      />
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="cc-exp-year"
        placeholder="YY"
        maxLength={2}
        value={card.expiry_year}
        disabled={disabled}
        onChange={(e) => setCard({ ...card, expiry_year: e.target.value })}
      />
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="cc-csc"
        placeholder="CVV"
        maxLength={4}
        value={card.cvv}
        disabled={disabled}
        onChange={(e) => setCard({ ...card, cvv: e.target.value })}
      />
    </div>
  </div>
)

const MoMoFieldsBlock = ({
  momo,
  setMomo,
  providers,
  disabled,
}: {
  momo: MoMoFields
  setMomo: (v: MoMoFields) => void
  providers: { code: string; name: string }[]
  disabled?: boolean
}) => (
  <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
    {providers.length > 1 && (
      <div className="grid grid-cols-3 gap-2">
        {providers.map((p) => (
          <button
            key={p.code}
            type="button"
            disabled={disabled}
            onClick={() => setMomo({ ...momo, provider: p.code })}
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              momo.provider === p.code
                ? 'border-[var(--accent)] bg-[var(--surface-elevated)]'
                : 'border-[var(--border)]',
            )}
          >
            {p.name}
          </button>
        ))}
      </div>
    )}
    <Input
      type="tel"
      inputMode="tel"
      placeholder="Phone number (e.g. +254712345678)"
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
  <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
    <Input
      type="text"
      placeholder="Bank code"
      value={bank.bank_code}
      disabled={disabled}
      onChange={(e) => setBank({ ...bank, bank_code: e.target.value })}
    />
    <Input
      type="text"
      inputMode="numeric"
      placeholder="Account number"
      value={bank.bank_account_number}
      disabled={disabled}
      onChange={(e) =>
        setBank({ ...bank, bank_account_number: e.target.value })
      }
    />
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
  providers: { code: string; name: string }[]
  disabled?: boolean
}) => (
  <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] p-4">
    {providers.map((p) => (
      <button
        key={p.code}
        type="button"
        disabled={disabled}
        onClick={() => setUssd({ ussd_type: p.code })}
        className={cn(
          'rounded-md border px-3 py-2 text-sm',
          ussd.ussd_type === p.code
            ? 'border-[var(--accent)] bg-[var(--surface-elevated)]'
            : 'border-[var(--border)]',
        )}
      >
        {p.name}
      </button>
    ))}
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
  providers: { code: string; name: string }[]
  disabled?: boolean
}) => (
  <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] p-4">
    {providers.map((p) => (
      <button
        key={p.code}
        type="button"
        disabled={disabled}
        onClick={() => setQr({ qr_provider: p.code })}
        className={cn(
          'rounded-md border px-3 py-2 text-sm',
          qr.qr_provider === p.code
            ? 'border-[var(--accent)] bg-[var(--surface-elevated)]'
            : 'border-[var(--border)]',
        )}
      >
        {p.name}
      </button>
    ))}
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
  providers: { code: string; name: string }[]
  disabled?: boolean
}) => (
  <div className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--border)] p-4">
    {providers.map((p) => (
      <button
        key={p.code}
        type="button"
        disabled={disabled}
        onClick={() => setEft({ eft_provider: p.code })}
        className={cn(
          'rounded-md border px-3 py-2 text-sm',
          eft.eft_provider === p.code
            ? 'border-[var(--accent)] bg-[var(--surface-elevated)]'
            : 'border-[var(--border)]',
        )}
      >
        {p.name}
      </button>
    ))}
  </div>
)


// ── Status panels ────────────────────────────────────────────────

const SuccessPanel = () => (
  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
    <CheckCircle className="h-5 w-5 flex-none" />
    <div>
      <div className="font-medium">Payment received</div>
      <div className="text-sm">Wrapping up your order…</div>
    </div>
  </div>
)

const ActiveChargePanel = ({
  charge,
  status,
  submitting,
  onSubmitStep,
  onRetry,
}: {
  charge: ChargeResponse
  status: { status: string; next_action?: { type: string; display_text: string } | null } | null
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
      <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 flex-none" />
          <div>
            <div className="font-medium">Payment failed</div>
            <div className="text-sm">{charge.display_text || 'Please try again.'}</div>
          </div>
        </div>
        <Button type="button" size="sm" onClick={onRetry}>
          Try another method
        </Button>
      </div>
    )
  }

  if (action) {
    return (
      <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
        <div className="font-medium text-[var(--text-primary)]">
          {action.display_text || 'Additional info needed'}
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={action.type.toUpperCase()}
            value={stepValue}
            onChange={(e) => setStepValue(e.target.value)}
            disabled={submitting}
          />
          <Button
            type="button"
            disabled={submitting || !stepValue}
            loading={submitting}
            onClick={() =>
              onSubmitStep(
                action.type as 'otp' | 'pin' | 'phone' | 'birthday',
                stepValue,
              )
            }
          >
            Submit
          </Button>
        </div>
      </div>
    )
  }

  // Pending — render channel-specific waiting UI.
  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 h-5 w-5 flex-none animate-spin text-[var(--accent)]" />
        <div className="space-y-1">
          <div className="font-medium text-[var(--text-primary)]">
            Waiting for payment…
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            {charge.display_text}
          </div>
          {charge.account_number && (
            <div className="mt-2 rounded-md border border-[var(--border)] bg-white p-3 text-sm">
              <div>
                <span className="text-[var(--text-secondary)]">Bank:</span>{' '}
                {charge.bank_name || '—'}
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Account:</span>{' '}
                {charge.account_number}
              </div>
              {charge.account_name && (
                <div>
                  <span className="text-[var(--text-secondary)]">Name:</span>{' '}
                  {charge.account_name}
                </div>
              )}
            </div>
          )}
          {charge.ussd_code && (
            <div className="mt-2 rounded-md border border-[var(--border)] bg-white p-3 text-center font-mono text-base">
              {charge.ussd_code}
            </div>
          )}
          {charge.qr_image_url && (
            <img
              src={charge.qr_image_url}
              alt="QR code"
              className="mx-auto mt-2 h-48 w-48 rounded-md border border-[var(--border)]"
            />
          )}
        </div>
      </div>
    </div>
  )
}
