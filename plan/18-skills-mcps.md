# Appendix B — Skills, MCP servers, and the install order

> See also: [README.md](./README.md), [04-ui-direction.md](./04-ui-direction.md), [17-references.md](./17-references.md)

The downstream AI agent must install these tools BEFORE drafting any UI. They exist for one reason: forcing better output than a vanilla model would produce. Skipping them is the single biggest cause of AI-template results.

The full set is large, but each is small to install. Total setup time: ~30 minutes.

---

## B.1 Phase 0 install order

| # | Tool | Type | Why now |
|---|---|---|---|
| 1 | Anthropic frontend-design skill | Skill | Anti-slop discipline guard at every UI draft |
| 2 | shadcn MCP | MCP | Live awareness of every shadcn component + version-correct install commands |
| 3 | Playwright MCP | MCP | Browser automation via accessibility tree; no vision model required |
| 4 | Anthropic webapp-testing skill | Skill | Spin up dev server + capture screenshots + console logs for self-critique |
| 5 | Context7 MCP | MCP | Real-time, version-specific docs for every library |
| 6 | Lighthouse CI | CLI tool + GHA | Automated SEO + performance + accessibility scoring |
| 7 | Chrome DevTools MCP | MCP | Performance + a11y inspection deeper than Lighthouse |
| 8 | axe-core in Playwright | npm | Accessibility violation detection in every E2E test |
| 9 | Cloudflare MCP | MCP | DNS + Tunnel + cache management without leaving the agent |
| 10 | PostgreSQL MCP | MCP | Schema introspection + safe read queries against the dev DB |
| 11 | `awesome-cursorrules` `.cursorrules` | File | Passive convention enforcement |
| 12 | Blyss design system skill (custom) | Skill | This very `plan/` folder, indexed as a skill |
| 13 | Polar codebase knowledge skill (custom) | Skill | Pre-indexed Polar API + module map for fast lookup |
| 14 | Kenyan ecommerce taste skill (custom) | Skill | Curated Tier 3 + Tier 4 references from Appendix A as inline visual prompts |

If any of #1–#5 are unavailable in the agent runtime, **stop and provision them before continuing.** The plan does not work without them.

---

## B.2 Tool details

### B.2.1 Anthropic frontend-design skill

**Source:** https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md

**Install (Claude Code / compatible agent):**

```
/skills add https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md
```

**What it does:** Anthropic's own opinionated guidance for distinctive, production-grade frontend UI. Guards against the "centered hero + 3-column emoji feature grid + 4.9★ avatar stack" template trap.

**When to invoke:** At the start of every new page or component, before drafting markup. Re-invoke if a draft starts feeling generic.

**Why it matters:** This single skill applied with discipline is the difference between Linear-grade output and Bootstrap-template output. The Mchoro Mawe brief calls this skill "non-negotiable" — same here.

---

### B.2.2 shadcn MCP server

**Source:** https://ui.shadcn.com/docs/mcp

**Install:**

```bash
npx shadcn@latest mcp init --client claude   # or --cursor / --vscode
```

Or manually in `.cursor/mcp.json` / `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] }
  }
}
```

**What it does:** Live awareness of every shadcn/ui component, registry source, and install command. Browse and add components by name through MCP rather than guessing CLI syntax.

**When to invoke:** During scaffolding (Phase 1) and any time a new component is needed.

---

### B.2.3 Playwright MCP

**Source:** https://github.com/microsoft/playwright-mcp

**Install (Claude Code):**

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

