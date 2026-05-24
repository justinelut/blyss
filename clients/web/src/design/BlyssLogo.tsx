import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BlyssLogoProps {
  /** Wrap in a Next.js Link — defaults to the marketplace home */
  href?: string
  /** Wordmark size — `lg` for nav, `xl` for hero, `sm` for footer/dashboard */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Override color via Tailwind class (e.g. text-white for dark sections) */
  className?: string
  /** Skip the link wrapper (e.g. when used inside another anchor) */
  asPlainText?: boolean
}

const sizeClasses: Record<NonNullable<BlyssLogoProps['size']>, string> = {
  sm: 'text-base',         // 16px — footer, dashboard sidebar
  md: 'text-lg',           // 18px — default
  lg: 'text-2xl',          // 24px — main nav
  xl: 'text-4xl md:text-5xl', // 36-48px — hero / 404 pages
}

/**
 * BlyssLogo — the canonical wordmark.
 *
 * Wordmark only for v1 (no glyph). Renders "Blyss" in Inter Display 600 with
 * tight tracking. Replace this component when a custom logo asset ships in
 * v1.1; until then, every surface uses this component instead of inlining
 * the string.
 *
 *   <BlyssLogo size="lg" />                    // nav
 *   <BlyssLogo size="xl" className="text-white" /> // hero on dark
 *   <BlyssLogo size="sm" asPlainText />        // inside another link
 */
export const BlyssLogo = ({
  href = '/',
  size = 'md',
  className,
  asPlainText,
}: BlyssLogoProps) => {
  const wordmark = (
    <span
      className={cn(
        'font-display font-semibold tracking-[-0.02em] leading-none select-none',
        sizeClasses[size],
        className,
      )}
    >
      Blyss
    </span>
  )

  if (asPlainText) return wordmark

  return (
    <Link
      href={href}
      aria-label="Blyss — go to homepage"
      className="inline-flex items-center"
    >
      {wordmark}
    </Link>
  )
}
