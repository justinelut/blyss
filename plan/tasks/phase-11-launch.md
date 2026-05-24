# Phase 11 — Launch acceptance

> Plan refs: [§14 what good looks like](../15-acceptance.md). Goal: every box in the acceptance gate ticked. The single failing item rule applies: **if any item is unchecked, the build is not done.**

This phase is sequential after all others. Do not start until phases 1-10 are complete.

## 11.1 Repo state acceptance (§14.2)

- [ ] **11.1.1 File count audit** — `git ls-files | wc -l` is at least 50% smaller than baseline
- [ ] **11.1.2 Top-level dir explainability** — every dir at root explainable in one sentence
- [ ] **11.1.3 No phase-2 deleted dirs present** — `terraform/`, `oracle/`, `docs/`, `handbook/`, `lambda/`, `infra/`, `sdk/`, `marketplace-design-system/`, `.kiro/specs/`, `.agents/`, `.claude/`, `.devcontainer/`, `.zed/`
- [ ] **11.1.4 No phase-2 deleted files present**
- [ ] **11.1.5 Single GitHub Actions workflow** — only `deploy.yml` (+ `dependabot.yml`)
- [ ] **11.1.6 Backoffice untouched** — `git log server/polar/backoffice/` shows zero functional changes from baseline
- [ ] **11.1.7 Pledge wired to fundraising** — verified by phase 7 task 7.2.6
- [ ] **11.1.8 Loops integration active** — verified

## 11.2 Branding acceptance (§14.3)

- [ ] **11.2.1 Final brand sweep** — `grep -rn 'polar\.sh\|polarsource' clients/web/src server/polar` returns zero hits in user-facing strings
- [ ] **11.2.2 Config defaults verified** — EMAIL_FROM_NAME=Blyss, FAVICON_URL points at cdn.blyss.co.ke, INVOICES_ADDITIONAL_INFO=support@blyss.co.ke, CHECKOUT_LINK_HOST=buy.blyss.co.ke, FRONTEND_BASE_URL=https://blyss.co.ke
- [ ] **11.2.3 Backend rebrand suite passes**
- [ ] **11.2.4 Frontend rebrand property test passes**
- [ ] **11.2.5 Email templates render with "Blyss" everywhere** — render to disk, visually inspect 5 sample emails
- [ ] **11.2.6 Real brand assets uploaded** — favicon, wordmark, OG default in `cdn.blyss.co.ke/brand/` (user does this)
- [ ] **11.2.7 Browser tab title check** — load every public page, no "Polar" in `<title>`

## 11.3 Visual quality acceptance (§14.4)

- [ ] **11.3.1 Walk every public page through §3.5 anti-pattern checklist** — 22 items, all green
- [ ] **11.3.2 Palette adherence audit** — `grep -rn 'text-blue\|bg-green\|text-purple\|gradient' clients/web/src/components/` and `app/(marketplace)/` returns zero hits
- [ ] **11.3.3 Shadow audit** — `grep -rn 'shadow-md\|shadow-lg\|shadow-xl' clients/web/src/components/` only allowed in dropdowns/modals/sticky-bars
- [ ] **11.3.4 No emoji in CTAs or feature lists**
- [ ] **11.3.5 No trust-badge strips or 5-star displays**
- [ ] **11.3.6 No animated counters**
- [ ] **11.3.7 Carousel rotation interval audit** — none under 8s
- [ ] **11.3.8 Type scale audit** — all headings within §3.3 clamp ranges
- [ ] **11.3.9 Icon library audit** — all imports from `lucide-react`; no Material Icons / FontAwesome / Heroicons
- [ ] **11.3.10 Image aspect ratio audit** — products 4:5, hero 16:9, avatars/categories 1:1
- [ ] **11.3.11 `prefers-reduced-motion` test** — system setting → all motion disabled
- [ ] **11.3.12 Mobile/tablet/desktop testing** — at 375px, 768px, 1440px

## 11.4 Public marketplace acceptance (§14.5)

