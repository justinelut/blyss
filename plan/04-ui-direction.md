## §3 UI Direction — non-negotiable

Blyss must signal "Kenyan craft, internet-grade polish." Not a Shopify theme. Not a Bootstrap admin. Not Etsy-busy. Not Jumia-clutter. Below is the exact palette, type system, and pattern guidance.

### §3.1 Reference websites (study before drafting any UI)

The downstream AI agent must visit each of these and screenshot the hero + one inner page before laying out Blyss.

**Tier 1 — primary aesthetic anchors (the visual ceiling)**

The bar. Copy the discipline; copy nothing literally.

- https://www.are.na — editorial confidence, type-driven, no decoration. The single best peer for Blyss's brand voice.
- https://aimeleondore.com — premium product gallery, gallery-grade typography, masterful photography treatment.
- https://www.ssense.com — filtering and search UX done at world-class level. Study the filter sidebar pattern.
- https://shop.highsnobiety.com — editorial commerce hybrid, content density without clutter.
- https://www.mrporter.com — content + commerce, the standard for editorial product pages.
- https://www.dovermarket.com — minimalist gallery commerce. Restraint master class.
- https://stripe.com — not commerce but the visual standard for fintech UI density.
- https://linear.app — type system, motion tone, restraint. The cleanest application UI on the internet.
- https://casadisolare.com — Awwwards Site of the Month with a 9.30 score. Reference for hero + product treatment.
- https://airscream.com — Awwwards Site of the Month for ecommerce, 8.80 score.

**Tier 2 — creator-economy peers (study, outclass)**

These are direct competitors or adjacent platforms. Blyss must visibly out-design every one.

- https://substack.com — best subscription tier UX in the world. Study the publication landing pages.
- https://patreon.com — proven creator monetization UX. Anti-reference for visual style (too busy), reference for tier IA.
- https://gumroad.com — direct competitor. Friendly but cluttered. We go cleaner, more confident, more editorial.
- https://lemonsqueezy.com — Polar's competitor. Cleaner public surface than Polar but generic. We go more distinctive.
- https://passes.com — newer Patreon competitor (90% creator payout, paid DMs, livestreams). Modern creator-economy IA.
- https://www.bandcamp.com — creator-first marketplace. Study how individual artist pages SING. The closest creator-page peer.
- https://beacons.ai — link-in-bio surface, modern creator presentation.
- https://buymeacoffee.com — anti-reference. Too cute, too playful. Blyss is craft, not childish.
- https://itch.io — anti-reference visually (chaotic), reference for creator-first IA (their dashboard nav is excellent).

**Tier 3 — Kenyan/African context**

Anchor in the user's local expectations. Karen / Westlands / Lavington / Kilimani buyers recognize these.

- https://www.adeledejak.com — Kenyan luxury accessories, premium African brand. Strong local reference.
- https://www.vivowoman.com — Kenyan e-commerce reference (Vivo Activewear). Mainstream local benchmark.
- https://www.lapaire.com — Kenyan e-commerce, modern, payment-method-aware.
- https://www.untitledafrica.com — African editorial commerce.

**Tier 4 — typographic peers (when headlines feel templated, return here)**

- https://www.cerealmag.com — editorial typography bible.
- https://www.dezeen.com — design content density.
- https://www.itsnicethat.com — creative editorial.
- https://www.t-magazine.com — NYT T Magazine editorial spreads.

**Tier 5 — design libraries (for pattern lookup, not visual style)**

- https://baymard.com/ecommerce-design-examples — 18,000+ ecommerce design examples organized across 68 page types. Use this when you need "how does a world-class site handle out-of-stock states / variant selectors / cart drawers / etc."
- https://ui.shadcn.com — component reference, install via shadcn MCP (see Appendix B).

**Tier 6 — ANTI-references (study, copy nothing)**

These exemplify what generic e-commerce / marketplace sites look like. Blyss must outclass them on every dimension.

