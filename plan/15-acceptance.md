# §14 What good looks like

> See also: every other section — this is the master acceptance gate that aggregates per-section criteria

This is the single, definitive checklist. If any item is unchecked, the build is not done. No shipping until every box is green.

## §14.1 The two-sentence test

When v1 is done:

1. **A first-time visitor in Nairobi loads `blyss.co.ke` on a 4G connection and the page is fully usable in under 2 seconds, looks like it could exist on Are.na or Aimé Leon Dore, and converts them to start browsing without a single visible Polar branding leak.**
2. **A creator can sign up, complete onboarding, publish their first product, share `buy.blyss.co.ke/{their-slug}` on TikTok, receive an M-Pesa payment from a customer, and see the funds in their dashboard within 24 hours — without a developer's help.**

If both sentences are true, the product is shippable.

## §14.2 Repository state

- [ ] Total file count is at least 50% smaller than pre-cleanup baseline
- [ ] Every top-level directory at the repo root has an obvious purpose explainable in one sentence
- [ ] No `terraform/`, `oracle/`, `docs/`, `handbook/`, `lambda/`, `infra/`, `sdk/`, `marketplace-design-system/`, `.kiro/specs/`, `.agents/`, `.claude/`, `.devcontainer/`, `.zed/` directories
- [ ] No top-level files: `MARKETPLACE_*.md`, `VERCEL_*.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `DEVELOPMENT.md`, `app.json`, `conductor.json`, `Brewfile`, `flake.*`, `polar.code-workspace`
- [ ] Single GitHub Actions workflow at `.github/workflows/deploy.yml`; the 11 Polar deployment workflows are gone
- [ ] No backend module folders deleted (per §4.0 disable-don't-delete principle)
- [ ] Polar backoffice untouched at whatever path Polar mounts it
- [ ] `polar/pledge/` wired to fundraising goals on creator storefronts
- [ ] `polar/integrations/loops/` active and used for marketing emails

## §14.3 Branding

- [ ] `grep -rn 'polar\.sh\|polarsource' clients/web/src server/polar` returns zero hits in user-facing strings (config, copy, page text, email templates)
- [ ] `EMAIL_FROM_NAME=Blyss`, `FAVICON_URL` points at `cdn.blyss.co.ke/brand/favicon.png`, `INVOICES_ADDITIONAL_INFO=support@blyss.co.ke`, `CHECKOUT_LINK_HOST=buy.blyss.co.ke`, `FRONTEND_BASE_URL=https://blyss.co.ke`
- [ ] Backend `tests/platform_rebrand/` suite passes
- [ ] Frontend `__tests__/brand-text-replacement.property.test.tsx` passes
- [ ] Email templates render with "Blyss" everywhere
- [ ] Favicon, OG defaults, wordmark all swapped (user replaces the actual image files)
- [ ] No "polar" string visible in browser tab titles, page text, error messages, or buttons

## §14.4 Visual quality bar

- [ ] Every public page passes the §3.5 anti-pattern checklist (22 items)
- [ ] Palette adherence: every color in production matches §3.2 — no off-palette hex values
- [ ] No gradients anywhere
- [ ] No drop-shadow cards
- [ ] No emoji in CTAs or feature lists
- [ ] No "Trusted by 50+" / "5 ★★★★★ from 12,000+" social proof
- [ ] No animated number counters
- [ ] No carousel auto-rotation under 8 seconds
- [ ] All headings use the §3.3 type scale, no off-scale font sizes
- [ ] All icons are Lucide; no Material Icons / FontAwesome / Heroicons
- [ ] Images at correct aspect ratios (4:5 products, 16:9 hero, 1:1 avatars/categories)
- [ ] Motion respects `prefers-reduced-motion`
- [ ] Tested at 375px, 768px, 1440px

The "Are.na vs Jumia" gut check: every page would fit on the former, never on the latter.

## §14.5 Public marketplace functionality

