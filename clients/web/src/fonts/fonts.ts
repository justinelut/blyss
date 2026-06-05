import localFont from 'next/font/local'
import { Newsreader } from 'next/font/google'

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
 * Newsreader — premium display serif for headlines (H1, H2, H3).
 *
 * Designed by Production Type for Google. Optical-size-aware editorial serif
 * with classical proportions and sharp detail at large sizes. Signals
 * "premium editorial publication" — the tension between a refined serif for
 * display and Inter for body is exactly what SSENSE, MR PORTER, and Cereal
 * Magazine use to read as high-end commerce, not template.
 *
 * Variable font; we load the specific weights used by the type scale (400–600).
 */
export const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--display',
})

/**
 * @deprecated Alias for migration — components importing `interDisplay` still
 * compile. Points to Newsreader which now owns the --display variable.
 */
export const interDisplay = newsreader

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