- https://www.jumia.co.ke — Kenyan marketplace, busy, badge-heavy, low-trust visual language. The local anti-reference.
- https://www.kilimall.co.ke — Kenyan marketplace, generic Bootstrap commerce.
- https://www.aliexpress.com — busy, overwhelming, low-trust.
- https://www.etsy.com — outdated, packed with shouts and stars and badges, looks like 2016.
- Generic Shopify "marketplace" templates — search "shopify marketplace theme" for examples to avoid.
- Generic Wix/Squarespace e-commerce templates — they all look the same.
- Bootstrap-themed marketplaces with hover-zoom on every image and "Featured Products" carousels.
- Any site with an animated counter ("1,500+ creators") or trust badges ("As seen on") or a "5 ★★★★★ from 12,000 happy customers" social-proof bar.

**The discipline:** before drafting any new section, the AI agent asks: *"Does this look like it could exist on Are.na or Aimé Leon Dore? Or does it look like a Shopify template?"* If the latter, scrap and rebuild.

### §3.2 The Blyss palette (use exactly)

Two modes. **Light is default and dominant.** Dark is reserved for: the hero CTA accent block, the closing CTA band on the homepage, post-purchase confirmation screen, and the creator earnings widget on the dashboard.

**Light mode (default)**

```
--background:        #FAFAF7   /* warm off-white, paper not snow */
--surface:           #F1EFE9   /* aged paper, used for section breaks */
--surface-elevated:  #FFFFFF   /* product cards, modals, dropdowns */
--surface-sunken:    #E8E5DD   /* input backgrounds, code blocks, hover */
--border:            #D9D5CB   /* hairline; used sparingly */
--border-strong:     #BBB5A8   /* focused inputs, active filter chips */
--text-primary:      #1A1A17   /* warm near-black; never #000000 */
--text-secondary:    #4A4842   /* body */
--text-muted:        #88857C   /* metadata, captions, eyebrows */
--accent:            #C2410C   /* burnt orange — Blyss signature */
--accent-hover:      #DD5818
--accent-foreground: #FAFAF7   /* on the accent */
--success:           #15803D   /* used sparingly for confirmation */
--danger:            #B91C1C   /* errors, destructive actions */
--warning:           #B45309   /* warnings, low stock */
```

**Dark mode (accent sections only)**

```
--background:        #0F0E0C
--surface:           #18171A
--surface-elevated:  #211F22
--border:            #2C2A28
--border-strong:     #3D3A35
--text-primary:      #F5F2EC
--text-secondary:    #BAB5A8
--text-muted:        #7A766B
--accent:            #F97316   /* brighter orange for dark */
--accent-hover:      #FFA052
--accent-foreground: #0F0E0C
```

**Why burnt orange `#C2410C`:** It's the strongest brand differentiator we can pick. It echoes Kenyan craft (sunset, copper, leather, terracotta) without being a tourist cliché. It's far enough from Polar's existing terracotta `#a73400` to feel like a clear redesign. It pairs with neutral warm whites for editorial calm. It is **not** Etsy orange (more red), **not** Jumia orange (more saturated), **not** Hermès orange (more saturated).

**Forbidden colors anywhere on the site:**

- Any blue (no `#3B82F6`, no Bootstrap navy, no teal, no cyan, no Tailwind `blue-*` utility)
- Any green outside `--success` (no Spotify green, no WhatsApp green, no `green-*` utilities)
- Any purple (no `purple-*`, no `violet-*`, no `indigo-*`)
- Pure black `#000000`
- Pure white `#FFFFFF` (only `--surface-elevated` is allowed white)
- Any gradient (no `bg-gradient-to-*`, no radial gradients, no overlay gradients on hero images)

**Forbidden patterns:**

