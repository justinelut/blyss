'use client'

import * as React from 'react'

import { STOREFRONT_PALETTE } from '@/design/storefront-palette'
import {
  STOREFRONT_TOKENS_DEFAULTS,
  type StorefrontTokens,
} from '@/types/storefront-theme'

/**
 * StorefrontThemeProvider — wraps the body of /creators/[slug] so the
 * creator's chosen tokens override the global Blyss design tokens for
 * the storefront subtree only. Marketplace chrome (header, footer, cart
 * drawer, search modal, mobile nav) renders OUTSIDE this provider and
 * keeps the global Blyss tokens — so a buyer never loses orientation
 * navigating from one creator's storefront to another.
 *
 * Per plan §19.3.5 + §19.7.1.
 *
 * What gets overridden inside `[data-storefront-theme]`:
 *
 *   --accent              the creator's chosen accent (one of 8)
 *   --accent-hover        the paired hover shade
 *   --accent-foreground   always #FAFAF7 — every accent in the catalogue
 *                         takes the cream foreground
 *   --display             the creator's chosen headline font
 *   --storefront-leading  display_style → line-height
 *   --storefront-tracking display_style → letter-spacing
 *   --storefront-eyebrow-weight display_style → eyebrow text weight
 *   --storefront-motion-multiplier  motion → duration scalar (already
 *                                   honours prefers-reduced-motion)
 *
 * Components inside the wrapper that render with `bg-[var(--accent)]`,
 * `text-[var(--accent)]`, `font-display` (which resolves to `var(--display)`
 * via globals.css), etc. pick up the override automatically. No prop
 * drilling, no React context for the styling — pure CSS custom property
 * inheritance.
 *
 * Tokens that don't resolve to a known palette entry / known font fall
 * back silently to the v1 defaults (burnt-orange, space-grotesk,
 * editorial, standard). This protects against backend rows that pre-date
 * a token addition — the storefront still renders, just with the safe
 * default for any unknown token value.
 */

interface StorefrontThemeProviderProps {
  /** Tokens fetched from /v1/organizations/creators/{slug}. */
  tokens: StorefrontTokens | null | undefined
  children: React.ReactNode
  /** Optional className appended to the wrapper. The provider sets
   *  `data-storefront-theme` plus inline style; consumers can layer
   *  layout-level classes (e.g. background colour blocks) here without
   *  adding a wrapping <div>. */
  className?: string
}

/**
 * React context that mirrors the active tokens. Any descendant in the
 * React tree — even one rendered through a portal whose DOM lives
 * outside the provider's wrapper div — can read the tokens via
 * `useStorefrontTheme()` and re-establish the CSS-custom-property
 * cascade locally (e.g. the cart drawer is a Radix portal and needs
 * its own `<div data-storefront-theme>` to inherit the creator's
 * accent + font on the storefront subtree).
 */
const StorefrontThemeContext = React.createContext<
  StorefrontTokens | null
>(null)

/**
 * Read the active storefront tokens from React context. Returns null
 * when called outside a StorefrontThemeProvider — components should
 * gracefully fall back to the global Blyss tokens in that case.
 */
export const useStorefrontTheme = (): StorefrontTokens | null =>
  React.useContext(StorefrontThemeContext)

/**
 * Map a token's `headline_font` to the matching CSS variable name
 * exported by `clients/web/src/fonts/fonts.ts`. Space Grotesk has no
 * dedicated `--font-storefront-*` variable because it's already the
 * global `--display` — it falls through to the existing global token.
 */
const HEADLINE_FONT_VAR: Record<StorefrontTokens['headline_font'], string> = {
  'space-grotesk': 'var(--display)',
  'inter-display': 'var(--font-storefront-inter-display, var(--display))',
  'cormorant-garamond':
    'var(--font-storefront-cormorant, var(--display))',
  'inter-tight': 'var(--font-storefront-inter-tight, var(--display))',
}

/**
 * Display-style preset → typography rule overrides. See plan §19.3.3.
 *
 * Values picked to land inside the existing §3.3 type scale; the
 * scale itself is unchanged, the rule overrides only line-height +
 * tracking + eyebrow weight.
 */
