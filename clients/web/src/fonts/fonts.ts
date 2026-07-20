import localFont from "next/font/local";
import {
  Cormorant_Garamond,
  Geist_Mono,
  Inter,
  Inter_Tight,
  Space_Grotesk,
} from "next/font/google";

/**
 * Inter — variable body typeface. Next self-hosts the Latin subset, preserving
 * the 400/500/600 production weights without preloading three full binaries.
 */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--sans",
});

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
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
  variable: "--display",
});

/**
 * @deprecated Alias for migration — components importing `newsreader` still
 * compile. Points to Space Grotesk which now owns the --display variable.
 */
export const newsreader = spaceGrotesk;

/** Dashboard/code font. Keep its variable global, but fetch it only where
 * monospace text is actually rendered instead of on every marketplace page. */
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-geist-mono",
});

/**
 * @deprecated Alias for migration — components importing `interDisplay` still
 * compile. Points to Space Grotesk which now owns the --display variable.
 */
export const interDisplay = spaceGrotesk;

/**
 * Louize — Polar's old display serif, retained as `--louize` for any legacy
 * components still referencing it. Phase 5 component rebuilds remove these
 * usages; the file can then be deleted along with the .otf asset.
 *
 * @deprecated remove when the last `font-louize` reference is gone.
 */
export const louize = localFont({
  src: "./Louize-Italic-205TF.otf",
  variable: "--louize",
  display: "swap",
  preload: false,
});

/**
 * Storefront theme display fonts (plan §19.3.3).
 *
 * These optional families share this registry for the storefront editor, so
 * they are not tree-shaken from root routes. Keep preload disabled: a browser
 * fetches the selected face when a themed storefront actually uses it instead
 * of downloading every creator option on every marketplace page.
 */

/** Inter Display — Blyss original headline display. Editorial precision. */
export const interDisplayFont = localFont({
  src: [
    { path: "./InterDisplay-Medium.woff2", weight: "500" },
    { path: "./InterDisplay-SemiBold.woff2", weight: "600" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-storefront-inter-display",
  fallback: ["Inter", "system-ui", "sans-serif"],
});

/** Cormorant Garamond — italic-friendly transitional serif.
 *  Editorial / boutique register; complements bio-led storefronts. */
export const cormorantGaramondFont = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-storefront-cormorant",
});

/** Inter Tight — condensed grotesque. Dense product walls; works
 *  well for catalogue layouts with many SKUs. */
export const interTightFont = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-storefront-inter-tight",
});

/**
 * Combined CSS-variable className list for any layout that mounts the
 * StorefrontThemeProvider. Setting all four font variables on the same
 * subtree means the provider can swap between them via
 * `--storefront-display: var(--font-storefront-cormorant)` without
 * having to reload anything.
 *
 * Space Grotesk is intentionally NOT in this list — it already ships
 * globally as `--display` from the root layout, so storefront
 * components can fall through to it when the picked font is
 * `space-grotesk`.
 */
export const storefrontFontVariables = [
  interDisplayFont.variable,
  cormorantGaramondFont.variable,
  interTightFont.variable,
].join(" ");