- Drop-shadow cards (`shadow-md`, `shadow-lg`, etc.) for sectioning. Shadows are reserved for: dropdowns, modals, sticky bars on scroll, the cart drawer.
- Border-on-everything. Use background tone shifts (`--surface-sunken` block sitting in `--background` page) instead of dividing lines.
- Three-column emoji feature grids
- Section titles named "Features" / "Services" / "Why choose us" / "Our benefits" — use evocative names ("What's selling", "Hand-picked", "From the studio", "Make. Sell. Get paid.")
- Stock photography of generic men in suits, generic groups laughing at laptops
- "5 ★★★★★ from 12,000+ happy customers" social proof bars
- Trust-badge strips ("Verified", "Trusted by", "As seen on", "Powered by")
- Placeholder-as-label form inputs
- Carousel auto-rotation under 8 seconds
- Animated number counters ("1500+ creators")
- Hard-edged neon CTAs
- Cartoon mascot illustrations on empty states
- Rounded-pill "Featured" / "Premium" / "Pro" badge overlays on product cards

### §3.3 Typography

**Display (headlines): Inter Display** (already self-hosted at `clients/web/src/fonts/InterDisplay-*.woff2`)

Pair with italic for keyword emphasis. We do not introduce a third typeface. Inter Display + Inter is the system. No Söhne, no Cormorant, no serif.

```
H1 hero:       clamp(48px, 6vw, 88px), line-height: 1.02, letter-spacing: -0.025em, weight 600
H2 section:    clamp(32px, 4vw, 56px), line-height: 1.05, letter-spacing: -0.02em, weight 600
H3 sub:        clamp(22px, 2.5vw, 32px), line-height: 1.15, weight 500
H4 card:       18px, line-height: 1.3, weight 600
```

**Body: Inter** (already self-hosted)

```
Lede:          22px, line-height: 1.45, weight 400
Standard:      16px, line-height: 1.6, weight 400
Small:         14px, line-height: 1.5, weight 400
Caption:       13px, line-height: 1.5, weight 400, color: --text-muted
```

**Eyebrows / labels (Inter, weight 600, all-caps)**

```
text-transform: uppercase
letter-spacing: 0.14em
font-size: 11px
color: --text-muted (or --accent on heroes for the branded eyebrow)
```

**Pull quotes:** Inter italic 28px, hung indent.

**Numerals (prices, stats, metrics):** Inter with `font-variant-numeric: tabular-nums` — prices align across rows in the cart and grids.

**Specimen for the brand voice:**

- Hero headline: "Make. Sell. Get paid."
- Hero eyebrow: "DIGITAL PRODUCTS · NAIROBI"
- Hero lede: "The modern marketplace for Kenyan creators. Templates, ebooks, beats, presets, courses, subscription tiers. M-Pesa or card. Paid out within 24 hours."

### §3.4 UI patterns

**Spacing scale (8px base)**

- Section vertical rhythm: 96px desktop / 56px mobile (luxury reads slow)
- Card padding: 24px minimum, 32px preferred
- Max content width: 1280px with 64px gutters
- Text columns max: 64ch
- Consistent use of `gap` not `margin` for siblings

**Borders not shadows**

- `border: 1px solid var(--border)` only when absolutely necessary
- Prefer background tone shifts: a `--surface-sunken` block sitting in a `--background` page IS the section break. No HR, no shadow.
- Shadows allowed only for: dropdowns, modals, sticky cart bar on scroll. Never for cards, never for hero overlays.

**Buttons**

- Primary: filled `--accent`, `border-radius: 8px`, padding `14px 28px`, weight 500, no shadow.
- Secondary: transparent with 1px `--border-strong`, hover fills `--surface-sunken`.
- Ghost: text only with underline on hover.
- Destructive: `--danger` text on transparent background, hover fills `--danger` at 8% opacity.
- Icon button: 40×40, transparent, hover `--surface-sunken` at 50% opacity.
- Loading state: `aria-busy="true"`, spinner replaces text, button stays the same width.

**Inputs**

- Background `--surface-sunken`
- No border by default
- 1px bottom border `--border-strong` only on focus
- Border-radius 6px
- Label always above the input. Never placeholder-as-label.
- Validation error appears below in `--danger`, never as a tooltip.
- Helper text in `--text-muted` 13px below the label.

**Navigation (sticky, top)**

