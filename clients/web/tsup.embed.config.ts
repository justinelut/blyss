import { defineConfig } from 'tsup'

/**
 * Build the standalone embed script that creators paste into their
 * own websites via:
 *
 *   <script src="https://blyss.co.ke/checkout/embed.global.js" defer
 *           data-auto-init></script>
 *
 * Output is dropped into `public/checkout/embed.global.js` so Next.js
 * serves it as a regular static asset (cache-friendly, CDN-friendly,
 * no SSR cost).
 *
 * The embed.ts source references __POLAR_CHECKOUT_EMBED_SCRIPT_ALLOWED_ORIGINS__
 * as a build-time constant. We substitute it here with the comma-
 * separated list of origins the embed script should accept postMessage
 * events from. Override per-environment via env vars at build time:
 *
 *   POLAR_CHECKOUT_EMBED_SCRIPT_ALLOWED_ORIGINS — comma-separated origin list
 *
 * Default covers the Blyss production hosts (apex + buy + my subdomains)
 * and the local dev port so the embed works in both contexts without
 * manual configuration.
 */
const defaultOrigins = [
  'https://blyss.co.ke',
  'https://buy.blyss.co.ke',
  'https://my.blyss.co.ke',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].join(',')

const allowedOrigins =
  process.env.POLAR_CHECKOUT_EMBED_SCRIPT_ALLOWED_ORIGINS || defaultOrigins

export default defineConfig({
  entry: { embed: 'src/components/Checkout/embed.ts' },
  outDir: 'public/checkout',
  format: ['iife'],
  globalName: 'PolarEmbedCheckout',
  // Single-file IIFE — no chunking, no .mjs sibling. Browsers load
  // it via a plain <script src>.
  splitting: false,
  // No sourcemap on the public artifact — keeps the file small for the
  // CDN and stops curious people from reading the bundled internals.
  sourcemap: false,
  minify: true,
  clean: false,
  // Inline the constant the source references. tsup forwards `define`
  // straight to esbuild — values must be JSON-serialisable.
  define: {
    __POLAR_CHECKOUT_EMBED_SCRIPT_ALLOWED_ORIGINS__:
      JSON.stringify(allowedOrigins),
  },
  // Target the same browser baseline the rest of the Blyss app does —
  // last 2 versions of evergreen browsers + Safari 14 (iOS 14 floor).
  target: ['es2020'],
  // No-op the TS declaration generation; this is shipped JS only.
  dts: false,
})
