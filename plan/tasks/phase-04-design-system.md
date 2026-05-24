# Phase 4 — Design system foundation

> Plan refs: [§3 UI Direction](../04-ui-direction.md). Goal: tokens, fonts, motion utilities, and base components in place before any page rebuild.

## Tasks

- [ ] **4.1 Create `clients/web/src/design/` folder**
  - Acceptance: folder exists with empty `index.ts`

- [ ] **4.2 Define palette CSS variables**
  - Create `clients/web/src/design/tokens.css` with all light + dark mode CSS custom properties from §3.2
  - Import in `globals.css`
  - Acceptance: `var(--accent)` resolves to `#C2410C` in browser DevTools; dark mode swap works via `data-theme="dark"`

- [ ] **4.3 Wire palette into Tailwind v4 theme**
  - Update `globals.css` `@theme` block: replace Polar terracotta refs with Blyss palette
  - Add semantic Tailwind utilities: `bg-accent`, `text-primary`, `border-strong`, etc.
  - Remove conflicting shadcn variables that override the palette
  - Acceptance: `<button className="bg-accent text-accent-foreground">` renders burnt orange

- [ ] **4.4 Audit + delete Polar palette tokens**
  - `clients/web/src/styles/globals.css` currently has both Polar `--color-polar-*` and Blyss `--color-primary-*` variables. Keep Blyss; comment or delete Polar.
  - Verify no component imports the old Polar tokens
  - Acceptance: app renders without Polar palette references

- [ ] **4.5 Configure font loading**
  - Open `clients/web/src/fonts/fonts.ts` (already references Inter + InterDisplay + Louize)
  - Remove Louize (not in §3.3 — we're Inter + Inter Display only)
  - Verify weights loaded: Inter 400/500/600, Inter Display 500/600
  - Set `display: swap`, subset to latin + latin-ext
  - Acceptance: page renders with Inter + Inter Display, no FOUC, fonts subset correctly (check size in DevTools network tab)

- [ ] **4.6 Define typography scale**
  - Create `clients/web/src/design/typography.ts` exporting H1/H2/H3/lede/body/caption classes per §3.3
  - Use Tailwind clamp() for responsive sizes
  - Acceptance: `<h1 className={typography.h1}>...</h1>` produces a clamp(48px, 6vw, 88px) heading

- [ ] **4.7 Define motion tokens**
  - Create `clients/web/src/design/motion.ts` exporting `easings`, `durations`, and `useReducedMotionConfig()` helper
  - Per §3.4 motion section: `easings.smooth = [0.32, 0.72, 0, 1]`, `durations.fast = 200`, `.default = 350`, `.hero = 800`
  - Acceptance: a test component animates with the smooth easing

- [ ] **4.8 Migrate to `motion` library**
  - Verify phase 2 task 2.16–2.17 done: `motion` installed, `framer-motion` removed
  - Test one existing animated component (cart drawer, modal) to confirm it still works after import migration
  - Acceptance: no animation regressions

- [ ] **4.9 Update shadcn primitives palette**
  - Walk `clients/web/src/components/ui/{button,card,input,...}.tsx`
  - Replace Polar primary/secondary token references with Blyss tokens
  - Remove Polar shadows, add Blyss focus rings
  - Acceptance: `<Button>` renders accent burnt-orange filled; `<Input>` matches §3.4 spec (no border default, focus underline)

- [ ] **4.10 Build the `Eyebrow` component**
  - New file `clients/web/src/design/Eyebrow.tsx`
  - Inter 600, 11px, uppercase, letter-spacing 0.14em, color `--text-muted` or `--accent`
  - Used everywhere on the marketplace
  - Acceptance: Storybook story (or manual test page) shows the eyebrow

- [ ] **4.11 Build the `SectionDivider` component**
  - Background tone shift component — renders a `--surface-sunken` block with adjustable padding
  - No HR, no shadow
  - Acceptance: stacking two `<SectionDivider>`s with content visually separates them

- [ ] **4.12 Build the `Skeleton` component (Blyss-flavored)**
  - shadcn's Skeleton recolored to `--surface-sunken` with subtle motion-driven pulse
  - Replaces gray rectangle skeletons everywhere
  - Acceptance: one test page shows multiple Skeletons with the right palette and pulse

- [ ] **4.13 Build the `LegalDoc` markdown renderer**
  - For §6.12 static pages — `react-markdown` + `rehype-sanitize` allowing only safe tags
  - Also reusable for benefit perk markdown rendering (§5.1)
  - Acceptance: renders sample markdown with sanitized output (`<script>` stripped); rejects raw HTML

- [ ] **4.14 Build the `JsonLd` component**
  - Server component that renders `<script type="application/ld+json">{...}</script>`
  - Used in §8 SEO across product, creator, category pages
  - Acceptance: `<JsonLd data={{...}} />` renders valid JSON-LD; passes Google Rich Results Test on a sample

- [ ] **4.15 Build a `BlyssLogo` wordmark component**
  - SVG or text-based wordmark using Inter Display 600
  - User replaces with brand asset later — but the component shape is fixed
  - Acceptance: wordmark renders in nav; switches color via `currentColor`

- [ ] **4.16 Anti-pattern checklist test**
  - Pick one existing page (e.g., the current marketplace home with seed data) and run §3.5 manually
  - Document violations to fix in phase 5
  - Acceptance: list of violations committed, ready as input for phase 5

## Acceptance for phase 4

- [ ] Palette tokens live in CSS; verified in DevTools
- [ ] Typography scale used by at least one rendered component
- [ ] Motion tokens used by at least one rendered animation
- [ ] Inter + Inter Display load without FOUC
- [ ] All shadcn primitives use Blyss palette
- [ ] `motion` library replaces `framer-motion` everywhere with no regressions
- [ ] `Eyebrow`, `SectionDivider`, `Skeleton`, `LegalDoc`, `JsonLd`, `BlyssLogo` components all exist with stories or test usages
- [ ] Page renders pass the §3.5 anti-pattern checklist for the elements built so far