const DISPLAY_STYLE_VARS: Record<
  StorefrontTokens['display_style'],
  Record<string, string>
> = {
  editorial: {
    '--storefront-leading': '1.05',
    '--storefront-tracking': '-0.02em',
    '--storefront-eyebrow-weight': '600',
  },
  minimal: {
    '--storefront-leading': '1.10',
    '--storefront-tracking': '-0.01em',
    '--storefront-eyebrow-weight': '500',
  },
  bold: {
    '--storefront-leading': '0.95',
    '--storefront-tracking': '-0.03em',
    '--storefront-eyebrow-weight': '600',
  },
}

/**
 * Motion intensity multiplier. Existing motion config consumes
 * `--storefront-motion-multiplier` and scales durations by it. The
 * `prefers-reduced-motion: reduce` media query inside globals.css
 * always overrides to zero regardless of token (Lighthouse a11y +
 * §19.3.4). Expressive caps at 1.2 so motion duration never exceeds
 * the §3.4 1200ms hard ceiling.
 */
const MOTION_MULTIPLIER: Record<StorefrontTokens['motion'], string> = {
  subtle: '0.5',
  standard: '1',
  expressive: '1.2',
}

/** Fallback to v1 defaults when a stored value doesn't match the
 *  curated catalogues (e.g. a removed accent or an unknown font). */
const safeAccent = (
  name: StorefrontTokens['accent'] | undefined,
): keyof typeof STOREFRONT_PALETTE =>
  name && name in STOREFRONT_PALETTE
    ? name
    : (STOREFRONT_TOKENS_DEFAULTS.accent as keyof typeof STOREFRONT_PALETTE)

const safeFont = (
  name: StorefrontTokens['headline_font'] | undefined,
): StorefrontTokens['headline_font'] =>
  name && name in HEADLINE_FONT_VAR
    ? name
    : STOREFRONT_TOKENS_DEFAULTS.headline_font

const safeDisplay = (
  name: StorefrontTokens['display_style'] | undefined,
): StorefrontTokens['display_style'] =>
  name && name in DISPLAY_STYLE_VARS
    ? name
    : STOREFRONT_TOKENS_DEFAULTS.display_style

const safeMotion = (
  name: StorefrontTokens['motion'] | undefined,
): StorefrontTokens['motion'] =>
  name && name in MOTION_MULTIPLIER ? name : STOREFRONT_TOKENS_DEFAULTS.motion

export const StorefrontThemeProvider: React.FC<
  StorefrontThemeProviderProps
> = ({ tokens, children, className }) => {
  const safe = React.useMemo<StorefrontTokens>(() => {
    return {
      accent: safeAccent(tokens?.accent),
      accent_secondary: tokens?.accent_secondary,
      headline_font: safeFont(tokens?.headline_font),
      display_style: safeDisplay(tokens?.display_style),
      motion: safeMotion(tokens?.motion),
    }
  }, [tokens])

  const accent = STOREFRONT_PALETTE[safe.accent]
  const cssVars = React.useMemo<React.CSSProperties>(() => {
    const vars: Record<string, string> = {
      '--accent': accent.value,
      '--accent-hover': accent.hover,
      '--accent-foreground': accent.foreground,
      '--display': HEADLINE_FONT_VAR[safe.headline_font],
      '--storefront-motion-multiplier': MOTION_MULTIPLIER[safe.motion],
      ...DISPLAY_STYLE_VARS[safe.display_style],
    }
    // React's typing for `style` rejects custom CSS properties; cast
    // through CSSProperties to opt out of the index-signature check.
    return vars as React.CSSProperties
  }, [accent, safe.headline_font, safe.display_style, safe.motion])

  return (
    <StorefrontThemeContext.Provider value={safe}>
      <div
        data-storefront-theme={safe.accent}
        data-storefront-display={safe.display_style}
        data-storefront-motion={safe.motion}
        className={className}
        style={cssVars}
      >
        {children}
      </div>
    </StorefrontThemeContext.Provider>
  )
}
