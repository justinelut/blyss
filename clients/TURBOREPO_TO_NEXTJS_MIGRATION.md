# Turborepo to Standalone Next.js Migration Plan

## Goal

Convert the monorepo structure to a single Next.js application without rewriting code. We'll merge the packages into the Next.js app while maintaining all functionality.

## Current Structure

```
clients/
├── apps/
│   └── web/              # Main Next.js app
├── packages/
│   ├── client/           # API client (@polar-sh/client)
│   ├── ui/               # UI components (@polar-sh/ui)
│   ├── checkout/         # Checkout components
│   ├── currency/         # Currency utilities
│   └── orbit/            # Other utilities
└── examples/             # Not needed
```

## Target Structure

```
blyss-web/
├── src/
│   ├── app/              # Next.js app (from apps/web/src/app)
│   ├── components/       # All components (from apps/web + packages/ui)
│   ├── lib/              # Utilities (from packages/*)
│   │   ├── api/          # API client (from packages/client)
│   │   ├── currency/     # Currency utils (from packages/currency)
│   │   └── utils/        # Other utilities
│   └── hooks/            # React hooks
├── public/               # Static assets
└── package.json          # Single package.json
```

## Migration Steps

### Step 1: Create Fresh Next.js App

```bash
# Create new Next.js app with same config as current
npx create-next-app@latest blyss-web --typescript --tailwind --app --src-dir --import-alias "@/*"
cd blyss-web
```

### Step 2: Copy Next.js App Files

```bash
# Copy the entire web app
cp -r ../clients/apps/web/src/* ./src/
cp -r ../clients/apps/web/public/* ./public/
cp ../clients/apps/web/next.config.mjs ./
cp ../clients/apps/web/tailwind.config.ts ./
cp ../clients/apps/web/tsconfig.json ./
cp ../clients/apps/web/.env.* ./
```

### Step 3: Merge UI Package

```bash
# Copy UI components into the app
mkdir -p src/components/ui
cp -r ../clients/packages/ui/src/components/* ./src/components/
cp -r ../clients/packages/ui/src/lib/* ./src/lib/
```

### Step 4: Merge API Client Package

```bash
# Copy API client
mkdir -p src/lib/api
cp -r ../clients/packages/client/src/* ./src/lib/api/
```

### Step 5: Merge Other Packages

```bash
# Currency utilities
mkdir -p src/lib/currency
cp -r ../clients/packages/currency/src/* ./src/lib/currency/

# Checkout components
mkdir -p src/components/checkout
cp -r ../clients/packages/checkout/src/* ./src/components/checkout/

# Orbit utilities
mkdir -p src/lib/orbit
cp -r ../clients/packages/orbit/src/* ./src/lib/orbit/
```

### Step 6: Update Import Paths (Automated)

Create a script to fix all imports:

```bash
# Create fix-imports.sh
cat > fix-imports.sh << 'EOF'
#!/bin/bash

# Fix @polar-sh/ui imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/ui/components/|@/components/|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/ui/lib/|@/lib/|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/ui|@/components/ui|g' {} +

# Fix @polar-sh/client imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/client|@/lib/api|g' {} +

# Fix @polar-sh/currency imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/currency|@/lib/currency|g' {} +

# Fix @polar-sh/checkout imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/checkout|@/components/checkout|g' {} +

# Fix @polar-sh/orbit imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/orbit|@/lib/orbit|g' {} +

echo "✓ Import paths updated!"
EOF

chmod +x fix-imports.sh
./fix-imports.sh
```

### Step 7: Update package.json

Merge all dependencies from packages into one:

```json
{
  "name": "blyss-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000 --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.62.11",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.4.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.469.0",
    "zustand": "^5.0.2",
    "openapi-typescript-codegen": "^0.29.0",
    "stripe": "^14.0.0",
    "posthog-js": "^1.200.0",
    "@sentry/nextjs": "^8.46.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.2.13",
    "@types/react-dom": "^19.2.3",
    "typescript": "^5.7.2",
    "eslint": "^9.18.0",
    "eslint-config-next": "^15.1.6"
  }
}
```

### Step 8: Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Step 9: Clean Up and Install

