/**
 * Payment-method icons.
 *
 * Custom path-based SVGs for every Paystack channel / provider Blyss
 * surfaces at checkout. Each icon is a 32x32 (default) or 24x24 viewBox,
 * brand colours locked inside the SVG so they don't drift with theme.
 *
 * No Lucide. No external icon library. The Blyss design constraint
 * (per the blyss-design + ui-ux-pro-max skills) forbids generic icon
 * sets on marketplace surfaces — payment-method logos in particular
 * must be recognisable at a glance, so each one is its own SVG built
 * to match the official brand mark.
 */

interface IconProps {
  size?: number
  className?: string
  title?: string
}

const base = (size?: number, className?: string) => ({
  width: size ?? 32,
  height: size ?? 32,
  className,
  xmlns: 'http://www.w3.org/2000/svg',
  role: 'img' as const,
})

// ── Card brands ───────────────────────────────────────────────────

export const VisaLogo = ({ size, className, title = 'Visa' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 32" aria-label={title}>
    <rect width="64" height="32" rx="4" fill="#1A1F71" />
    <path
      d="M28.5 21.5h-3.5l2.2-11h3.5l-2.2 11Zm10.5-10.7c-.7-.3-1.8-.6-3.1-.6-3.5 0-6 1.7-6 4.2 0 1.8 1.7 2.8 3 3.4 1.3.6 1.8 1 1.8 1.5 0 .8-1 1.2-1.9 1.2-1.3 0-2-.2-3-.6l-.4-.2-.4 2.5c.7.3 2.1.6 3.5.6 3.7 0 6.2-1.7 6.2-4.3 0-1.4-.9-2.5-2.8-3.4-1.2-.6-1.9-.9-1.9-1.5 0-.5.6-1 1.9-1 1.1 0 1.9.2 2.5.5l.3.1.3-2.4Zm6.5 5.5c.3-.7 1.4-3.6 1.4-3.6l.4 3.6h-1.8Zm4-5.8h-2.7c-.8 0-1.4.2-1.8 1l-5 11.7h3.5l.7-1.9h4.2l.4 1.9H52l-2.5-12.7Zm-19.5 0L26.5 18l-.4-1.7c-.6-2-2.5-4.2-4.6-5.3L24.5 21.5h3.5l5.4-10.7H30l-.5 0Z"
      fill="#fff"
    />
  </svg>
)

export const MastercardLogo = ({ size, className, title = 'Mastercard' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 32" aria-label={title}>
    <rect width="64" height="32" rx="4" fill="#000" />
    <circle cx="26" cy="16" r="8" fill="#EB001B" />
    <circle cx="38" cy="16" r="8" fill="#F79E1B" />
    <path
      d="M32 22.4a8 8 0 0 0 0-12.8 8 8 0 0 0 0 12.8Z"
      fill="#FF5F00"
    />
  </svg>
)

export const VerveLogo = ({ size, className, title = 'Verve' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 32" aria-label={title}>
    <rect width="64" height="32" rx="4" fill="#0033A0" />
    <path
      d="M14 11h4l3 7 3-7h4l-5 11h-4L14 11Zm17 0h9v3h-6v1.5h5.5V18H34v1.5h6V22h-9V11Zm12 11V11h5c2 0 3.5 1 3.5 3 0 1.4-.7 2.3-1.7 2.7l2 5.3h-3.2l-1.7-4.5H46V22h-3Zm3-7h2c.7 0 1-.4 1-1s-.3-1-1-1h-2v2Z"
      fill="#fff"
    />
    <circle cx="56" cy="16" r="3" fill="#FFCD00" />
  </svg>
)

// ── Mobile money ──────────────────────────────────────────────────

export const MpesaLogo = ({ size, className, title = 'M-Pesa' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 32" aria-label={title}>
    <rect width="64" height="32" rx="4" fill="#43B02A" />
    <path
      d="M9 22V11h3l3 6 3-6h3v11h-3v-6l-2 4h-2l-2-4v6H9Zm15 0V11h7c2 0 3 1 3 2.8 0 1.5-1 2.5-2.5 2.6 1.7.2 2.8 1.3 2.8 3 0 1.8-1.2 2.6-3.3 2.6h-7Zm3-6.5h3c.8 0 1.2-.4 1.2-1s-.4-1-1.2-1h-3v2Zm0 4.5h3.3c.8 0 1.3-.4 1.3-1.1s-.5-1.1-1.3-1.1H27v2.2ZM39 22l4-11h3l4 11h-3.2l-.7-2H43l-.7 2H39Zm4.6-4.2h2.6L45 14.4l-1.4 3.4Z"
      fill="#fff"
    />
  </svg>
)

export const MtnLogo = ({ size, className, title = 'MTN MoMo' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 32" aria-label={title}>
    <rect width="64" height="32" rx="4" fill="#FFCC00" />
    <path
      d="M14 22V10h4l4 7 4-7h4v12h-3v-7l-3.5 6h-2l-3.5-6v7h-4Zm22 0V10h11v3h-4v9h-3v-9h-4Z"
      fill="#000"
    />
  </svg>
)

export const AirteltigoLogo = ({ size, className, title = 'AirtelTigo' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 32" aria-label={title}>
    <rect width="64" height="32" rx="4" fill="#ED1C24" />
    <path
      d="M12 22h-3l4.5-12h3.5L21.5 22h-3l-.8-2.3h-4.9L12 22Zm1.5-4.7h3.4l-1.7-5-1.7 5ZM23 22V10h3v12h-3Zm6 0V10h11v3h-4v9h-3v-9h-4Zm14 0V10h3v12h-3Zm6 0V10h3v9h6v3h-9Z"
      fill="#fff"
    />
  </svg>
)

export const VodafoneLogo = ({ size, className, title = 'Vodafone Cash' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 32" aria-label={title}>
    <rect width="64" height="32" rx="4" fill="#E60000" />
    <path
      d="M16 22 11 10h3.5l3.2 8.5L21 10h3.5L19 22h-3Zm12-12c4 0 6 2.5 6 6s-2 6-6 6-6-2.5-6-6 2-6 6-6Zm0 3c-1.7 0-2.7 1-2.7 3s1 3 2.7 3 2.7-1 2.7-3-1-3-2.7-3Z"
      fill="#fff"
    />
  </svg>
)

// ── Bank / USSD / Bank transfer ──────────────────────────────────

/**
 * Generic bank glyph — building façade with a column row, used for the
 * Pay-with-Bank channel where Paystack handles bank-account direct debit.
 */
export const BankGlyph = ({ size, className, title = 'Bank account' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 32 32" aria-label={title} fill="none">
    <path d="M4 13 16 6l12 7v2H4v-2Z" fill="currentColor" />
    <path
      d="M7 16h2v9H7v-9Zm6 0h2v9h-2v-9Zm6 0h2v9h-2v-9Zm6 0h2v9h-2v-9Z"
      fill="currentColor"
    />
    <path d="M3 26h26v3H3v-3Z" fill="currentColor" />
  </svg>
)

/**
 * Bank-transfer (Pay-with-Transfer) glyph — building + arrow indicating
 * outgoing transfer. Used when Paystack returns a virtual account.
 */
export const BankTransferGlyph = ({ size, className, title = 'Bank transfer' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 32 32" aria-label={title} fill="none">
    <path d="M3 11 13 5l10 6v2H3v-2Z" fill="currentColor" />
    <path d="M5 14h2v8H5v-8Zm5 0h2v8h-2v-8Zm5 0h2v8h-2v-8Z" fill="currentColor" />
    <path d="M2 23h22v3H2v-3Z" fill="currentColor" />
    <path
      d="M22 14l5 4-5 4v-3h-4v-2h4v-3Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * USSD glyph — a phone with a `*#` mark, the canonical USSD trigger.
 */
export const UssdGlyph = ({ size, className, title = 'USSD' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 32 32" aria-label={title} fill="none">
    <rect
      x="9"
      y="4"
      width="14"
      height="24"
      rx="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <text
      x="16"
      y="20"
      textAnchor="middle"
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      fontSize="9"
      fontWeight="700"
      fill="currentColor"
    >
      *#
    </text>
  </svg>
)

/**
 * QR-code glyph — three corner finders, the universally recognised QR
 * mark. Plain monochrome; pairs with whatever channel button colour is
 * passed via currentColor.
 */
export const QrGlyph = ({ size, className, title = 'QR code' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 32 32" aria-label={title} fill="none">
    <rect x="4" y="4" width="9" height="9" stroke="currentColor" strokeWidth="2" />
    <rect x="19" y="4" width="9" height="9" stroke="currentColor" strokeWidth="2" />
    <rect x="4" y="19" width="9" height="9" stroke="currentColor" strokeWidth="2" />
    <rect x="7.5" y="7.5" width="2" height="2" fill="currentColor" />
    <rect x="22.5" y="7.5" width="2" height="2" fill="currentColor" />
    <rect x="7.5" y="22.5" width="2" height="2" fill="currentColor" />
    <path
      d="M19 19h3v3h-3v-3Zm6 0h3v3h-3v-3Zm-6 6h3v3h-3v-3Zm6-3h3v3h-3v-3Zm0 6h3v-3h-3v3Z"
      fill="currentColor"
    />
  </svg>
)

/**
 * Ozow EFT glyph — South-African instant-EFT brand. Stylised "O" with
 * the brand teal.
 */
export const OzowLogo = ({ size, className, title = 'Ozow' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 32" aria-label={title}>
    <rect width="64" height="32" rx="4" fill="#00C8A0" />
    <path
      d="M16 9c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm12-3h3l3 9 3-9h3l-5 14h-2L28 9Zm17 0c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
      fill="#fff"
    />
  </svg>
)

// ── Generic fallback (when Paystack returns a channel we don't have
//    a brand mark for yet — defensive default so the UI never breaks)

export const GenericPaymentGlyph = ({
  size,
  className,
  title = 'Payment method',
}: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 32 32" aria-label={title} fill="none">
    <rect
      x="3"
      y="7"
      width="26"
      height="18"
      rx="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M3 13h26" stroke="currentColor" strokeWidth="2" />
    <path d="M7 19h6v2H7v-2Z" fill="currentColor" />
  </svg>
)
