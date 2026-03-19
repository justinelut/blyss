# Extract Web App from Monorepo

You're tired of the monorepo setup. Here's how to extract just the web app into a standalone Next.js project.

## Quick Fix (Run Only Web App - No Extraction)

Instead of running the entire monorepo, run ONLY the web app:

```bash
# Stop the current dev server (Ctrl+C)

# Run only the web app
cd clients/apps/web
pnpm dev
```

This skips building all the packages and starts instantly.

## Full Extraction (Standalone Next.js App)

If you want a completely standalone Next.js app without the monorepo:

### Step 1: Create New Next.js Project

```bash
cd ~/Desktop/projects/digital-products
mkdir blyss-frontend
cd blyss-frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

### Step 2: Copy Essential Files

Copy these from `clients/apps/web/`:

- `src/app/` → Your new `app/` directory
- `src/components/` → Your new `components/` directory
- `src/hooks/` → Your new `hooks/` directory
- `src/utils/` → Your new `utils/` directory
- `src/styles/` → Your new `styles/` directory
- `public/` → Your new `public/` directory
- `.env.local` → Your new `.env.local`
- `next.config.mjs` → Merge with your new `next.config.mjs`
- `tailwind.config.ts` → Merge with your new `tailwind.config.ts`

### Step 3: Install Dependencies

The monorepo uses workspace packages. You need to install them as regular npm packages:

```bash
# Core dependencies
pnpm add next@latest react@latest react-dom@latest
pnpm add @tanstack/react-query
pnpm add lucide-react
pnpm add tailwind-merge class-variance-authority
pnpm add framer-motion
pnpm add date-fns
pnpm add zod
pnpm add react-hook-form
pnpm add posthog-js posthog-node
pnpm add @stripe/stripe-js @stripe/react-stripe-js

# UI components (Radix)
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast

# Dev dependencies
pnpm add -D @types/node @types/react @types/react-dom typescript
pnpm add -D tailwindcss postcss autoprefixer
pnpm add -D prettier eslint
```

### Step 4: Replace Workspace Imports

Find and replace all workspace package imports:

```typescript
// OLD (workspace packages)
import { api } from '@polar-sh/client'
import { Button } from '@polar-sh/ui/components/atoms/Button'

// NEW (local imports)
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
```

### Step 5: Copy Shared UI Components

Copy the UI components you need from `clients/packages/ui/src/` to your new `components/ui/` directory.

### Step 6: Setup API Client

Create `lib/api.ts` and copy the API client setup from `clients/packages/client/`.

### Step 7: Clean Up

Remove monorepo-specific files:

- Remove `pnpm-workspace.yaml` references
- Remove `turbo.json` references
- Simplify `package.json` (no workspace dependencies)

## Recommended: Keep Monorepo But Fix Issues

Actually, the monorepo isn't the problem. The issues are:

1. **Cache not cleared** - The useWishlist error is because .next cache wasn't properly cleared
2. **Running all packages** - You're running `pnpm run dev` which builds everything

### Better Approach:

```bash
# 1. Clear all caches
cd clients
rm -rf apps/web/.next
rm -rf .turbo
rm -rf node_modules/.cache

# 2. Run ONLY the web app (not the entire monorepo)
cd apps/web
pnpm dev

# This starts instantly because it doesn't build packages
```

### Fix the useWishlist Error:

The error persists because the server is caching. You need to:

1. Stop the dev server (Ctrl+C)
2. Clear the cache: `rm -rf clients/apps/web/.next`
3. Start ONLY the web app: `cd clients/apps/web && pnpm dev`

## My Recommendation

**Don't extract yet.** Just run the web app directly:

```bash
cd clients/apps/web
pnpm dev
```

This will:

- Start instantly (no package building)
- Use the shared packages without rebuilding them
- Fix the caching issues

If you still want to extract after trying this, I can help you create a migration script.