Or manually:

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }
  }
}
```

**What it does:** Microsoft's official MCP server for Playwright browser automation via accessibility tree snapshots. No vision model required. The agent can navigate, click, type, and read the page DOM in a structured form.

**When to invoke:**

- After each page is built — open in headless browser, screenshot, run a Lighthouse audit
- For end-to-end test scaffolding (the 6 must-pass flows in §13)
- To visit Visual Bible reference URLs from Appendix A and study them programmatically when in doubt about a composition

---

### B.2.4 Anthropic webapp-testing skill

**Source:** https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md

**Install:**

```
/skills add https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md
```

**What it does:** Playwright-based Python toolkit for spinning up the local dev server and capturing screenshots, console logs, and the accessibility tree from any URL. Lets the agent critique its own output.

**When to invoke:** After every major page or component is drafted — screenshot the result and visually compare it to the Visual Bible (Appendix A) before declaring the section done.

**Why it matters:** Closes the loop. Without this, an agent generates code that looks reasonable in source but renders broken or template-y in the browser, and never finds out.

---

### B.2.5 Context7 MCP

**Source:** https://github.com/upstash/context7

**Install (auto-setup):**

```bash
npx ctx7 setup --claude   # or --cursor / --opencode
```

Or manually:

```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_CONTEXT7_API_KEY" }
    }
  }
}
```

**What it does:** Fetches real-time, version-specific docs from any library's source repo and injects them into the model's context. Kills the "I'm using Tailwind v3 syntax against your v4 project" class of hallucinations.

**When to invoke:** Append `use context7` to any prompt that touches Next.js, Polar, FastAPI, SQLAlchemy, Paystack, shadcn, motion, Resend, Loops, Cloudflare, MinIO. Basically every external library in this build.

**Why it matters:** Polar is at a specific version. Next.js 16 changed the OG image API. Paystack's M-Pesa endpoint signature changed in 2025. Stale doc memory will cost days. Context7 prevents it.

---

### B.2.6 Lighthouse CI

**Source:** https://github.com/GoogleChrome/lighthouse-ci

**Install:**

```bash
cd clients/web
pnpm add -D @lhci/cli
```

Add `lighthouserc.json` at repo root:

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000",
        "http://localhost:3000/browse",
        "http://localhost:3000/creators",
        "http://localhost:3000/product/seed-1",
        "http://localhost:3000/creators/seed-1"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

**When to invoke:** Every PR touching `clients/web/`. CI fails on regression.

---

### B.2.7 Chrome DevTools MCP

**Source:** https://github.com/ChromeDevTools/chrome-devtools-mcp (official) or community variants

**Install:**

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

**What it does:** Deeper performance + accessibility inspection than Lighthouse alone. Network waterfall, JS coverage, layout shift sources, paint timing. Good for diagnosing "why is LCP 3.2s on this specific page."

**When to invoke:** When Lighthouse regression is detected; for deep-dive performance audits before launch.

---

### B.2.8 axe-core in Playwright

**Install:**

```bash
cd clients/web
pnpm add -D @axe-core/playwright
```

**Use in tests:**

```typescript
import AxeBuilder from '@axe-core/playwright'

