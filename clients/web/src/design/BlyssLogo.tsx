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
  /** Hide the orange signature dot under the "y" — useful for monochrome footers */
  hideAccent?: boolean
}

const sizeClasses: Record<NonNullable<BlyssLogoProps['size']>, string> = {
  sm: 'text-base',         // 16px — footer, dashboard sidebar
  md: 'text-lg',           // 18px — default
  lg: 'text-[22px]',      // 22px — main nav (matches spec)
  xl: 'text-4xl md:text-5xl', // 36-48px — hero / 404 pages
}

const dotPosition: Record<NonNullable<BlyssLogoProps['size']>, string> = {
  sm: 'h-[3px] w-[3px] -bottom-[3px] left-[54%]',
  md: 'h-[3.5px] w-[3.5px] -bottom-[3px] left-[54%]',
  lg: 'h-[4px] w-[4px] -bottom-[4px] left-[54%]',
  xl: 'h-[6px] w-[6px] -bottom-[5px] left-[54%] md:h-[7px] md:w-[7px]',
}

/**
 * BlyssLogo — the canonical wordmark.
 *
 * "Blyss" in Inter Display 700 with a small orange dot under the "y"
 * descender as the brand signature. The dot is the only chromatic moment
 * in the wordmark — everything else inherits from the surrounding text
 * color via `currentColor`, so the logo flips correctly on light surfaces
 * (warn: light surfaces are deprecated in v1) and dark surfaces alike.
 *
 *   <BlyssLogo size="lg" />                          // nav
 *   <BlyssLogo size="xl" className="text-white" />   // hero on dark
 *   <BlyssLogo size="sm" asPlainText />              // inside another link
 *   <BlyssLogo size="sm" hideAccent />               // monochrome footer
 */
export const BlyssLogo = ({
  href = '/',
  size = 'md',
  className,
  asPlainText,
  hideAccent,
}: BlyssLogoProps) => {
  const wordmark = (
    <span className="relative inline-block">
      <span
        className={cn(
          'font-display font-bold tracking-[-0.03em] leading-none select-none',
          sizeClasses[size],
          className,
        )}
      >
        Blyss
      </span>
      {!hideAccent && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute rounded-full bg-[var(--accent)]',
            dotPosition[size],
          )}
        />
      )}
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
