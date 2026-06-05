import { cn } from '@/lib/utils'

interface LogoIconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * LogoIcon — square Blyss glyph mark.
 *
 * A refined geometric "B" monogram on a charcoal tile: uniform stroke
 * weight, proper optical counters, and the orange accent dot placed
 * inside the upper bowl as an integrated brand signature. Mirrors the
 * SVG in `src/app/icon.svg` and `src/app/apple-icon.svg` exactly.
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
      <rect width="64" height="64" rx="16" fill="#0F0E0C" />
      <path
        d="M19 12 L19 52 L34 52 C42.8 52 48 46.2 48 40 C48 34.4 43.6 30 38 29.4 C42.4 28.2 45 24.4 45 20.5 C45 15.2 40.6 12 35 12 Z M26 18.5 L34 18.5 C37.6 18.5 39.5 20.6 39.5 23 C39.5 25.4 37.6 27.5 34 27.5 L26 27.5 Z M26 33.5 L35 33.5 C39.8 33.5 42 36.2 42 39.5 C42 42.8 39.8 45.5 35 45.5 L26 45.5 Z"
        fill="#F5F0E8"
        fillRule="evenodd"
      />
      <circle cx="33" cy="23" r="2.5" fill="#F97316" />
    </svg>
  )
}

export { LogoIcon }
