# Vercel Build Fixes

## Issues Fixed for Vercel Deployment

### 1. DataTable Case Sensitivity Issue ✅
**Problem**: Module not found error on Vercel (Linux) for `@/components/atoms/DataTable`

**Root Cause**:
- Windows filesystem is case-insensitive, so folder appeared as `DataTable` locally
- Git was tracking it as lowercase `datatable`
- Vercel's Linux filesystem is case-sensitive and couldn't find `DataTable`

**Solution**:
```bash
git mv src/components/atoms/datatable src/components/atoms/DataTable_temp
git mv src/components/atoms/DataTable_temp src/components/atoms/DataTable
git commit -m "fix: rename datatable to DataTable for case-sensitive filesystems"
```

**Files affected**: 22+ files importing DataTable components

### 2. Checkout Module Import Paths ✅
**Problem**: Imports using `@/components/checkout` (lowercase) but folder is `Checkout` (uppercase)

**Solution**: Fixed all imports using sed:
```bash
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|@/components/checkout|@/components/Checkout|g" {} +
```

**Files affected**:
- CheckoutDiscountInput.tsx
- CheckoutBenefits.tsx
- Checkout.tsx
- CheckoutPage.tsx
- And 10+ other files

### 3. Checkout Embed Script Path ✅
**Problem**: Invalid path in config.ts: `node_modules/@/components/Checkout/dist/embed.global.js`

**Solution**: Changed to public path:
```typescript
CHECKOUT_EMBED_SCRIPT_SRC: '/checkout/embed.global.js'
```

### 4. StyleX Runtime Error ✅
**Problem**: `Unexpected 'stylex.defineVars' call at runtime` during build

**Solution**:
- Created `babel.config.js` with StyleX babel plugin
- Removed `--turbopack` flag from build script (kept for dev)
- Build now uses webpack which properly supports babel plugins

### 5. NFT Warning (Minor) ⚠️
**Problem**: "Encountered unexpected file in NFT list" warning in next.config.mjs

**Solution**: Added turbopack ignore comments to process.cwd() calls:
```typescript
path.join(/*turbopackIgnore: true*/ process.cwd(), 'src/...')
```

## Build Configuration

### package.json scripts:
```json
{
  "dev": "next dev --port 3000 --turbopack",  // Fast dev with Turbopack
  "build": "next build",                       // Production with webpack
  "start": "next start"
}
```

### Key files:
- `babel.config.js` - StyleX babel plugin configuration
- `components.json` - shadcn/ui configuration in root
- `next.config.mjs` - Cleaned up, no monorepo configs
- `tsconfig.json` - Standalone config

## Deployment Checklist

- [x] Fix DataTable casing for Linux filesystem
- [x] Fix Checkout import paths
- [x] Add babel.config.js for StyleX
- [x] Remove --turbopack from build script
- [x] Add components.json to root
- [x] Commit and push all changes
- [ ] Deploy to Vercel
- [ ] Verify build succeeds on Vercel
- [ ] Test all routes in production

## Notes

- Local builds work on Windows due to case-insensitive filesystem
- Vercel builds on Linux which is case-sensitive
- Always use proper PascalCase for component folders
- Use `git mv` to rename folders to ensure git tracks the case change
- Turbopack is great for dev but webpack is more stable for production builds
