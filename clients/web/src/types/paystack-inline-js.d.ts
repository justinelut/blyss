/**
 * Type shim for @paystack/inline-js — the package ships no `.d.ts` so we
 * declare the surface we use. Reflects the v2 popup API:
 *   https://paystack.com/docs/developer-tools/inlinejs/
 *
 * The v2 popup is opened by `new PaystackPop().newTransaction({...})`.
 * Earlier v1-style `setup({...}).openIframe()` is also exposed but not
 * used here. Keep this minimal — only the methods we actually call.
 */

declare module '@paystack/inline-js' {
  export interface PaystackTransactionResponse {
    /** Transaction reference. Match against the one we generated and
     *  passed in the config. Use it to poll /transaction/verify or
     *  reconcile against the charge.success webhook. */
    reference: string
    /** 'success' / 'pay_offline' / etc. — interpret per Paystack docs. */
    status?: string
    /** Numeric transaction id, if present. */
    transaction?: string
    /** Channel chosen by the buyer ('card', 'mobile_money', etc.). */
    channel?: string
    /** Echoed back from the buyer's authorization. */
    message?: string
  }

  export interface PaystackTransactionConfig {
    /** Paystack PUBLIC key (pk_live_... / pk_test_...). NEVER pass the
     *  secret key here — it would be exposed in the bundle. */
    key: string
    /** Buyer email. Required. */
    email: string
    /** Amount in lowest currency unit (kobo for KES). */
    amount: number
    /** ISO 4217 currency code, uppercase. */
    currency?: string
    /** Idempotency reference. Unique per attempt. */
    reference?: string
    /** Subaccount code for split payments (`ACCT_xxx`). */
    subaccount?: string
    /** Allowed payment channels. */
    channels?: Array<
      'card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer' | 'eft'
    >
    /** Arbitrary data echoed back into the charge.success webhook payload. */
    metadata?: Record<string, unknown>
    firstName?: string
    lastName?: string
    label?: string
    /** Callback fired when the buyer authorizes payment. */
    onSuccess?: (transaction: PaystackTransactionResponse) => void
    /** Callback fired when the buyer closes the popup without paying. */
    onCancel?: () => void
    /** Older callback name kept for back-compat with v1-style configs. */
    onClose?: () => void
    /** Plan code (subscription flow). */
    plan?: string
    /** Multiplier for plan amount. */
    quantity?: number
    /** A flat platform fee in kobo, overrides percentage split. */
    transactionCharge?: number
    /** Who bears Paystack fees: 'account' (platform) or 'subaccount' (creator). */
    bearer?: 'account' | 'subaccount'
  }

  export default class PaystackPop {
    /** Open a Paystack popup for a brand-new transaction. */
    newTransaction(config: PaystackTransactionConfig): void

    /** Resume an in-flight transaction by its access_code (returned from
     *  /transaction/initialize on the backend). */
    resumeTransaction(access_code: string): void

    /** Encrypt card details client-side for headless flows (Mode B).
     *  Not used in Blyss's current Mode A integration but kept here for
     *  completeness. */
    encrypt(
      publicKey: string,
      card: {
        number: string
        cvv: string
        expiry_month: string
        expiry_year: string
      },
    ): string

    /** Programmatically close an open popup (e.g. on route unmount). */
    close?: () => void
  }
}