- Sticky on scroll with `--background` at 90% opacity + `backdrop-filter: blur(20px)`
- Logo wordmark left ("Blyss" — wordmark in Inter Display 600, 22px; we ship with a wordmark, add a glyph mark in v1.1)
- Center nav: `Browse · Creators · Subscriptions · Help`
- Right: search icon (opens command palette), cart icon with count, avatar dropdown (logged in) or `Sign in` link + `Start selling` primary button (logged out)
- Mobile: hamburger drawer, full-screen takeover, large tappable links

**Imagery**

- Real product photos uploaded by creators. Blyss does not commission stock.
- Aspect ratios: **4:5** for product cards (editorial-tall), **16:9** for hero imagery, **1:1** for avatars and category tiles.
- Subtle warm overlay on hover: `background: rgba(26, 26, 23, 0.04); mix-blend-mode: multiply` — harmonizes mismatched creator photography to the palette without altering skin tones.
- **Never apply hue/saturation filters that change human skin tones.**
- Lazy load below the fold, priority on the LCP image.

**Motion**

- One library, **`motion`** (motion.dev). Use `motion/react` for component animations and `motion` for vanilla scroll APIs.
- Component-level: enter, exit, drag, reorder, modal/drawer transitions via `<motion.div>` and `<AnimatePresence>`.
- Orchestrated sequences (homepage hero, creator storefront cinematic intro, featured product reveal): `useScroll` and `scroll()` — these run on the browser's native `ScrollTimeline` where supported, hardware-accelerated.
- Scroll-triggered reveals: `whileInView` with viewport options. Motion uses a pooled `IntersectionObserver` so 50 reveal targets cost the same as 1.
- All easings: `cubic-bezier(0.32, 0.72, 0, 1)` — smooth, not bouncy. Use `ease: [0.32, 0.72, 0, 1]` everywhere.
- Default duration 350ms; quick interactions 200ms; hero sequences up to 800ms; nothing over 1200ms.
- **Respect `prefers-reduced-motion`** — wrap motion config in `useReducedMotion()` and short-circuit to instant transitions for users who set the OS preference. Test this. Lighthouse accessibility will fail without it.
- No scroll-jacking. No body parallax. No mouse-follow effects on the cursor. Restraint.

### §3.5 Anti-pattern checklist (run before shipping every page)

Before declaring a page done, the AI agent verifies:

- [ ] No gradients (background, button, hero overlay, image filter)
- [ ] No section title literally "Features" or "Services" or "Why us" or "Our benefits"
- [ ] No emoji icons in feature lists or CTAs
- [ ] No drop-shadow cards (`shadow-md` or heavier)
- [ ] No `bg-white` `text-gray-500` Tailwind defaults
- [ ] No "Trusted by 50+ companies" / "As seen on" trust strips
- [ ] No carousel auto-rotation faster than 8s
- [ ] No video autoplay with sound
- [ ] No "Get a quote in 60 seconds" / "Limited time" urgency framing
- [ ] No animated counter ("1500+ creators")
- [ ] No emoji in CTAs ("🚀 Start selling")
- [ ] No "Premium" / "Pro" / "Featured" badge pills overlaid on product cards
- [ ] No 5-star rating stars on creator cards (use plain numerics: "32 reviews · 4.8")
- [ ] No skeleton loaders styled with grey rectangles — use `--surface-sunken` with subtle pulse
- [ ] No empty states with cartoon mascot illustrations
- [ ] All headings use the type scale, no off-scale font sizes
- [ ] All colors come from the §3.2 palette, no off-palette hex values
- [ ] All icons are Lucide; no Material Icons, no Heroicons, no FontAwesome
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95, Best Practices ≥ 95
- [ ] `prefers-reduced-motion` disables all animation
- [ ] Tested at 375px (iPhone SE), 768px (iPad), 1440px (desktop)

If any of these fail, scrap that section and rebuild.

---

> **End of chunk 1.** Chunks 2–6 to follow: cleanup steps, page-by-page spec, dashboard pruning, deployment, references + skills.

---

