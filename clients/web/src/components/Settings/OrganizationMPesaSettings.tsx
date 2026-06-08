'use client'

/* Hallmark · component: settings/payouts · genre: editorial-utility
 * theme: blyss-design (light cream + burnt orange #C2410C accent)
 * states: idle · sending · waiting (poll) · succeeded · failed
 * contrast: pass · slop: pass (no shadow-cards, react-icons only)
 *
 * Reference DNA: Trimly (Kenya bookings) — single-column form that flows
 * through Initiate STK → Waiting screen with phone-frame icon and progress
 * bar → auto-confirm via 3-second polling. Buyer never has to click
 * "I've approved" — the page detects success and moves on.
 *
 * Backend pair:
 *   POST /v1/integrations/paystack/organizations/{id}/mpesa/initiate-verification
 *     → returns { reference, status, display_text }
 *   GET  /v1/integrations/paystack/organizations/{id}/mpesa/charge-status?reference=
 *     → returns { status, gateway_response }
 *   POST /v1/integrations/paystack/organizations/{id}/mpesa/finalize-verification
 *     → returns Organization (with subaccount_code, subaccount_status='active')
 */

import { useAuth } from '@/hooks'
import { api } from '@/utils/client'
import { schemas, unwrap } from '@/lib/api'
import { translatePaystackError } from '@/lib/paystack/translate-error'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCheck,
  FiPhone,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi'
import { useForm } from 'react-hook-form'
import { toast } from '../Toast/use-toast'
import OrganizationBankSettings from './OrganizationBankSettings'

interface MPesaConfigurationForm {
  mpesa_number: string
  payout_method: 'bank' | 'mpesa'
}

interface OrganizationMPesaSettingsProps {
  organization: schemas['Organization']
  /**
   * When true, render an editorial banner at the top of the form linking
   * to /dashboard/{slug}/finance/account. Used from the Settings tab so
   * creators can jump to the full Finance setup wizard. Always false (the
   * default) when this component is itself rendered inside the Finance
   * wizard, where the link would be recursive.
   */
  showFinanceDeepLink?: boolean
}

type WaitingStage = 'idle' | 'sending' | 'waiting' | 'succeeded' | 'failed'

const POLL_INTERVAL_MS = 3000
// Safaricom STK push expires at ~180s; we poll for 200s so we catch the
// last confirmation before the prompt vanishes.
const POLL_TIMEOUT_MS = 200_000

/**
 * normalisePhone — coerce the creator's input into Paystack's expected
 * E.164 form. We accept '0712 345 678', '0712345678', '+254 712 345 678'
 * and produce '+254712345678'.
 */
function normalisePhone(raw: string): string {
  let v = raw.replace(/[\s-]/g, '')
  if (v.startsWith('0') && v.length === 10) {
    v = '+254' + v.slice(1)
  } else if (v.startsWith('254') && !v.startsWith('+254')) {
    v = '+' + v
  } else if ((v.startsWith('7') || v.startsWith('1')) && v.length === 9) {
    v = '+254' + v
  }
  return v
}