- [ ] Home (`/`) loads with featured products, categories, creators, subscriptions
- [ ] Browse (`/browse`) filters work, URL state persists, pagination works
- [ ] Creators directory (`/creators`) loads with featured spotlight
- [ ] Creator storefront (`/creators/[slug]`) shows products, subscriptions, fundraising goal, reviews
- [ ] Product detail (`/product/[id]`) shows all sections, JSON-LD validates, Buy / Subscribe / Add to Cart works
- [ ] Cart drawer + full page work, subscription-vs-one-time logic correct
- [ ] Search palette + results page (`/search?q=...`) returns relevant results
- [ ] Sign in via magic link works (Mailhog in dev, Resend in prod)
- [ ] Google + Apple OAuth work
- [ ] No GitHub OAuth button
- [ ] Static pages (`/help`, `/terms`, `/privacy`, `/acceptable-use`, `/refunds`) render Blyss-original Kenyan-jurisdiction content (or `[BLYSS_LEGAL_PLACEHOLDER]` markers + counsel-review banner)
- [ ] 404 / 500 pages use editorial voice, not cartoons

## §14.6 Hosted checkout (`buy.blyss.co.ke`)

- [ ] Domain serves correctly via Cloudflare Tunnel
- [ ] Bare landing page redirects with helpful message
- [ ] `/checkout/[clientSecret]` flows through Paystack inline (cards + M-Pesa)
- [ ] `/[link-slug]` share-able checkout links resolve to the right product
- [ ] M-Pesa STK push reaches the phone in test mode
- [ ] Confirmation screen renders with download / subscription perk markdown
- [ ] Cookies + CSP scoped to `buy.blyss.co.ke` only

## §14.7 Customer portal (`my.blyss.co.ke`)

- [ ] Domain serves correctly
- [ ] Magic-link auth gate works
- [ ] Overview shows active subscriptions + recent orders + perks waiting
- [ ] Orders, subscriptions, files, wishlist, account routes all work
- [ ] Subscription detail renders perk markdown only when subscription is active
- [ ] File downloads stream from MinIO via signed URLs (60s expiry)
- [ ] Cancel subscription flow works end-to-end
- [ ] Update payment method flow works

## §14.8 Creator dashboard (`/dashboard`)

- [ ] All developer/SaaS items hidden from sidebar (no Webhooks, Meters, API tokens, OAuth, GitHub, Sandbox, License Keys, Brand, Orbit, Vision)
- [ ] Overview shows creator earnings widget with KSh tabular numerals — no MRR / SaaS metrics
- [ ] Product CRUD works: create with files + benefits + categories, edit, publish, unpublish
- [ ] Subscription tier CRUD works including markdown benefits
- [ ] Storefront management works: banner, avatar, bio, handle, fundraising goal, social links, featured products
- [ ] Orders list, customer list, reviews list all redesigned per §3
- [ ] Payouts: balance + withdraw to M-Pesa + history + M-Pesa setup
- [ ] Newsletter (creator → fans via Loops integration)
- [ ] Settings (account, notifications, delete) — no developer settings visible
- [ ] Onboarding (`/start`) completes in 6 steps, never blocks publishing

## §14.9 SEO

- [ ] All public pages have unique `<title>` and `<meta description>` of correct length
- [ ] JSON-LD validates on Google's Rich Results Test for: home (`WebSite`+SearchAction, `Organization`), product (`Product`+offers+rating+review), creator (`Person`), browse (`CollectionPage`+`ItemList`), help (`FAQPage`)
- [ ] OG images render at 1200×630 for product, creator, category, default
- [ ] `sitemap.xml` index loads with 4 child sitemaps; each child returns valid XML
- [ ] `robots.txt` correct on all 4 hosts (`blyss.co.ke` allows public, `buy.` and `my.` block all, `cdn.` allow all)
- [ ] IndexNow keyfile reachable; ping flow tested
- [ ] Internal link audit: product page has ≥ 7 internal links
- [ ] Image sitemap entries include all product covers
- [ ] Cloudflare cache rules applied; cache-hit ratio on `/product/*` ≥ 80% after a week
- [ ] Search Console + Bing Webmaster verified, sitemap submitted
- [ ] Lighthouse SEO ≥ 95 on home, browse, product, creator pages
- [ ] `<html lang="en-KE">` set; KES default; `+254` phone format