```bash
# Remove turborepo files
rm -rf .turbo turbo.json

# Install dependencies
pnpm install

# Or use npm
npm install
```

### Step 10: Fix Remaining Issues

Create a diagnostic script:

```bash
# Create check-imports.sh
cat > check-imports.sh << 'EOF'
#!/bin/bash

echo "Checking for remaining package imports..."
echo ""

echo "Checking @polar-sh imports:"
grep -r "@polar-sh" src/ --include="*.ts" --include="*.tsx" | wc -l

echo ""
echo "Checking for broken imports:"
grep -r "from '@/" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -20

echo ""
echo "Run: pnpm typecheck to verify all imports are correct"
EOF

chmod +x check-imports.sh
./check-imports.sh
```

## Automated Migration Script

Here's a complete script to do everything:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Turborepo to Next.js Migration"
echo ""

# Step 1: Create new Next.js app
echo "📦 Creating fresh Next.js app..."
npx create-next-app@latest blyss-web --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
cd blyss-web

# Step 2: Copy web app
echo "📋 Copying web app files..."
cp -r ../clients/apps/web/src/* ./src/
cp -r ../clients/apps/web/public/* ./public/ 2>/dev/null || true
cp ../clients/apps/web/next.config.mjs ./
cp ../clients/apps/web/tailwind.config.ts ./
cp ../clients/apps/web/tsconfig.json ./
cp ../clients/apps/web/.env.* ./ 2>/dev/null || true

# Step 3: Merge packages
echo "📦 Merging UI package..."
mkdir -p src/components/ui
cp -r ../clients/packages/ui/src/components/* ./src/components/
cp -r ../clients/packages/ui/src/lib/* ./src/lib/

echo "📦 Merging API client..."
mkdir -p src/lib/api
cp -r ../clients/packages/client/src/* ./src/lib/api/

echo "📦 Merging currency utilities..."
mkdir -p src/lib/currency
cp -r ../clients/packages/currency/src/* ./src/lib/currency/

echo "📦 Merging checkout components..."
mkdir -p src/components/checkout
cp -r ../clients/packages/checkout/src/* ./src/components/checkout/

echo "📦 Merging orbit utilities..."
mkdir -p src/lib/orbit
cp -r ../clients/packages/orbit/src/* ./src/lib/orbit/

# Step 4: Fix imports
echo "🔧 Fixing import paths..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/ui/components/|@/components/|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/ui/lib/|@/lib/|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/ui|@/components/ui|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/client|@/lib/api|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/currency|@/lib/currency|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/checkout|@/components/checkout|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@polar-sh/orbit|@/lib/orbit|g' {} +

# Step 5: Install dependencies
echo "📥 Installing dependencies..."
pnpm install

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. cd blyss-web"
echo "2. pnpm run typecheck  # Check for any import errors"
echo "3. pnpm run dev        # Start development server"
echo ""
EOF
```

## Expected Issues and Fixes

### Issue 1: Circular Dependencies

Some packages might have circular imports. Fix by:

```bash
# Find circular dependencies
npx madge --circular src/
```

### Issue 2: Missing Types

Some types might be missing. Add them to `src/types/`:

```typescript
// src/types/index.ts
export * from './api'
export * from './components'
```

### Issue 3: Build Errors

Run diagnostics:

```bash
pnpm run typecheck
pnpm run build
```

## Vercel Deployment

After migration, update Vercel settings:

- Build command: `pnpm run build`
- Output directory: `.next`
- Install command: `pnpm install`
- Root directory: `blyss-web`

## Benefits of Migration

1. ✅ Faster builds (no turborepo overhead)
2. ✅ Simpler dependency management
3. ✅ Easier to deploy
4. ✅ Better Vercel compatibility
5. ✅ No monorepo complexity
6. ✅ All code in one place

## Rollback Plan

If something goes wrong:

1. Keep the original `clients/` folder
2. Test the new `blyss-web/` folder separately
3. Only delete `clients/` after confirming everything works

## Timeline

- Setup: 10 minutes
- Migration script: 5 minutes
- Fix imports: 15 minutes
- Test build: 10 minutes
- Deploy: 5 minutes

Total: ~45 minutes

Ready to start? Run the migration script!
