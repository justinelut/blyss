# Blyss — Implementation tasks

> See [../README.md](../README.md) for the full plan. This `tasks/` folder breaks the plan into ordered, agent-sized work items.

## How to use

1. Read the plan section referenced at the top of each phase file before starting that phase.
2. Work tasks in order within a phase. Phases run mostly sequentially; some can overlap (noted in each).
3. Tick boxes as tasks complete. Don't skip ahead.
4. Each task lists its acceptance criteria. The task is done when those pass.
5. If a task doesn't fit on the laptop in under ~4 hours, split it into sub-tasks before starting.

## Phases

| #   | Phase                            | File                                                                                                                                  | Plan refs                                        | Estimate                              |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| 1   | Local dev environment            | [phase-01-local-dev.md](./phase-01-local-dev.md)                                                                                      | §10                                              | 1 day                                 |
| 2   | Repo cleanup (delete junk)       | [phase-02-cleanup.md](./phase-02-cleanup.md)                                                                                          | §4.1–§4.3, §4.5, §4.7–§4.10, §4.11               | 1-2 days                              |
| 3   | Backend disable (no deletes)     | [phase-03-backend-disable.md](./phase-03-backend-disable.md)                                                                          | §4.0, §4.4, §4.6                                 | 0.5 day                               |
| 4   | Design system foundation         | [phase-04-design-system.md](./phase-04-design-system.md)                                                                              | §3                                               | 1 day                                 |
| 5   | Public marketplace rebuild       | [phase-05-marketplace-pages.md](./phase-05-marketplace-pages.md)                                                                      | §6                                               | 2-4 weeks                             |
| 6   | Dashboard strip + redesign       | [phase-06-dashboard.md](./phase-06-dashboard.md)                                                                                      | §7                                               | 1 week                                |
| 7   | Data model additions             | [phase-07-data-model.md](./phase-07-data-model.md)                                                                                    | §5                                               | 1-2 days (parallel with 5)            |
| 8   | SEO + performance polish         | [phase-08-seo-perf.md](./phase-08-seo-perf.md)                                                                                        | §8, §9                                           | 3-5 days                              |
| 9   | Testing                          | [phase-09-testing.md](./phase-09-testing.md)                                                                                          | §13                                              | 2-3 days (parallel with 5+6)          |
| 10  | Deployment infrastructure        | [phase-10-deployment.md](./phase-10-deployment.md)                                                                                    | §11, §12                                         | 2-3 days                              |
| 11  | Launch acceptance                | [phase-11-launch.md](./phase-11-launch.md)                                                                                            | §14                                              | 1-2 days                              |
| 12  | Storefront themes (v1 → v4)      | [phase-12-storefront-themes.md](./phase-12-storefront-themes.md)                                                                      | §19                                              | 1 week (v1) → 4-7 weeks (v3)          |
| 13  | Conversion-led frontend redesign | [foundation + key surfaces](./phase-13-conversion-redesign.md) · [commerce surfaces + validation](./phase-13b-conversion-surfaces.md) | Current owner override; §0, §3, §6, §13–§15, §19 | Phased; approve brand direction first |

**Total realistic envelope:** 4-7 weeks of focused agent work for phases 1-11, plus 1 week (v1 themes) → 4-7 weeks (through v3 themes) layered on top whenever the marketplace is otherwise stable.

**Phase 13 is not included in that original envelope.** It is a later owner-directed redesign cycle; estimate it after the brand decision and route/behavior baseline in tasks 13.1.1–13.1.3.

## Parallelism

- Phase 7 (data model) can start as soon as phase 5 is mid-way through.
- Phase 9 (testing) can start once any of phase 5's pages are stable.
- Phase 10 (deployment) can be drafted in parallel with phase 5 — manifests don't need the UI to be done.
- Phase 11 (launch) is sequential; it gates the last gate.

## Tracking progress

Each phase file ends with an "Acceptance" section. Tick every box in the acceptance section before moving to the next phase. Don't backtrack — fix the gap, then re-tick.

## Out-of-band setup (not coding work; do in parallel from day 1)

Track these in a separate doc; they're prerequisites for shipping but not for coding:

- [ ] Paystack KYC + live keys (longest pole — start now)
- [ ] Resend account + `blyss.co.ke` domain verified (DKIM, SPF, DMARC)
- [ ] Loops account + domain verified
- [ ] Backblaze B2 bucket + application key
- [ ] Sentry project created, DSN ready
- [ ] PostHog project created, key ready
- [ ] BetterStack uptime monitor account
- [ ] Cloudflare Tunnel created (`cloudflared tunnel create blyss`), credentials JSON saved
- [ ] GitHub repo configured: `SSH_PRIVATE_KEY` and `SERVER_IP` secrets present, packages enabled, branch protection on `main`
- [ ] Kenyan counsel engaged for Terms / Privacy / Acceptable Use review
- [ ] Brand assets prepared (favicon, wordmark, OG default) — user replaces images at launch