- [ ] **11.4.1 Home loads with all 6 sections rendering correctly**
- [ ] **11.4.2 Browse filters + URL state + pagination work**
- [ ] **11.4.3 Creators directory + spotlight load**
- [ ] **11.4.4 Creator storefront shows all sections, fundraising goal renders if active**
- [ ] **11.4.5 Product detail: tabs work, JSON-LD validates, Buy/Subscribe/Add-to-cart all work**
- [ ] **11.4.6 Cart drawer + full page work; subscription-vs-one-time logic correct**
- [ ] **11.4.7 Search palette + results page return relevant matches**
- [ ] **11.4.8 Magic link sign-in works (Mailhog dev, Resend prod)**
- [ ] **11.4.9 Google + Apple OAuth work**
- [ ] **11.4.10 No GitHub OAuth button anywhere**
- [ ] **11.4.11 Static pages (help/terms/privacy/acceptable-use/refunds) render Blyss-original Kenyan-jurisdiction content** — counsel-approved, not placeholder
- [ ] **11.4.12 404 + 500 use editorial voice**

## 11.5 Hosted checkout acceptance (§14.6)

- [ ] **11.5.1 `buy.blyss.co.ke` serves correctly via Cloudflare Tunnel**
- [ ] **11.5.2 Bare landing page renders helpful message**
- [ ] **11.5.3 `/checkout/[clientSecret]` flows through Paystack inline (cards + M-Pesa)**
- [ ] **11.5.4 `/[link-slug]` checkout links resolve to right product**
- [ ] **11.5.5 M-Pesa STK push reaches phone in test mode** — verified on real Kenyan SIM
- [ ] **11.5.6 Confirmation screen renders with download / perk markdown**
- [ ] **11.5.7 Cookies + CSP scoped to `buy.blyss.co.ke` only** — verified in DevTools

## 11.6 Customer portal acceptance (§14.7)

- [ ] **11.6.1 `my.blyss.co.ke` serves correctly**
- [ ] **11.6.2 Magic-link auth gate works**
- [ ] **11.6.3 Overview shows active subs + recent orders + perks**
- [ ] **11.6.4 Orders/subscriptions/files/wishlist/account routes all work**
- [ ] **11.6.5 Subscription detail renders perk markdown only when active**
- [ ] **11.6.6 File downloads stream from MinIO via 60s signed URLs**
- [ ] **11.6.7 Cancel subscription end-to-end**
- [ ] **11.6.8 Update payment method works**

## 11.7 Creator dashboard acceptance (§14.8)

- [ ] **11.7.1 Sidebar shows only §7.1 keep items** — no Webhooks/Meters/API tokens/OAuth/GitHub/Sandbox/License Keys/Brand/Orbit/Vision
- [ ] **11.7.2 Overview shows creator earnings (KSh tabular), no SaaS MRR**
- [ ] **11.7.3 Product CRUD works**
- [ ] **11.7.4 Subscription tier CRUD works including markdown benefits**
- [ ] **11.7.5 Storefront management: banner, avatar, bio, handle, fundraising goal, social links, featured products**
- [ ] **11.7.6 Orders/customers/reviews lists redesigned per §3**
- [ ] **11.7.7 Payouts: balance + withdraw to M-Pesa + history + M-Pesa setup**
- [ ] **11.7.8 Newsletter (creator → fans via Loops)**
- [ ] **11.7.9 Settings (account/notifications/delete) only — no developer settings**
- [ ] **11.7.10 Onboarding completes in ≤ 6 steps; never blocks publishing**

## 11.8 SEO acceptance (§14.9)

- [ ] **11.8.1 All public pages have unique title + description of correct length**
- [ ] **11.8.2 JSON-LD validates on Google Rich Results Test for: home, product, creator, browse, help**
- [ ] **11.8.3 OG images render correctly when shared on Twitter, LinkedIn, Facebook**
- [ ] **11.8.4 Sitemap index loads + 4 child sitemaps return valid XML**
- [ ] **11.8.5 robots.txt correct on all 4 hosts**
- [ ] **11.8.6 IndexNow keyfile reachable; ping flow tested**
- [ ] **11.8.7 Internal link audit ≥ 7 per product page**
- [ ] **11.8.8 Image sitemap entries include all product covers**
- [ ] **11.8.9 Cloudflare cache hit ratio ≥ 80% on `/product/*`** (verified after a week of traffic)
- [ ] **11.8.10 Search Console + Bing Webmaster verified, sitemap submitted**
- [ ] **11.8.11 Lighthouse SEO ≥ 95 on home, browse, product, creator pages**
- [ ] **11.8.12 `<html lang="en-KE">` set; KES default; +254 phone format**

## 11.9 Performance acceptance (§14.10)

