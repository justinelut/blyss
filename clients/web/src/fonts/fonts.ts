import localFont from 'next/font/local'
import { Space_Grotesk } from 'next/font/google'

/**
 * Inter — body typeface.
 * Per plan §3.3: weights 400/500/600 are the production set. 300 kept for
 * one-off use cases. `display: swap` so text renders immediately and swaps
 * when the font loads.
 */
export const inter = localFont({
  src: [
    { path: './Inter-Light.woff2', weight: '300' },
    { path: './Inter-Regular.woff2', weight: '400' },
    { path: './Inter-Medium.woff2', weight: '500' },
    { path: './Inter-SemiBold.woff2', weight: '600' },
  ],
  display: 'swap',
  variable: '--sans',
})

/**
 * Space Grotesk — display grotesk for headlines (H1, H2, H3, H4).
 *
 * Designed by Florian Karsten. A characterful geometric grotesk with
 * squared counters and distinctive letterforms that signal "modern digital
 * products / tech / creator tools" — the typographic register of Linear,
 * Gumroad, and Fontshare. Pairs naturally with Inter (shared geometric DNA,
 * distinct personality at display sizes).
 *
 * Replaces Newsreader: the editorial serif read as "literary magazine" rather
 * than "buy this Figma template / beat pack / Notion kit."
 *
 * Loaded via next/font/google for reproducibility (no binary asset management).
 */
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--display',
})

/**
 * @deprecated Alias for migration — components importing `newsreader` still
 * compile. Points to Space Grotesk which now owns the --display variable.
 */
export const newsreader = spaceGrotesk

/**
 * @deprecated Alias for migration — components importing `interDisplay` still
 * compile. Points to Space Grotesk which now owns the --display variable.
 */
export const interDisplay = spaceGrotesk

/**
 * Louize — Polar's old display serif, retained as `--louize` for any legacy
 * components still referencing it. Phase 5 component rebuilds remove these
 * usages; the file can then be deleted along with the .otf asset.
 *
 * @deprecated remove when the last `font-louize` reference is gone.
 */
export const louize = localFont({
  src: './Louize-Italic-205TF.otf',
  variable: '--louize',
  display: 'swap',
})
