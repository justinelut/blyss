# §15 Things to explicitly NOT do

> See also: [04-ui-direction.md](./04-ui-direction.md) §3.5 (per-page anti-pattern checklist)

The §3.5 checklist is for visual decisions. This section is the project-level kill list: things that, if done, fundamentally break Blyss. No matter how convenient, don't do them.

## §15.1 Architecture and infrastructure

- **Do not deploy to Vercel.** Decided. Everything runs on K3s. Vercel preview deploys, Vercel Edge Functions, Vercel Image Optimization — all off the table.
- **Do not introduce a second backend language.** Polar is Python/FastAPI. Don't bolt on a Node service for "just one feature." Use Dramatiq workers, the Polar pattern.
- **Do not introduce a second frontend framework.** Next.js handles everything. No Astro, no Remix, no Vue, no SolidJS. One Next.js app, multiple route groups.
- **Do not split into microservices.** One API (`polar-api`), one worker (`polar-worker`), one web (`web`). Splitting at this scale costs more than it saves.
- **Do not run more than 1 replica of stateful services.** Postgres is `replicas: 1` (StatefulSet). MinIO is `replicas: 1` (single-node mode). HA is a v2 problem.
- **Do not expose internal services on a public LoadBalancer.** Cloudflare Tunnel is the only inbound path. Postgres / Redis / MinIO are ClusterIP only.
- **Do not open ports 80/443 on the K3s server's firewall.** All traffic comes through `cloudflared`.
- **Do not use Helm.** Plain Kubernetes manifests in `k8s/` apply with `kubectl apply -f`. Simpler, fewer dependencies.
- **Do not introduce Tailscale, WireGuard, or any other VPN.** Cloudflare Tunnel is the only network overlay.
- **Do not use S3 / R2 / DigitalOcean Spaces / any external object storage.** MinIO is the storage layer, on K3s. Backups go to Backblaze B2 (different concern).

## §15.2 Polar codebase

- **Do not delete backend module folders.** Per §4.0, we disable inbound traffic only. Deleting modules cascades through imports and crashes the app at boot.
- **Do not drop database tables for disabled modules.** Empty tables cost nothing; dropping risks foreign-key cascades.
- **Do not modify the Polar backoffice.** Wherever Polar mounts it, with whatever auth it uses, leave it. It's an internal ops tool that works.
- **Do not rewrite Polar's auth system.** Magic link + Google + Apple via `polar/login_code/` and `polar/auth/`. Strip GitHub OAuth, keep everything else.
- **Do not rewrite Polar's payment integration.** Paystack is already wired at `server/polar/integrations/paystack/`. Use it.
- **Do not bypass Polar's webhook system for our own events.** If we need a new event, add it to Polar's existing webhook framework.
- **Do not write new ORM models when Polar has one that fits.** Reuse `Product`, `Subscription`, `Benefit`, `Order`, `Customer`, `Organization`, `Cart`, `Wishlist`, `Review`, `Donation`, `Pledge`. The single new model in v1 is `creator_onboarding_state` (§5.4).
- **Do not introduce a second ORM.** SQLAlchemy stays.
- **Do not introduce a second migration tool.** Alembic stays.

## §15.3 Frontend

- **Do not introduce a second component library.** shadcn/ui only. No MUI, no Chakra, no Mantine, no Ant Design.
- **Do not introduce a second icon library.** Lucide only. No Material Icons, no FontAwesome, no Heroicons, no Iconify.
- **Do not introduce a second animation library.** `motion` (motion.dev) only. No GSAP, no React Spring, no Lottie, no AOS.
- **Do not introduce a second CSS engine.** Tailwind v4 only. No Stylex, no Emotion, no styled-components, no CSS Modules outside Next.js defaults.
- **Do not introduce a second form library.** React Hook Form + Zod only.
- **Do not introduce a second data-fetching library.** TanStack Query only. No SWR, no Apollo, no Relay.
- **Do not introduce a second state library.** Zustand for client state, TanStack Query for server state. No Redux, no Jotai, no MobX, no Recoil.
- **Do not use `'use client'` at page roots for marketplace pages.** Server components by default. Client islands as needed.
- **Do not skip the §3 design tokens.** Every color, every font size, every shadow comes from `clients/web/src/design/`. No off-palette hex values.
- **Do not generate TypeScript types by hand from the API.** Use `pnpm run generate` against the OpenAPI schema.
- **Do not commit `.env`.** Only `.env.example` files committed.

## §15.4 Visual / UX

