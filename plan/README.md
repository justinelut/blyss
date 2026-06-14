# Blyss Build Brief — Index

This is the production-grade build brief for Blyss, a Kenyan creator marketplace built on Polar.sh, paid via Paystack, deployed as a single-server K3s monorepo behind Cloudflare.

The brief is split into focused files so an AI agent can load only the section relevant to the task at hand. Read top-to-bottom for full context, or jump to the section you need.

## Sections

| File | Section | What it covers |
|---|---|---|
| [00-front-matter.md](./00-front-matter.md) | Front matter | One-line description, plan structure overview |
| [01-mission.md](./01-mission.md) | §0 Mission | What Blyss is, who it's for, the wedge, brand voice |
| [02-source-approach.md](./02-source-approach.md) | §1 Source & Approach | Fork-then-strip principle, K3s deployment shape, Cloudflare Tunnel architecture |
| [03-tech-stack.md](./03-tech-stack.md) | §2 Tech Stack | Pinned versions, RAM budget, domain layout, CI/CD |
| [04-ui-direction.md](./04-ui-direction.md) | §3 UI Direction | Reference sites (6 tiers), Blyss palette, typography, motion, anti-pattern checklist |
| [05-cleanup.md](./05-cleanup.md) | §4 Cleanup | File-by-file delete list, backend disable-don't-delete principle, centralized rebrand audit |
| [06-data-model.md](./06-data-model.md) | §5 Data Model | Subscription perks via markdown benefit, pledge → fundraising goals, creator onboarding state |
| [07-pages.md](./07-pages.md) | §6 Pages | Page-by-page spec for all 14 marketplace surfaces |
| [08-dashboard.md](./08-dashboard.md) | §7 Dashboard | Creator dashboard pruning + redesign |
| [09-seo.md](./09-seo.md) | §8 SEO | Sitemaps, JSON-LD, dynamic OG, IndexNow, Cloudflare caching, Search Console |
| [10-performance.md](./10-performance.md) | §9 Performance | Core Web Vitals targets, bundle budgets, caching, image pipeline |
| [11-local-dev.md](./11-local-dev.md) | §10 Local Dev | Docker compose, env files, dev workflow |
| [12-deployment.md](./12-deployment.md) | §11 Deployment | K3s manifests, Cloudflare Tunnel, secrets, network policies, backups |
| [13-images.md](./13-images.md) | §12 GHCR Image Build | Dockerfiles for API + Web, GitHub Actions deploy workflow |
| [14-testing.md](./14-testing.md) | §13 Testing | Backend pytest, frontend Vitest, Playwright E2E, visual regression, Lighthouse CI, manual QA matrix |
| [15-acceptance.md](./15-acceptance.md) | §14 What Good Looks Like | Master acceptance checklist, the single failing item rule |
| [16-do-not-do.md](./16-do-not-do.md) | §15 Things to NOT Do | Project-level kill list of architectural, branding, scope, and process violations |
| [17-references.md](./17-references.md) | Appendix A: Visual Bible | 7 tiers of reference sites with per-surface lessons; the anti-AI-slop reference set |
| [18-skills-mcps.md](./18-skills-mcps.md) | Appendix B: Skills & MCPs | 14 tools to install before drafting any UI, with install order and invocation playbook |
| [19-storefront-themes.md](./19-storefront-themes.md) | §19 Storefront themes | Three-layer creator theming spec (tokens / layouts / niche modules) and v1→v4 rollout — see [tasks/phase-12](./tasks/phase-12-storefront-themes.md) |

## How to use this brief

- **First read:** start at `01-mission.md` and read sequentially through `07-pages.md`. About 1,500 lines total. ~30 minutes.
- **Implementing a specific page:** read `01-mission.md` + `04-ui-direction.md` + the relevant section of `07-pages.md`. Then check the anti-pattern checklist at the end of `04-ui-direction.md` before declaring the page done.
- **Implementing the cleanup phase:** read `05-cleanup.md` end-to-end before touching any files. The "disable, don't delete" principle in §4.0 is critical — ignoring it crashes the app.
- **Setting up local dev:** read `11-local-dev.md`. Self-contained.
- **Deployment work:** read `02-source-approach.md` + `12-deployment.md` + `13-images.md`.
- **Visual reference / picking a design pattern:** read `04-ui-direction.md` + `17-references.md` (when written).
- **Tooling setup:** read `18-skills-mcps.md` (when written) — install all listed skills/MCPs before drafting any UI.

## Source of truth

This `plan/` folder is the source of truth. The root-level `plan.md` is a one-line stub that points here. Update individual files in `plan/` rather than the stub.

## Editing rules

- One section per file. If a file grows past ~600 lines, split it (e.g. `07a-marketplace-pages.md`, `07b-portal-pages.md`).
- File numbering matches reading order, not section number — the front matter is `00-`, §0 Mission is `01-`, etc.
- Add a "see also" line at the top of each file linking to its 2-3 closest neighbors.