- [ ] **11.9.1 Lighthouse Performance ≥ 90 on all public pages (mobile 4G)**
- [ ] **11.9.2 Real-user p75 LCP ≤ 2.0s after first month** (deferred verification)
- [ ] **11.9.3 Marketplace bundle ≤ 180 KB gzipped**
- [ ] **11.9.4 Checkout bundle ≤ 220 KB gzipped**
- [ ] **11.9.5 Portal bundle ≤ 200 KB gzipped**
- [ ] **11.9.6 Dashboard bundle ≤ 350 KB gzipped**
- [ ] **11.9.7 CLS < 0.05 on all public pages**
- [ ] **11.9.8 Cloudflare cache hit ratio ≥ 80%**
- [ ] **11.9.9 API p95 latency under per-endpoint targets (§9.7)**

## 11.10 Deployment acceptance (§14.11)

- [ ] **11.10.1 All `k8s/` manifests apply cleanly**
- [ ] **11.10.2 No public-IP-reachable services**
- [ ] **11.10.3 Postgres + MinIO + Redis ClusterIP-only**
- [ ] **11.10.4 All 5 hostnames serve correctly**
- [ ] **11.10.5 Total memory ≤ 6 GB**
- [ ] **11.10.6 Cloudflare tunnel healthy**
- [ ] **11.10.7 Migration Job runs successfully**
- [ ] **11.10.8 First nightly Postgres backup in B2**
- [ ] **11.10.9 `kubectl rollout undo` works**
- [ ] **11.10.10 Deploy workflow ≤ 8 minutes**
- [ ] **11.10.11 Smoke test passes after every deploy**

## 11.11 Operational readiness acceptance (§14.12)

- [ ] **11.11.1 Sentry receiving prod errors; alerts configured**
- [ ] **11.11.2 PostHog receiving events; Web Vitals dashboard live**
- [ ] **11.11.3 BetterStack uptime monitor pinging blyss.co.ke + api.blyss.co.ke/healthz**
- [ ] **11.11.4 B2 backup bucket + lifecycle rules**
- [ ] **11.11.5 Cloudflare Tunnel credentials rotated from initial setup**
- [ ] **11.11.6 GHCR pull token in cluster (read:packages only)**
- [ ] **11.11.7 Resend domain verified, SPF/DKIM/DMARC set**
- [ ] **11.11.8 Loops domain verified**
- [ ] **11.11.9 Paystack live keys in production secret (not test keys)**
- [ ] **11.11.10 At least one rollback drill completed by a human** (phase 10 task 10.9)
- [ ] **11.11.11 Runbook documented at `plan/runbook.md`** (or `docs/runbook.md` — single doc with: how to deploy, rollback, investigate Sentry, access kubectl, read logs, restore from backup)

## 11.12 Legal acceptance (§14.13)

- [ ] **11.12.1 Terms reviewed + approved by Kenyan counsel**
- [ ] **11.12.2 Privacy reviewed + approved**
- [ ] **11.12.3 Acceptable Use reviewed + approved**
- [ ] **11.12.4 Refunds reviewed + approved**
- [ ] **11.12.5 Privacy policy registered with ODPC if required by Kenya DPA 2019**
- [ ] **11.12.6 Cookie consent banner implemented + tested**
- [ ] **11.12.7 Paystack KYC complete for the platform**
- [ ] **11.12.8 Tax handling clarified for marketplace transactions**

## 11.13 Launch communication acceptance (§14.14)

- [ ] **11.13.1 Landing-page copy reviewed for tone (Kenyan, modern, confident, never SaaS)**
- [ ] **11.13.2 At least 5 seed creators onboarded before public launch**
- [ ] **11.13.3 At least 30 seed products published**
- [ ] **11.13.4 Soft launch / private beta period before public launch**
- [ ] **11.13.5 Announcement post (creator-facing) drafted**
- [ ] **11.13.6 Press / influencer outreach plan in place**

## The two-sentence test (§14.1)

When phase 11 is done, both of these must be true:

1. **A first-time visitor in Nairobi loads `blyss.co.ke` on a 4G connection and the page is fully usable in under 2 seconds, looks like it could exist on Are.na or Aimé Leon Dore, and converts them to start browsing without a single visible Polar branding leak.**

2. **A creator can sign up, complete onboarding, publish their first product, share `buy.blyss.co.ke/{their-slug}` on TikTok, receive an M-Pesa payment from a customer, and see the funds in their dashboard within 24 hours — without a developer's help.**

If both sentences are true, the build ships.