- **Do not use stock photography of business people.** Real creator photography or commissioned imagery only. If neither is available at launch, leave the slot blank with a `placeholder: true` flag.
- **Do not use cartoon mascot illustrations.** Editorial empty states only.
- **Do not use confetti, fireworks, or celebration animations.** Confirmations are typographic, not party-themed.
- **Do not autoplay video with sound.** Anywhere.
- **Do not autoplay carousels under 8 seconds.** Or auto-rotating heroes ever.
- **Do not animate number counters.** Numbers render statically.
- **Do not use trust-badge strips.** No "Trusted by 50+ companies", "As seen on", "Verified", "Premium", "Award-winning". The work itself is the proof.
- **Do not use 5-star rating displays.** Plain numerics: `4.8 · 32 reviews`.
- **Do not use gradient backgrounds, gradient buttons, or gradient overlays.** Anywhere.
- **Do not use `box-shadow` for sectioning.** Background tone shifts only.
- **Do not use `text-gray-500 bg-white` Tailwind defaults.** Use Blyss palette tokens.

## §15.5 Branding

- **Do not ship "Polar" anywhere user-facing.** §4.11 sweep + property tests enforce this. Zero tolerance.
- **Do not introduce Polar's old purple/blue palette.** §3.2 is the only palette.
- **Do not reuse Polar's marketing copy.** All voice is Blyss, Kenyan, modern.
- **Do not adopt Polar's email templates verbatim.** Rewrite for Blyss tone, then test the rebrand suite.
- **Do not call Polar "Polar Open Source" or credit Polar in user-facing UI.** Polar is the upstream, not the brand.
- **Do not put Polar's logo, favicon, or imagery in production.** Replace all.

## §15.6 Payments

- **Do not introduce Stripe.** Paystack only. Stripe code in the codebase stays dormant per §4.4 Step 5, but no UI / API surface is exposed.
- **Do not introduce Daraja directly.** M-Pesa is reached only through Paystack's `/charge mobile_money` endpoint.
- **Do not introduce a third payment processor.** Paystack covers cards + M-Pesa; v2 problems are v2 problems.
- **Do not store card details on Blyss servers.** Paystack tokenizes; we store the token only.
- **Do not collect M-Pesa PINs anywhere.** Ever. STK push only.
- **Do not change the platform fee from 20% without explicit approval.** `PLATFORM_FEE_BASIS_POINTS=2000` is the value.

## §15.7 Legal / compliance

- **Do not soft-launch with Polar's Terms / Privacy under Blyss branding.** Real legal risk. §6.12 spec applies.
- **Do not put real PII into commits, screenshots, or prompts.** Test data uses placeholder values.
- **Do not log full email addresses, phone numbers, or M-Pesa transaction details to Sentry/PostHog.** Hash or partial-redact.
- **Do not skip the Kenya Data Protection Act 2019 review.** Privacy policy must be ODPC-compliant before launch.
- **Do not enable PostHog session recordings on auth pages, checkout, or portal.** Capture redacts inputs by default; verify.

## §15.8 Process

- **Do not write code without reading the relevant `plan/` files first.** This brief is the contract.
- **Do not skip running the §3.5 anti-pattern checklist before declaring a page done.** Every page, every time.
- **Do not skip Lighthouse CI checks before merging.** They're the performance contract.
- **Do not deploy on Fridays.** Standard rule. Friday deploys means weekend rollbacks.
- **Do not deploy without running the smoke test (§13.9).** It's automated; if it fails, rollback.
- **Do not skip the human QA pass on the device matrix (§13.7) before launch.** Real devices, real Kenyan SIM card for the M-Pesa test.
- **Do not delete data without a backup verification.** Always confirm B2 has a recent restore-able dump first.
- **Do not run destructive scripts (`reset_and_migrate.py`, `drop_db.py`) against production.** Only against local dev or staging.

## §15.9 Scope

- **Do not build features that aren't in this plan.** Scope creep is the #1 launch killer. v1.1 has its own plan.
- **Do not add a mobile app, desktop app, or browser extension to v1.** Mobile web is well-served by §3 + §9.
- **Do not add a creator analytics dashboard beyond the §7.3 earnings widget.** v1.1.
- **Do not add multi-currency beyond KES + USD.** v1.1.
- **Do not add multi-language beyond English.** Swahili in v1.2.
- **Do not add custom creator domains.** v1.1.
- **Do not add affiliate / referral programs.** v1.2.
- **Do not add an internal messaging system between creators and customers.** Use email. v2.
- **Do not add an AI / LLM-powered feature in v1.** Polar shipped some; we deleted them in §4.5. Resist the temptation to add new ones.
- **Do not add gift cards, subscriptions-with-trial, or tiered platform fees.** v1.1+.

## §15.10 The escape hatch

If the AI agent or developer believes a "do not" rule must be violated for a real reason:

1. Stop coding.
2. Write a short doc proposing the change, the reason, and the impact.
3. Get explicit approval from the project owner.
4. Update this `16-do-not-do.md` to reflect the new rule.
5. Then code.

The rules exist because every one was made for a reason. Updating the rules is fine; bypassing them silently is not.
