import { cn } from '@/lib/utils'

interface LogoIconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * LogoIcon — square Blyss glyph.
 *
 * The mark is a geometric "B" — vertical stem plus two filled
 * semicircle lobes plus the brand's orange signature dot — drawn from
 * SVG paths so it renders the same crispness at every size and DPR.
 * Pair with `<BlyssLogo />` (the wordmark) for the full lockup.
 *
 * Used on the verify-email screen, login-code verify screen, onboarding
 * header, and any context where we need a square brand mark instead of
 * the wordmark. Mirrors `src/app/icon.svg` and `src/app/apple-icon.svg`
 * so the in-app mark and the favicon are visually identical.
 */
export default function LogoIcon({ size = 32, className, style }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      style={style}
      role="img"
      aria-label="Blyss"
    >
      <rect width="64" height="64" rx="14" fill="#0F0E0C" />
      <g fill="#F5F0E8">
        <rect x="14" y="10" width="9" height="44" rx="0.5" />
        <path d="M23 10 H37 A12 12 0 0 1 37 34 H23 Z" />
        <path d="M23 30 H39 A13 13 0 0 1 39 56 H23 Z" />
      </g>
      <circle cx="51" cy="50" r="3" fill="#F97316" />
    </svg>
  )
}

export { LogoIcon }
