import localFont from 'next/font/local'

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
 * Inter Display — display typeface for headlines (H1, H2, H3).
 * Same family, optical-size variant tuned for large sizes.
 */
export const interDisplay = localFont({
  src: [
    { path: './InterDisplay-Light.woff2', weight: '300' },
    { path: './InterDisplay-Regular.woff2', weight: '400' },
    { path: './InterDisplay-Medium.woff2', weight: '500' },
    { path: './InterDisplay-SemiBold.woff2', weight: '600' },
  ],
  display: 'swap',
  variable: '--display',
})

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
