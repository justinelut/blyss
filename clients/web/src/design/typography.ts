/**
 * Blyss typography scale — plan/04-ui-direction.md §3.3
 *
 * Display: Newsreader (font-display). Refined editorial serif for headlines.
 * Body:    Inter (font-sans).
 *
 * Use these className constants instead of hand-rolling clamp() everywhere so
 * the type scale stays consistent across the app.
 */

export const typography = {
  // Display headlines — Inter Display
  h1: 'font-display font-semibold tracking-[-0.025em] leading-[1.02] text-[clamp(48px,6vw,88px)]',
  h2: 'font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[clamp(32px,4vw,56px)]',
  h3: 'font-display font-medium tracking-[-0.01em] leading-[1.15] text-[clamp(22px,2.5vw,32px)]',
  h4: 'font-display font-semibold leading-[1.3] text-[18px]',

  // Body — Inter
  lede: 'font-sans font-normal leading-[1.45] text-[22px]',
  body: 'font-sans font-normal leading-[1.6] text-[16px]',
  small: 'font-sans font-normal leading-[1.5] text-[14px]',
  caption: 'font-sans font-normal leading-[1.5] text-[13px] text-[var(--text-muted)]',

  // Eyebrow / label — Inter, all-caps
  eyebrow:
    'font-sans font-semibold uppercase tracking-[0.14em] text-[11px] text-[var(--text-muted)]',
  eyebrowAccent:
    'font-sans font-semibold uppercase tracking-[0.14em] text-[11px] text-[var(--accent)]',

  // Pull quote
  pullQuote: 'font-sans italic text-[28px] leading-[1.3]',

  // Numerals — tabular for prices + stats
  numeric: 'font-sans tabular-nums',
} as const

export type TypographyKey = keyof typeof typography
