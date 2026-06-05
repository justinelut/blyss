# DNA — supporting references (Bandcamp, Substack, Are.na, Adele Dejak)

Three short DNA snapshots for the references that inform specific surfaces.

---

## Bandcamp (artist storefront page)

**Use for:** the creator storefront page (`/creators/{slug}`).

- **Macrostructure:** Letter macrostructure (creator banner + name + one-line bio + city/links) followed by a Portfolio Grid of releases.
- **Cadence:** banner image → name + tagline → buy / follow / share row → discography listed top-to-bottom as cards (cover art, title, artist, year, price). Dense but typographic, not grid-cluttered.
- **Color:** the artist's chosen banner palette is the ONLY color on the page. Chrome is neutral grey/cream.

**Pull:** creator-first storefront cadence (banner → name → bio → "support this creator" buy/tip CTAs → grid). Tip CTA prominent.

**Don't pull:** the chunky teal accent + Comic Sans-adjacent monospace numbers; we keep our palette + Inter.

---

## Substack (writer profile page)

**Use for:** the creator About tab + creator card on home.

- **Macrostructure:** centred-narrow profile (avatar + name + tagline) at top, then a feed of posts/products underneath.
- **Cadence:** small avatar (64–96px) + single-line bio + clear "Subscribe" CTA. The post feed below is text-led with thumbnails right-flushed.
- **Color:** white paper, single accent for the Subscribe button. Photography is each writer's choice.

**Pull:** small avatar + one-line bio + single primary CTA pattern for creator cards on the home + creator directory. The "Subscribe" pattern translates to "View shop" or "Follow + tip."

---

## Are.na (channel page)

**Use for:** search results page + category browse.

- **Macrostructure:** Index First — a vertical list of titles separated by hairline rules; date right-flushed; no thumbnails on text-only items.
- **Cadence:** every result is a row: title (left, bold) + meta (right, muted). Rows are equal-height, hairline-separated. Mixed-media channels show thumbnails inline as small (64×64) thumbs, never as full cards.
- **Color:** monochrome cream/black, single thin underline accent on links.

**Pull:** **search results page = vertical typographic index**, NOT a grid. Each row: product name (left, bold) · creator (left, muted, smaller) · price (right, tabular). Hairline rules between rows.

---

## Adele Dejak (adeledejak.com)

**Use for:** Kenyan-context calibration — confirms our editorial-premium reading lands locally.

- **Macrostructure:** product collection grid with brand journal entries threaded through. **Currency selector in footer** with full country list (we already have a country switcher in the header — match its discoverability).
- **Cadence:** "X products" label above each collection card. "Worn & adorned by icons" testimonial section is a single landscape image + one paragraph per icon — no avatar grid, no logo wall.
- **Color:** cream + near-black + brand orange accent (very close to our `#C2410C`). Validates our palette choice.

**Pull:**
- "**N products**" eyebrow above category cards (not "browse our collection" generic copy).
- Currency switcher in BOTH header and footer (header = chosen UX; footer = SEO + secondary discoverability).
- "Worn & adorned by icons" voice: single named person + one paragraph + one image. No avatar grids.

**Don't pull:**
- The slideshow auto-rotation on the hero — slop-test gate 19 forbids carousels under 8s anyway.
- The "$0.00 USD" cart counter at full price width — Blyss cart is in-page, not header chip.

---

## Hallmark archetype mapping (combined)

| Surface | Macrostructure | Hero | Nav | Footer |
|---|---|---|---|---|
| Home | Marquee Hero + Long Document | H1 marquee | N5 / N9 | Ft5 statement |
| Browse | Catalogue | (no hero) | inherited | Ft5 |
| Creator | Letter + Portfolio Grid | H5 letter-hero | inherited | Ft5 |
| Product | Split Studio | H2 split-diptych (image left, type right) | inherited | Ft5 |
| Search | Index First | (no hero, just typographic header) | inherited | Ft5 |
| Cart | Tabular Spec Sheet | (no hero) | inherited | (no footer — sticky CTA) |
| /start (sell) | Manifesto | H3 quote-led | inherited | Ft6 letter-close |
| Legal | Long Document | (typographic) | inherited | Ft5 |
| 404 | Quote-Led | H3 quote-led | inherited | Ft5 |

These pairings already pass Hallmark's diversification rule — six different macrostructures across the surfaces, no two pages share both macrostructure AND theme.
