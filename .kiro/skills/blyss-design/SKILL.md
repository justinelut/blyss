---
name: blyss-design
description: Blyss brand + design-system authority. ALWAYS load before drafting, reviewing, or restyling ANY Blyss marketplace UI. Encodes the exact palette (light-dominant burnt orange #C2410C), type system, UI patterns, anti-slop rules, and two authoritative user overrides (icons + dependencies). This skill OVERRIDES generic advice from frontend-design, hallmark, and ui-ux-pro-max wherever they conflict.
---

# Blyss design system (brand authority)

Blyss is a premium marketplace for **Kenyan creators** selling digital products and creator subscriptions. The reference is **editorial creator economy** (Are.na, Aimé Leon Dore, SSENSE, Bandcamp, Substack) — never a Shopify/Jumia/Etsy template.

Source of truth: `plan/04-ui-direction.md` (§3), `plan/16-do-not-do.md` (§15), `plan/17-references.md` (Visual Bible). Read them before large work. This skill is the always-on summary.

## ⚠️ Authoritative overrides (supersede plan/ docs where they conflict)

1. **ICONS — no Lucide.** The plan says "Lucide only"; that is OVERRIDDEN. On the marketplace surface, use only icon libraries **already installed** in the repo (e.g. `react-icons`, `@mui/icons-material` that the dashboard uses). **Add no new icon dependency.** Avoid `lucide-react` on marketplace pages. Never use emoji as icons.
2. **DEPENDENCIES — remove nothing.** Do NOT uninstall any npm package (MUI, Emotion, react-icons, Stripe, markdown-to-jsx, lucide-react, etc.). The dashboard/backend rely on them. Leave them even if unused on the marketplace surface. Restyle the marketplace surface only; do not touch what the dashboard imports.

## Palette — light is default and dominant (use exactly)

Dark mode is RESERVED for accent sections only: hero CTA accent block, homepage closing CTA band, post-purchase confirmation, creator earnings widget.

Light (default):
```
--background #FAFAF7  --surface #F1EFE9  --surface-elevated #FFFFFF
--surface-sunken #E8E5DD  --border #D9D5CB  --border-strong #BBB5A8
--text-primary #1A1A17  --text-secondary #4A4842  --text-muted #88857C
--accent #C2410C  --accent-hover #DD5818  --accent-foreground #FAFAF7
--success #15803D  --danger #B91C1C  --warning #B45309
```
Dark (accent sections only):
```
--background #0F0E0C  --surface #18171A  --surface-elevated #211F22
--border #2C2A28  --border-strong #3D3A35
--text-primary #F5F2EC  --text-secondary #BAB5A8  --text-muted #7A766B
--accent #F97316  --accent-hover #FFA052  --accent-foreground #0F0E0C
```

**Forbidden colors anywhere:** any blue, any green outside `--success`, any teal/cyan, any purple/violet/indigo, pure `#000000`, pure `#FFFFFF` (only `--surface-elevated`), any gradient (bg/button/overlay/image). No Tailwind `blue-* green-* teal-* purple-*` utilities. No Polar purple/blue. No Etsy orange.

## Typography — Inter Display + Inter only (no third typeface)

```
H1 hero    clamp(48px,6vw,88px)  lh 1.02  -0.025em  w600
H2 section clamp(32px,4vw,56px)  lh 1.05  -0.02em   w600
H3 sub     clamp(22px,2.5vw,32px) lh 1.15           w500
H4 card    18px lh1.3 w600
Lede 22px/1.45  Body 16px/1.6  Small 14px/1.5  Caption 13px/1.5 muted
Eyebrow: Inter 600, uppercase, 0.14em, 11px, --text-muted (or --accent on hero)
Prices/stats: font-variant-numeric: tabular-nums
```
Voice specimen: H1 "Make. Sell. Get paid." · eyebrow "DIGITAL PRODUCTS · NAIROBI" · lede "The modern marketplace for Kenyan creators… M-Pesa or card. Paid out within 24 hours."

## UI patterns

- **Spacing (8px base):** section rhythm 96px desktop / 56px mobile; card padding 24–32px; max width 1280px with 64px gutters; text max 64ch; use `gap` not sibling margins.
- **Borders not shadows:** prefer `--surface-sunken` tone-shift blocks for sectioning. `border:1px solid var(--border)` only when necessary. Shadows ONLY for dropdowns, modals, sticky cart bar on scroll, cart drawer — never cards, never hero overlays.
- **Buttons:** primary = filled `--accent`, radius 8px, padding 14px 28px, w500, no shadow. Secondary = transparent + 1px `--border-strong`, hover fills `--surface-sunken`. Ghost = text + underline on hover. Loading = `aria-busy`, spinner replaces text, width stable.
- **Inputs:** bg `--surface-sunken`, no default border, 1px bottom `--border-strong` on focus, radius 6px, **label always above** (never placeholder-as-label), error below in `--danger`, helper in `--text-muted` 13px.
- **Nav (sticky):** `--background` 90% opacity + `backdrop-filter blur(20px)`; wordmark left (Inter Display 600, 22px); center `Browse · Creators · Subscriptions · Help`; right search (command palette) + cart w/ count + avatar/Sign in + "Start selling" primary. Mobile = full-screen drawer.
- **Imagery:** real creator photos only (no stock business people). 4:5 product cards, 16:9 hero, 1:1 avatars/category. Hover overlay `rgba(26,26,23,0.04); mix-blend multiply`. Never alter human skin tones. Lazy-load below fold, priority LCP image.
- **Motion:** `motion` (motion.dev) only. Easing `cubic-bezier(0.32,0.72,0,1)`. Default 350ms, quick 200ms, hero ≤800ms, nothing >1200ms. `whileInView` reveals. Respect `prefers-reduced-motion` (short-circuit to instant). No scroll-jacking, no parallax, no cursor-follow.

## Anti-slop checklist — run before declaring any page done

No gradients · no section titled "Features/Services/Why us/Our benefits" · no emoji icons in features or CTAs · no drop-shadow cards · no `bg-white text-gray-500` defaults · no "Trusted by / As seen on" strips · no carousel auto-rotate <8s · no video autoplay w/ sound · no urgency framing · no animated counters · no "Premium/Pro/Featured" badge pills on cards · no 5-star rating displays (use `4.8 · 32 reviews`) · no grey-rectangle skeletons (use `--surface-sunken` subtle pulse) · no cartoon-mascot empty states · all headings on the type scale · all colors from the palette · **icons from already-installed libs, not Lucide, no new icon lib** · `prefers-reduced-motion` disables animation · tested at 375/768/1440. Targets: Lighthouse Perf ≥90, A11y ≥95, SEO ≥95, Best-Practices ≥95; zero axe violations on public routes.

## Stack conventions (frontend)

- Next.js 16 App Router; **server components by default** for marketplace pages, client islands only (no `'use client'` at marketplace page roots).
- shadcn/ui only · `motion` only · Tailwind v4 only · React Hook Form + Zod · TanStack Query (server state) · Zustand (cart/filters/currency).
- Every color/size/shadow comes from `clients/web/src/design/` tokens. No off-palette hex.
- Payments: Paystack only (cards + M-Pesa). M-Pesa-first CTA on product pages. KES prefix "KSh". Strip GitHub OAuth from auth; keep magic link + Google + Apple.
- Never ship "Polar" anywhere user-facing.

## Workflow per page

1. Read the relevant `plan/` section + Visual Bible tier.
2. Use `hallmark` to pick a macrostructure and `frontend-design` for craft; use `ui-ux-pro-max` (`python3 .kiro/skills/ui-ux-pro-max/scripts/search.py … --domain <style|landing|ux>`) for structure ideation ONLY — discard its color/icon output, apply the Blyss palette + installed icons.
3. Draft as server components with palette tokens + tabular-nums prices.
4. Screenshot via Playwright MCP; ask "Are.na/Aimé Leon Dore, or Shopify template?" Rebuild if the latter.
5. Run the anti-slop gate + axe.
