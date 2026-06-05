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

/**
 * Visa wordmark.
 * Path data follows the simple-icons project (CC0 / public-domain
 * geometry — Visa's wordmark is a simple geometric form not subject
 * to copyright). Rendered in Visa's official navy ("classic blue"
 * #1A1F71) on a transparent background so the badge can sit on any
 * surface without a coloured tile.
 */
export const VisaLogo = ({ size, className, title = 'Visa' }: IconProps) => (
  <svg
    {...base(size, className)}
    viewBox="0 0 24 24"
    aria-label={title}
    fill="#1A1F71"
  >
    <path d="M9.112 8.262 5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 0 1 .894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 0 1 1.913.336l.34-1.59a5.207 5.207 0 0 0-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.502-.602.725-1.16.733-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.563m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 0 0-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656 1.02-2.815.588 2.815zm-8.16-4.84-1.603 7.496H8.34l1.605-7.496z" />
  </svg>
)

/**
 * Mastercard mark — three intersecting circles.
 * Mastercard dropped the wordmark in 2016. The mark itself is two
 * circles (red + amber) overlapping in a brown/orange intersection.
 */
export const MastercardLogo = ({
  size,
  className,
  title = 'Mastercard',
}: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 24 24" aria-label={title}>
    <circle cx="9" cy="12" r="6" fill="#EB001B" />
    <circle cx="15" cy="12" r="6" fill="#F79E1B" />
    <path
      d="M12 7.06a6 6 0 0 1 0 9.88 6 6 0 0 1 0-9.88z"
      fill="#FF5F00"
    />
  </svg>
)

/**
 * Verve card brand (Nigeria). Yellow + red split with the "V" mark.
 */
export const VerveLogo = ({ size, className, title = 'Verve' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 24 24" aria-label={title}>
    <rect width="24" height="24" rx="4" fill="#0033A0" />
    <path
      d="M5 8h2.4l1.8 6 1.8-6h2.4l-3 10h-2.4L5 8Zm9.5 10V8h2.5v10h-2.5Z"
      fill="#fff"
    />
    <circle cx="20" cy="13" r="2.2" fill="#FFCD00" />
  </svg>
)

// ── Mobile money ──────────────────────────────────────────────────

/**
 * M-Pesa — Safaricom's mobile-money product (Kenya).
 * Brand: Safaricom green roundel + "M-PESA" wordmark in white.
 */
export const MpesaLogo = ({ size, className, title = 'M-Pesa' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 24" aria-label={title}>
    <rect width="64" height="24" rx="3" fill="#43B02A" />
    <text
      x="32"
      y="17"
      textAnchor="middle"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
      fontWeight="800"
      fontSize="11"
      letterSpacing="0.5"
      fill="#fff"
    >
      M-PESA
    </text>
  </svg>
)

/**
 * Airtel Money — Kenya / Nigeria / Uganda etc. mobile money product.
 * Brand: Airtel red roundel + "airtel money" wordmark.
 */
export const AirtelMoneyLogo = ({
  size,
  className,
  title = 'Airtel Money',
}: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 24" aria-label={title}>
    <rect width="64" height="24" rx="3" fill="#E40000" />
    <text
      x="32"
      y="17"
      textAnchor="middle"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
      fontWeight="800"
      fontSize="11"
      letterSpacing="0.3"
      fill="#fff"
    >
      airtel
    </text>
  </svg>
)

/**
 * MTN MoMo — Ghana mobile money. Brand: MTN's signature yellow tile.
 */
export const MtnLogo = ({ size, className, title = 'MTN MoMo' }: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 24" aria-label={title}>
    <rect width="64" height="24" rx="3" fill="#FFCC00" />
    <text
      x="32"
      y="17"
      textAnchor="middle"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
      fontWeight="900"
      fontSize="11"
      letterSpacing="0.4"
      fill="#003F7E"
    >
      MTN MoMo
    </text>
  </svg>
)

/**
 * AirtelTigo — Ghana joint mobile-money product (legacy Tigo / Airtel
 * combined). Brand: Airtel red.
 */
export const AirteltigoLogo = ({
  size,
  className,
  title = 'AirtelTigo',
}: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 24" aria-label={title}>
    <rect width="64" height="24" rx="3" fill="#ED1C24" />
    <text
      x="32"
      y="17"
      textAnchor="middle"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
      fontWeight="800"
      fontSize="10"
      letterSpacing="0.3"
      fill="#fff"
    >
      AirtelTigo
    </text>
  </svg>
)

/**
 * Vodafone Cash — Ghana mobile money. Brand: Vodafone red.
 */
export const VodafoneLogo = ({
  size,
  className,
  title = 'Vodafone Cash',
}: IconProps) => (
  <svg {...base(size, className)} viewBox="0 0 64 24" aria-label={title}>
    <rect width="64" height="24" rx="3" fill="#E60000" />
    <text
      x="32"
      y="17"
      textAnchor="middle"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
      fontWeight="800"
      fontSize="10"
      letterSpacing="0.3"
      fill="#fff"
    >
      Vodafone
    </text>
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
