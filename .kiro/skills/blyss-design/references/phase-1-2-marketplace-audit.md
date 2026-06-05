# Marketplace surface — palette + token audit

Phase 1.2 of the revamp plan. Run on commit `6a5b3f5`. Severity:

- **block-ship** — palette/anti-slop violation in live production code; fix before next release.
- **polish** — uses default Tailwind utilities where palette tokens exist; fix during the per-page revamp it lives in.
- **dead-code** — unused, recommended for deletion in a separate cleanup commit.

## block-ship

None on live customer surface. The 13 "forbidden hue" hits were either:
- in `__tests__/` files asserting old class names that will be rewritten when the corresponding component is revamped, or
- in **dead code** (see below).

So Phase 1.2 surfaces no live palette violations to ship-block. Good news.

## polish — fix during Phase 2 page revamps

Tracked here so each page-revamp ticket includes the migration in its scope. **Do not chase these standalone**; they go with the page they're on.

- **`bg-white`** (16 occurrences). Migrate to `bg-[var(--surface-elevated)]` (or `bg-[var(--surface)]` for non-elevated surfaces).
- **`text-gray-N`** (27 occurrences). Migrate to `text-[var(--text-secondary)]` (≥500 grey) or `text-[var(--text-muted)]` (300-400 grey). For headings stay on `--text-primary`.

To find them per file: `grep -rn "bg-white\b\|text-gray-[0-9]"` filtered to the page being revamped.

## dead-code — propose deletion (separate commit)

Three components exist with palette violations BUT have **no consumers in the production codebase** — only their own tests and the marketplace index re-export. The existing test gates already exclude them, so they're a known maintenance dead-zone.

| File | Why dead | Action |
|---|---|---|
| `src/components/Marketplace/HeroSection.tsx` | superseded by `Hero.tsx`; no imports | delete + remove from `Marketplace/index.ts` |
| `src/components/Marketplace/CurrencyDemo.tsx` | demo-only; no imports | delete + remove from `Marketplace/index.ts` |
| `src/components/Cart/CartIcon.tsx` | superseded by `CartButton.tsx`; no imports | delete + remove from `Cart/index.ts` |
| `src/components/Cart/__tests__/CartIcon.test.tsx` | tests the dead file | delete |
| `src/components/Marketplace/__tests__/HeroSection.test.tsx` (if exists) | … | delete |

Recommend a single follow-up commit `chore(marketplace): remove dead components flagged by Phase 1.2 audit`.

## anti-slop hits (slop-test quick check on customer surface)

| Gate | Count | Notes |
|---|---|---|
| 1 (no-gradients) | 3 | All in dead `HeroSection.tsx`. Live = 0. |
| 2 (no-shadow-cards) | 1 | Test asserting old class. Live production cards = 0. |
| 7 (no-emoji-icons) | 0 | Verified clean. |
| 8 (no-lucide-on-marketplace) | 0 | Cleared in Phase 1.3. CI gate added. |

## Tokens to keep using

The system in `lib/tokens` / `design/` is correct; the palette tokens (`--background`, `--surface`, `--surface-elevated`, `--surface-sunken`, `--border`, `--text-primary/secondary/muted`, `--accent`, `--accent-hover`, `--accent-foreground`, `--success`, `--danger`, `--warning`) cover every legitimate need on the marketplace surface. No new tokens required for Phase 2 revamp.
