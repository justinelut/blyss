# DNA — SSENSE (ssense.com)

Reference tier: **premium catalog commerce** — the gold standard for filter-rail discipline + editorial commerce blend.

## Macrostructure
**Catalogue + Workbench filter rail.** The browse page is a left-rail of facets + a right-grid of products; the home is a *Long Document* of editorial articles (Culture / Fashion / Recent / Featured) interleaved with shop links. **The home is editorial-first, not grid-first.** Shop access is via the persistent top nav.

## Type & rhythm
- Lower-case headlines on editorial articles (#### "How Brick Became a Status Symbol…"), large display sizes only on banner moments.
- Eyebrow line: **category** + **date** (e.g. "Culture May 29"), small caps, color-muted. Title underneath. Author/date beside title acceptable in editorial body, NOT in nav/category sections.
- Body type is a clean grotesque; no serif anywhere in the chrome. Subheads are mid-weight, NOT bolded.

## Color
- Pure white paper, near-black ink. Accent is essentially absent in the chrome — color comes from product photography. This is the most extreme example of "color is the photography, not the chrome."
- For Blyss: keep our `--accent` `#C2410C` for primary CTA only; let creator photography carry color in the grids.

## Layout discipline
- 4-column product grids on desktop (1 col mobile, 2 col tablet). No card padding — image is the card's full bleed, with caption underneath.
- Filter rail on the left, sticky, ~240px. Categories as **type-led list with counts on the right** (`Bracelets · 62`), not pills, not checkboxes-with-shaded-backgrounds.
- Sort + region in the top-right of the grid; both are typographic links with small chevron, not styled select boxes.

## Pull for Blyss
- **Filter rail = type-led list, count right-flushed**. No checkbox backgrounds; entries are clickable rows separated by hairline rules. Active state = bold + a single hairline underline.
- **"Load 24 more →"** as a typographic link at the bottom of the grid, not a numeric pager.
- **Editorial-first home** — between hero and product grids, weave a creator/article band. Blyss already has "NoteFromMakers" — extend its role.
- **Currency/region selector in footer** as a discreet expandable list (we already have the header `CountrySwitcher` — leave header version, mirror in footer).

## Do NOT pull
- Their entire home being editorial articles — Blyss is product-led at the home grid (we want creators' work above the fold).
- Their absence of accent — we keep `#C2410C` accent for CTAs because Blyss needs to drive a primary action (Buy / Subscribe).

## Hallmark archetype mapping
- Browse macrostructure: **Catalogue** (not Workbench — Workbench implies tool/utility; we want catalogue + lifestyle).
- Filter rail = custom type-led component (not in cookbook; build it as a hairline-rule list).
- Pagination = **"Load N more"** typographic link.
