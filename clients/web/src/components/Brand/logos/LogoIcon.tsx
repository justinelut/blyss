import { cn } from '@/lib/utils'

interface LogoIconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * LogoIcon — square Blyss glyph (the "B" mark on a near-black tile).
 *
 * Used on the verify-email screen, login-code verify screen, onboarding header,
 * and any context where we need a square brand mark instead of the wordmark.
 *
 * The previous implementation was a placeholder that rendered a giant orange
 * circle — confusing in onboarding/verify flows. This is the proper mark
 * matching public/blyss-mark.svg.
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
      <text
        x="50%"
        y="56%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Inter Display', 'Inter', system-ui, sans-serif"
        fontSize="42"
        fontWeight="800"
        letterSpacing="-1"
        fill="#F97316"
      >
        B
      </text>
      <circle cx="46" cy="50" r="2.5" fill="#FAFAF7" />
    </svg>
  )
}

export { LogoIcon }