const OrganizationMPesaSettings: React.FC<OrganizationMPesaSettingsProps> = ({
  organization,
  showFinanceDeepLink = false,
}) => {
  const { currentUser } = useAuth()
  const [stage, setStage] = useState<WaitingStage>('idle')
  const [reference, setReference] = useState<string | null>(null)
  const [displayText, setDisplayText] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Verification charge amount — fetched from the backend so the
  // dashboard copy always matches what the creator is actually
  // charged. Backoffice-tunable via runtime_settings; without this
  // fetch the UI used to hardcode 'KSh 100' even after admins
  // overrode the real value to KES 1 for testing.
  const [verificationAmountKes, setVerificationAmountKes] =
    useState<number>(100)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = (await unwrap(
          (api as any).GET(
            '/v1/integrations/paystack/mpesa/verification-config',
          ),
        )) as { amount_kobo: number; amount_kes: number } | undefined
        if (!cancelled && data?.amount_kes != null) {
          setVerificationAmountKes(Number(data.amount_kes))
        }
      } catch {
        // Fail-quiet: keep the 100 default. The actual charge runs
        // through the backend which always reads the live value, so
        // a stale UI label is the worst case here.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)

  const form = useForm<MPesaConfigurationForm>({
    mode: 'onChange',
    defaultValues: {
      mpesa_number: organization.mpesa_number || '',
      payout_method: organization.payout_method || 'mpesa',
    },
  })
  const { watch, register, handleSubmit, formState } = form
  const mpesaNumber = watch('mpesa_number')
  const payoutMethod = watch('payout_method')

  const subaccountCode = organization.subaccount_code
  const subaccountStatus = organization.subaccount_status || 'pending'
  const isPayoutsActive = subaccountStatus === 'active' && !!subaccountCode
  // 'pending' on a fresh org with no subaccount_code means "you haven't
  // started yet", not "we're processing". Show 'Not configured' instead
  // of a misleading spinner so the creator knows they're the next mover.
  const isNotConfigured = !subaccountCode && subaccountStatus !== 'active'

  // Cleanup poller on unmount.
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  /** Poll the lightweight charge-status endpoint every 3s. On success
   *  fire finalize-verification once; on failure surface an inline retry. */
  function beginPolling(ref: string) {
    stopPolling()
    pollTimerRef.current = setInterval(async () => {
      const elapsed = Date.now() - startedAtRef.current
      setElapsedMs(elapsed)
      if (elapsed > POLL_TIMEOUT_MS) {
        stopPolling()
        setStage('failed')
        setErrorMsg(
          'STK prompt expired. Safaricom’s window is about three minutes — try again.',
        )
        return
      }
      try {
        const status = await unwrap(
          (api as any).GET(
            '/v1/integrations/paystack/organizations/{id}/mpesa/charge-status',
            {
              params: { path: { id: organization.id }, query: { reference: ref } },
            },
          ),
        ) as { status: string; gateway_response: string | null }
        if (status.status === 'success') {
          stopPolling()
          await finalize(ref)
        } else if (
          status.status === 'failed' ||
          status.status === 'abandoned'
        ) {
          stopPolling()
          setStage('failed')
          setErrorMsg(translatePaystackError(status.gateway_response))
        }
        // 'pending' or anything else: keep polling.
      } catch {
        // Transient error — keep polling.
      }
    }, POLL_INTERVAL_MS)
  }

  async function finalize(ref: string) {
    if (!currentUser) return
    setIsFinalizing(true)
    try {
      await unwrap(
        (api as any).POST(
          '/v1/integrations/paystack/organizations/{id}/mpesa/finalize-verification',
          {
            params: { path: { id: organization.id } },
            body: { reference: ref },
          },
        ),
      )
      setStage('succeeded')
      toast({
        title: 'M-Pesa active',
        description:
          'Your number is verified and your payout subaccount is set up.',
      })
      // Reload after a brief pause so the creator sees the success state
      // before the page rerenders with the activated banner.
      setTimeout(() => window.location.reload(), 1500)
    } catch (error: any) {
      setStage('failed')
      setErrorMsg(
        error?.body?.detail ||
          error?.message ||
          'M-Pesa charge succeeded but Paystack rejected the subaccount.',
      )
    } finally {
      setIsFinalizing(false)
    }
  }

  async function onSendStk(data: MPesaConfigurationForm) {
    if (!currentUser) return
    setErrorMsg(null)
    setStage('sending')
    try {
      const cleaned = normalisePhone(data.mpesa_number)
      const response = await unwrap(
        (api as any).POST(
          '/v1/integrations/paystack/organizations/{id}/mpesa/initiate-verification',
          {
            params: { path: { id: organization.id } },
            body: { mpesa_number: cleaned },
          },
        ),
      )
      const ref = (response as any).reference as string
      const txt =
        (response as any).display_text ||
        'Approve the M-Pesa STK push on your phone.'
      setReference(ref)
      setDisplayText(txt)
      setStage('waiting')
      startedAtRef.current = Date.now()
      beginPolling(ref)
    } catch (error: any) {
      setStage('failed')
      setErrorMsg(
        error?.body?.detail ||
          error?.message ||
          'Could not start the M-Pesa verification.',
      )
    }
  }

  async function onRetrySubaccount() {
    if (!currentUser) return
    setIsRetrying(true)
    try {
      await unwrap(
        (api as any).POST(
          '/v1/integrations/paystack/organizations/{id}/subaccount/retry',
          { params: { path: { id: organization.id } } },
        ),
      )
      toast({
        title: 'Retrying payout setup',
        description: 'Setting up your payout account again.',
      })
      window.location.reload()
    } catch (error: any) {
      toast({
        title: 'Retry failed',
        description:
          error?.body?.detail ||
          error?.message ||
          'Could not retry the subaccount.',
        variant: 'error',
      })
    } finally {
      setIsRetrying(false)
    }
  }

  async function onResetMpesa() {
    // Hard-clear M-Pesa config so the creator can re-enter a different
    // number. Deactivates the Paystack subaccount on their side and
    // wipes mpesa_number / mpesa_verified / subaccount_code locally so
    // the next initiate-verification fires the create path. Calls
    // DELETE /v1/integrations/paystack/organizations/{id}/mpesa.
    if (!currentUser) return
    if (
      !confirm(
        'Reset M-Pesa setup? Your current number will be removed and you can enter a different one. The KSh 100 verification charge already paid is non-refundable.',
      )
    )
      return
    setIsResetting(true)
    try {
      await unwrap(
        (api as any).DELETE(
          '/v1/integrations/paystack/organizations/{id}/mpesa',
          { params: { path: { id: organization.id } } },
        ),
      )
      toast({
        title: 'M-Pesa setup cleared',
        description: 'Enter a new M-Pesa number below to start fresh.',
      })
      window.location.reload()
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description:
          error?.body?.detail ||
          error?.message ||
          'Could not reset M-Pesa setup.',
        variant: 'error',
      })
    } finally {
      setIsResetting(false)
    }
  }

  function resetIdle() {
    stopPolling()
    setStage('idle')
    setReference(null)
    setDisplayText('')
    setErrorMsg(null)
    setElapsedMs(0)
  }

  // ── Already active — show a green banner at top, but keep the form
  //    rendered below so creators can change number / switch to bank.
  //    Previously this branch short-circuited to a static
  //    "you're set up" block, which left no path to edit. Removing the
  //    short-circuit; the active banner is now part of the normal
  //    render path.

  // ── Waiting / succeeded / failed ─────────────────────────────
  if (stage === 'waiting' || stage === 'succeeded' || stage === 'failed') {
    return (
      <WaitingPanel
        stage={stage}
        reference={reference}
        displayText={displayText}
        errorMsg={errorMsg}
        elapsedMs={elapsedMs}
        timeoutMs={POLL_TIMEOUT_MS}
        isFinalizing={isFinalizing}
        onTryAgain={resetIdle}
        amountKes={verificationAmountKes}
      />
    )
  }

  // ── Idle / sending — the actual form ──────────────────────────
  return (
    <form onSubmit={handleSubmit(onSendStk)} className="space-y-8">
      {/* Optional deep-link banner — used by Settings tab to point creators
          to the full Finance setup wizard. The banner is omitted when the
          component is itself rendered inside Finance to avoid a recursive
          self-link. */}
      {showFinanceDeepLink && (
        <Link
          href={`/dashboard/${organization.slug}/finance/account`}
          className="group flex items-start justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Finance · Full setup
            </p>
            <p className="text-[15px] font-medium text-[var(--text-primary)]">
              Set up your full payout account in Finance
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Submit business details, verify identity, and activate
              M&#8209;Pesa or Kenyan bank payouts. Required before your first
              withdrawal.
            </p>
          </div>
          <span className="mt-1 inline-flex h-9 w-9 flex-none items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
            <FiArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      )}

      {/* Header — adapts to active state. When already verified, the
          headline reads "You're set up to be paid" instead of the
          welcome copy, and explains how to change method / number
          below. */}
      <div>
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Payouts
        </p>
        {isPayoutsActive ? (
          <>
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
              You&rsquo;re set up to be paid.
            </h2>
            <p className="mt-3 max-w-[60ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
              Sales settle into your{' '}
              {payoutMethod === 'mpesa' ? 'M-Pesa' : 'bank account'}{' '}
              automatically after each successful order, minus the
              marketplace fee. Need to change something? Update the
              method or number below.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
              Get paid for your work.
            </h2>
            <p className="mt-3 max-w-[60ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
              Pick where Blyss should send your earnings. We charge a
              one-time KSh&nbsp;100 from your M-Pesa to confirm the number
              is yours and protect against fraud — non-refundable.
            </p>
          </>
        )}
      </div>

      {/* Active summary card — shows when payouts are configured. Holds
          the current method + number, and is the visible signal that
          the form below is for *changing* setup, not first-time setup. */}
      {isPayoutsActive && (
        <div className="rounded-md border border-[var(--accent)] bg-[var(--surface-elevated)] p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--accent)]/10">
              <FiCheck
                size={16}
                className="text-[var(--accent)]"
                aria-hidden="true"
              />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-sans text-[15px] font-semibold text-[var(--text-primary)]">
                {payoutMethod === 'mpesa'
                  ? 'M-Pesa active'
                  : 'Bank account active'}
              </p>
              <p className="font-sans text-[13px] text-[var(--text-secondary)]">
                {payoutMethod === 'mpesa' && organization.mpesa_number
                  ? `Settling to ${organization.mpesa_number}`
                  : payoutMethod === 'bank' && organization.bank_account_number
                    ? `Settling to bank account ending ${String(organization.bank_account_number).slice(-4)}`
                    : 'Settling to your selected payout account'}
              </p>
            </div>
            <button
              type="button"
              onClick={onResetMpesa}
              disabled={isResetting}
              className="ml-2 inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 font-sans text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Reset M-Pesa configuration"
            >
              <FiRefreshCw
                size={14}
                className={isResetting ? 'animate-spin' : ''}
                aria-hidden="true"
              />
              {isResetting ? 'Resetting…' : 'Change number'}
            </button>
          </div>
        </div>
      )}

      {/* Status row */}
      <div className="flex items-center justify-between gap-4 border-y border-[var(--border)] py-4">
        <div>
          <p className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Status
          </p>
          <p className="mt-1 font-sans text-[14px] text-[var(--text-primary)]">
            {isNotConfigured
              ? 'Not configured yet'
              : subaccountStatus === 'active'
                ? 'Active'
                : subaccountStatus === 'failed'
                  ? 'Setup failed — retry below'
                  : 'In progress'}
          </p>
        </div>
        {subaccountStatus === 'failed' && (
          <button
            type="button"
            onClick={onRetrySubaccount}
            disabled={isRetrying}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 font-sans text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiRefreshCw
              size={14}
              className={isRetrying ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
        )}
      </div>

      {/* Method picker */}
      <div>
        <p className="mb-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
          How do you want to be paid?
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MethodCard
            active={payoutMethod === 'mpesa'}
            title="M-Pesa"
            description={`Direct to your phone. KSh ${verificationAmountKes.toLocaleString('en-KE')} verification charge.`}
            onSelect={() => form.setValue('payout_method', 'mpesa')}
          />
          <MethodCard
            active={payoutMethod === 'bank'}
            title="Bank account"
            description="KES bank deposit. No verification charge."
            onSelect={() => form.setValue('payout_method', 'bank')}
          />
        </div>
      </div>

      {/* M-Pesa input + send STK */}
      {payoutMethod === 'mpesa' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="mpesa-number"
              className="block font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]"
            >
              M-Pesa number
            </label>
            <input
              id="mpesa-number"
              type="tel"
              inputMode="tel"
              placeholder="0712 345 678"
              autoComplete="tel"
              {...register('mpesa_number', {
                required: 'M-Pesa number is required',
                validate: (v) => {
                  const cleaned = normalisePhone(v)
                  return /^\+254[17]\d{8}$/.test(cleaned)
                    ? true
                    : 'Use a Kenyan M-Pesa number (starts with 07 or 01).'
                },
              })}
              className="mt-2 h-12 w-full rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 font-sans text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            {formState.errors.mpesa_number && (
              <p className="mt-2 font-sans text-[13px] text-[var(--error,#dc2626)]">
                {formState.errors.mpesa_number.message as string}
              </p>
            )}
            <p className="mt-2 font-sans text-[13px] text-[var(--text-secondary)]">
              We&rsquo;ll push an STK prompt — approve it with your M-Pesa
              PIN. Window is about three minutes.
            </p>
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="font-sans text-[14px] text-[var(--error,#dc2626)]"
            >
              {errorMsg}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={
                stage === 'sending' ||
                !mpesaNumber ||
                !formState.isValid
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-6 font-sans text-[15px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {stage === 'sending' ? (
                <>Sending prompt…</>
              ) : (
                <>
                  Send STK push & verify
                  <FiArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bank flow */}
      {payoutMethod === 'bank' && (
        <div className="border-t border-[var(--border)] pt-6">
          <OrganizationBankSettings organization={organization} />
        </div>
      )}
    </form>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function MethodCard({
  active,
  title,
  description,
  onSelect,
}: {
  active: boolean
  title: string
  description: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={
        'flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-colors ' +
        (active
          ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]'
          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-sunken)]')
      }
    >
      <div className="flex w-full items-center justify-between">
        <span className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        <span
          aria-hidden="true"
          className={
            'h-3 w-3 rounded-full ' +
            (active
              ? 'bg-[var(--accent)]'
              : 'border border-[var(--border-strong)]')
          }
        />
      </div>
      <p className="font-sans text-[13px] leading-[1.5] text-[var(--text-secondary)]">
        {description}
      </p>
    </button>
  )
}

function WaitingPanel({
  stage,
  reference,
  displayText,
  errorMsg,
  elapsedMs,
  timeoutMs,
  isFinalizing,
  onTryAgain,
  amountKes,
}: {
  stage: 'waiting' | 'succeeded' | 'failed'
  reference: string | null
  displayText: string
  errorMsg: string | null
  elapsedMs: number
  timeoutMs: number
  isFinalizing: boolean
  onTryAgain: () => void
  amountKes: number
}) {
  const progressPct =
    stage === 'succeeded'
      ? 100
      : stage === 'failed'
        ? 100
        : Math.min(95, Math.round((elapsedMs / timeoutMs) * 100))

  const tone =
    stage === 'succeeded'
      ? 'border-[var(--accent)] bg-[var(--surface-elevated)]'
      : stage === 'failed'
        ? 'border-[var(--border)] bg-[var(--surface)]'
        : 'border-[var(--border)] bg-[var(--surface)]'

  const Icon =
    stage === 'succeeded' ? FiCheck : stage === 'failed' ? FiX : FiPhone
  const iconColor =
    stage === 'succeeded'
      ? 'text-[var(--accent)]'
      : stage === 'failed'
        ? 'text-[var(--text-secondary)]'
        : 'text-[var(--accent)]'

  return (
    <div
      className={
        'flex flex-col items-center gap-6 rounded-md border px-6 py-12 text-center ' +
        tone
      }
    >
      {/* Phone-frame icon */}
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
        <Icon size={28} className={iconColor} aria-hidden="true" />
      </div>

      {stage === 'waiting' && (
        <>
          <div className="space-y-2">
            <h3 className="font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">
              Check your phone for the M-Pesa prompt.
            </h3>
            <p className="mx-auto max-w-[44ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
              {displayText} Amount:{' '}
              <strong className="text-[var(--text-primary)]">
                KSh {amountKes.toLocaleString('en-KE')}
              </strong>
              .
            </p>
          </div>
          {/* Progress bar */}
          <div
            className="mt-2 h-1.5 w-full max-w-[360px] overflow-hidden rounded-full bg-[var(--surface-sunken)]"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="font-sans text-[12px] text-[var(--text-muted)]">
            {reference ? <>Reference {reference} · </> : null}
            {isFinalizing
              ? 'Confirming…'
              : 'We’ll auto-confirm once you approve'}
          </p>
        </>
      )}

      {stage === 'succeeded' && (
        <div className="space-y-2">
          <h3 className="font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">
            Payouts active.
          </h3>
          <p className="mx-auto max-w-[44ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
            Your M-Pesa is verified and your payout account is set up.
            We’re refreshing the page now.
          </p>
        </div>
      )}

      {stage === 'failed' && (
        <>
          <div className="space-y-2">
            <h3 className="font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">
              That didn’t go through.
            </h3>
            <p className="mx-auto max-w-[44ch] font-sans text-[15px] leading-[1.55] text-[var(--text-secondary)]">
              {errorMsg || 'The prompt timed out or was declined.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onTryAgain}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-5 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <FiRefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        </>
      )}
    </div>
  )
}

export default OrganizationMPesaSettings