test('home is accessible', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
```

Already specced in §13.6. Zero violations on public pages.

---

### B.2.9 Cloudflare MCP

**Source:** https://github.com/cloudflare/mcp-server-cloudflare

**Install (Claude Code):**

```bash
claude mcp add cloudflare npx @cloudflare/mcp-server-cloudflare
```

**What it does:** DNS record management, Cloudflare Tunnel listing/creation, cache purge, Page Rule edits, KV / R2 ops (we don't use R2, but available). Keeps Cloudflare ops inside the agent.

**When to invoke:** Setting up DNS records during deployment, purging cache after a major UI change, debugging caching issues.

---

### B.2.10 PostgreSQL MCP

**Source:** https://github.com/modelcontextprotocol/servers/tree/main/src/postgres

**Install:**

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://blyss:blyss@localhost:5432/blyss"]
    }
  }
}
```

**What it does:** Read-only schema introspection + query execution against the dev Postgres. Lets the agent answer "what columns does the `products` table have?" by inspecting, not guessing.

**When to invoke:** Schema audits, debugging query issues, writing migration files.

**Important:** Configure with the dev DB connection string. **Never** the production DB.

---

### B.2.11 `awesome-cursorrules` `.cursorrules` file

**Source:** https://github.com/PatrickJS/awesome-cursorrules

**Install:**

```bash
curl -o .cursorrules \
  https://raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/rules/typescript-shadcn-ui-nextjs-cursorrules-prompt-fil/.cursorrules
```

**What it does:** Tells Cursor + compatible agents the stack conventions (TypeScript, shadcn/ui, Next.js) so generated code matches from the first prompt.

Customize for Blyss by appending:

```
- Use motion (motion.dev) only for animations. Never GSAP, AOS, React Spring.
- All colors come from the Blyss palette in plan/04-ui-direction.md §3.2. Never use Tailwind blue-*, green-*, purple-* utilities.
- All icons are Lucide. Never @mui/icons, FontAwesome, Heroicons.
- Server components by default for marketplace pages. Client islands only.
- All API calls go through TanStack Query.
- No 'use client' at page roots for marketplace pages.
- Run the §3.5 anti-pattern checklist before declaring a component done.
```

**When to invoke:** Set up once at project init; runs passively on every interaction afterward.

---

### B.2.12 Blyss design system skill (custom)

This `plan/` folder IS the skill. Index it for the agent:

```
/skills add file://./plan/04-ui-direction.md
/skills add file://./plan/15-acceptance.md
/skills add file://./plan/16-do-not-do.md
/skills add file://./plan/17-references.md
```

Or, in environments without the `/skills` command, point the agent at `plan/README.md` as the entry point and instruct it to load the relevant section before any task.

**When to invoke:** Before drafting ANY UI for Blyss.

---

### B.2.13 Polar codebase knowledge skill (custom)

A pre-indexed knowledge base of Polar's API endpoints, module map, and conventions. The agent references this instead of grep'ing Polar's source for every question.

**Build:**

```bash
# Generate an OpenAPI spec from Polar's API
cd server
uv run python scripts/generate_openapi.py > /tmp/polar-openapi.json

# Generate a module map
find polar/ -type f -name '*.py' -path '*/service.py' -o -name '*/repository.py' -o -name '*/endpoints.py' \
  | xargs grep -l 'class\|def' \
  > /tmp/polar-modules.txt
```

Feed both into the agent's knowledge context:

```
/skills add file://./server/scripts/generate_openapi.py
# Plus a curated polar-cheatsheet.md the team writes as common-question reference
```

**When to invoke:** Anytime an integration with Polar is needed.

---

### B.2.14 Kenyan ecommerce taste skill (custom)

A short skill file (~50 lines) listing Tier 3 + Tier 4 references from Appendix A with one-line notes on what each teaches. The agent loads this before drafting Kenyan-specific UI (homepage hero, creator stories, M-Pesa CTAs).

```markdown
# Kenyan ecommerce taste

When drafting any Blyss UI that targets Kenyan visitors, first check these references.

## Local references
- adeledejak.com — premium Kenyan brand voice
- vivowoman.com — mainstream Kenyan ecommerce
- lapaire.com — modern Kenyan ecommerce
- ...

## Anti-references (never do these)
- jumia.co.ke — busy, badge-heavy
- kilimall.co.ke — generic Bootstrap
- ...

## Tone notes
- Don't use "Mzee" or "Bro" or other slang in UI copy. Modern, neutral.
- Use "M-Pesa" with the exact casing. Never "Mpesa" or "MPesa".
- KES amounts: prefix "KSh" not "Ksh" or "KES" or "Kshs".
- Phone format: +254 7XX XXX XXX with non-breaking spaces.
- Address format: "Nairobi, Kenya" or just "Nairobi" — never "Nairobi, KE".
```

Save at `plan/skills/kenyan-ecommerce-taste.md` and load:

```
/skills add file://./plan/skills/kenyan-ecommerce-taste.md
```

---

## B.3 Skill invocation playbook

The agent follows this sequence:

**Phase 0 — Tooling (do this first, no exceptions):**

1. Install B.2.1 through B.2.11 (the off-the-shelf tools)
2. Drop the `.cursorrules` file in repo root
3. Index the custom skills (B.2.12, B.2.13, B.2.14)
4. Verify all MCP servers respond by asking: *"List the shadcn components available"* — should return a real list

**Phase 1 — Scaffolding:**

5. Use shadcn MCP to install the base component set
6. Use Context7 for any library setup question — pin every doc lookup to it

**Phase 2 — Building each page:**

7. BEFORE drafting a new page: re-read the relevant section of `04-ui-direction.md` + Visual Bible (Appendix A)
8. BEFORE drafting markup: invoke the frontend-design skill
9. AFTER drafting a page: invoke webapp-testing + Playwright MCP to screenshot and self-critique
10. If the screenshot looks template-y, scrap and rebuild
11. Run the §3.5 anti-pattern checklist + §15 do-not-do list

**Phase 3 — Validation:**

12. Use Playwright MCP to run Lighthouse on every public route
13. Confirm Performance ≥ 90, Accessibility ≥ 95 before declaring a page done
14. Run axe-core in Playwright tests; assert zero violations

**Phase 4 — Continuous:**

15. Every PR triggers Lighthouse CI + Playwright + visual regression
16. Failing checks block merge

---

## B.4 Acceptance for Appendix B

The toolset is ready when:

- [ ] `/skills add` for the 4 Anthropic skills + 3 custom Blyss skills succeeds
- [ ] All 6 MCP servers respond to a test query
- [ ] `.cursorrules` is in repo root and customized for Blyss
- [ ] Lighthouse CI gate is wired in `.github/workflows/`
- [ ] axe-core runs as part of every Playwright test
- [ ] Phase 2 invocation playbook is documented in the project README or onboarding doc
- [ ] An onboarding agent can install everything in under 30 minutes following this appendix