## §14.10 Performance

- [ ] Lighthouse Performance ≥ 90 on all public pages (mobile 4G simulation)
- [ ] Real-user p75 LCP ≤ 2.0s after first month of traffic (PostHog Web Vitals + Search Console field data)
- [ ] Marketplace bundle ≤ 180 KB gzipped
- [ ] Checkout bundle ≤ 220 KB gzipped
- [ ] Portal bundle ≤ 200 KB gzipped
- [ ] Dashboard bundle ≤ 350 KB gzipped
- [ ] CLS < 0.05 on all public pages
- [ ] Cloudflare cache hit ratio ≥ 80% on cacheable surfaces
- [ ] API p95 latency under per-endpoint targets (§9.7)

## §14.11 Deployment

- [ ] All `k8s/` manifests apply cleanly to a fresh K3s node
- [ ] No service is reachable from the public internet except via Cloudflare Tunnel
- [ ] Postgres + MinIO + Redis only reachable from inside the cluster (NetworkPolicy + manual port-scan test confirms)
- [ ] All 5 hostnames resolve and serve correctly
- [ ] Total memory usage on the node ≤ 6 GB
- [ ] Cloudflare dashboard shows tunnel healthy + DNS records present
- [ ] Migration Job runs successfully on first deploy
- [ ] First nightly Postgres backup lands in B2
- [ ] Manual `kubectl rollout undo` restores a previous version cleanly
- [ ] Deploy GitHub Action runs end-to-end ≤ 8 minutes
- [ ] Smoke test passes after every deploy

## §14.12 Operational readiness

- [ ] Sentry receiving errors from prod; team gets alerts
- [ ] PostHog receiving events; Web Vitals dashboard live
- [ ] BetterStack uptime monitor pinging `blyss.co.ke` + `api.blyss.co.ke/healthz`
- [ ] B2 backup bucket set up; lifecycle rules for daily/weekly/monthly retention
- [ ] Cloudflare Tunnel credentials rotated from initial setup
- [ ] GHCR pull token in cluster set with read:packages only
- [ ] Resend domain verified; SPF/DKIM/DMARC on `blyss.co.ke`
- [ ] Loops domain verified
- [ ] Paystack live keys in production secret (not test keys)
- [ ] At least one rollback drill completed by a human
- [ ] Runbook documented at `plan/runbook.md` (or similar) with: how to deploy, how to rollback, how to investigate Sentry, how to access kubectl, how to read logs, how to restore from backup

## §14.13 Legal + compliance

- [ ] `/terms`, `/privacy`, `/acceptable-use`, `/refunds` reviewed and approved by Kenyan counsel
- [ ] Privacy policy compliant with Kenya Data Protection Act 2019 (registered with ODPC if required)
- [ ] Cookie consent banner implemented (existing `Privacy/CookieConsent.tsx` redesigned per §3)
- [ ] Paystack KYC complete for the platform
- [ ] Tax handling clarified for marketplace transactions (creators responsible for their own income tax; platform fee is taxable revenue for Blyss)

## §14.14 Launch communication

- [ ] Landing-page copy reviewed for tone (Kenyan, modern, confident, never SaaS)
- [ ] At least 5 seed creators onboarded before public launch
- [ ] At least 30 seed products published
- [ ] Soft launch / private beta period before public launch
- [ ] Announcement post (creator-facing) drafted
- [ ] Press / influencer outreach plan in place

## §14.15 The single failing item rule

If any item above is unchecked, **the build is not done**. There are no "ship and fix later" items in this list. Each item exists because shipping without it produces a measurably worse product or a real risk (security, legal, brand).

The acceptable path is:

1. Run the full checklist
2. Fix every red item
3. Re-run the checklist
4. Ship

Not:

1. Run partial checks
2. Decide some items don't matter
3. Ship anyway

The checklist is the contract.
