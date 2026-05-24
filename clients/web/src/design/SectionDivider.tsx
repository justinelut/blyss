import { cn } from '@/lib/utils'

interface SectionDividerProps {
  /**
   * Surface tone of the section. Sets the background. Per plan §3.4 we use
   * background tone shifts (NOT shadows or borders) to break sections.
   */
  tone?: 'default' | 'sunken' | 'elevated' | 'dark'
  /** Vertical padding profile. Per plan §3.4: 96px desktop / 56px mobile. */
  density?: 'sm' | 'md' | 'lg' | 'xl'
  /** Stretch the inner block to full viewport width (skip the max-width container) */
  fullBleed?: boolean
  className?: string
  children: React.ReactNode
}

const toneStyles: Record<NonNullable<SectionDividerProps['tone']>, string> = {
  default: 'bg-[var(--background)] text-[var(--text-primary)]',
  sunken: 'bg-[var(--surface)] text-[var(--text-primary)]',
  elevated: 'bg-[var(--surface-elevated)] text-[var(--text-primary)]',
  dark: 'bg-[#0F0E0C] text-[#F5F2EC]',
}

const densityStyles: Record<NonNullable<SectionDividerProps['density']>, string> = {
  sm: 'py-12 md:py-16',
  md: 'py-14 md:py-20',
  lg: 'py-16 md:py-24', // ≈ 96px desktop
  xl: 'py-20 md:py-32',
}

/**
 * SectionDivider — the canonical way to break sections on a Blyss page.
 *
 * Use background tone shifts to separate sections, NEVER horizontal rules,
 * NEVER drop shadows. Wrapping `<section>` or `<div>` blocks in
 * `<SectionDivider tone="...">` produces the right visual rhythm.
 *
 *   <SectionDivider tone="default" density="lg">
 *     <Eyebrow>What's selling</Eyebrow>
 *     <h2>...</h2>
 *   </SectionDivider>
 */
export const SectionDivider = ({
  tone = 'default',
  density = 'lg',
  fullBleed = false,
  className,
  children,
}: SectionDividerProps) => {
  return (
    <section className={cn(toneStyles[tone], densityStyles[density], className)}>
      {fullBleed ? (
        children
      ) : (
        <div className="mx-auto max-w-[1280px] px-6 md:px-16">{children}</div>
      )}
    </section>
  )
}
