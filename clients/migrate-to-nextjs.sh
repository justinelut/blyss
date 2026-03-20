#!/bin/bash
set -e

echo "🚀 Starting Turborepo to Next.js Migration"
echo "=========================================="
echo ""

# Get the parent directory (where we'll create the new app)
PARENT_DIR="$(cd .. && pwd)"
NEW_APP_DIR="$PARENT_DIR/blyss-web"

echo "📍 Current directory: $(pwd)"
echo "📍 New app will be created at: $NEW_APP_DIR"
echo ""

# Check if blyss-web already exists
if [ -d "$NEW_APP_DIR" ]; then
    echo "⚠️  Warning: $NEW_APP_DIR already exists!"
    read -p "Delete and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$NEW_APP_DIR"
    else
        echo "Aborted."
        exit 1
    fi
fi

# Step 1: Create new Next.js app
echo "📦 Creating fresh Next.js app..."
cd "$PARENT_DIR"
npx create-next-app@latest blyss-web \
    --typescript \
    --tailwind \
    --app \
    --src-dir \
    --import-alias "@/*" \
    --no-git \
    --use-pnpm

cd blyss-web

# Step 2: Copy web app files
echo ""
echo "📋 Copying web app files..."
rm -rf src/*  # Clear default files
cp -r ../clients/apps/web/src/* ./src/
[ -d ../clients/apps/web/public ] && cp -r ../clients/apps/web/public/* ./public/ 2>/dev/null || true
cp ../clients/apps/web/next.config.mjs ./
cp ../clients/apps/web/tailwind.config.ts ./
cp ../clients/apps/web/postcss.config.mjs ./ 2>/dev/null || true
[ -f ../clients/apps/web/.env.local ] && cp ../clients/apps/web/.env.local ./ 2>/dev/null || true
[ -f ../clients/apps/web/.env.development ] && cp ../clients/apps/web/.env.development ./ 2>/dev/null || true

# Step 3: Merge UI package
echo "📦 Merging UI package..."
mkdir -p src/components/ui
mkdir -p src/lib
cp -r ../clients/packages/ui/src/components/ui/* ./src/components/ui/ 2>/dev/null || true
cp -r ../clients/packages/ui/src/components/atoms ./src/components/ 2>/dev/null || true
cp -r ../clients/packages/ui/src/components/molecules ./src/components/ 2>/dev/null || true
cp -r ../clients/packages/ui/src/lib/* ./src/lib/ 2>/dev/null || true

# Step 4: Merge API client
echo "📦 Merging API client..."
mkdir -p src/lib/api
cp -r ../clients/packages/client/src/* ./src/lib/api/ 2>/dev/null || true

# Step 5: Merge currency utilities
echo "📦 Merging currency utilities..."
mkdir -p src/lib/currency
cp -r ../clients/packages/currency/src/* ./src/lib/currency/ 2>/dev/null || true

# Step 6: Merge checkout components
echo "📦 Merging checkout components..."
mkdir -p src/components/checkout
cp -r ../clients/packages/checkout/src/* ./src/components/checkout/ 2>/dev/null || true

# Step 7: Merge orbit utilities
echo "📦 Merging orbit utilities..."
mkdir -p src/lib/orbit
cp -r ../clients/packages/orbit/src/* ./src/lib/orbit/ 2>/dev/null || true

# Step 8: Fix import paths
echo ""
echo "🔧 Fixing import paths..."
echo "   This may take a minute..."

# Fix @polar-sh/ui imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/ui/components/ui/|from "@/components/ui/|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/ui/components/atoms/|from "@/components/atoms/|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/ui/components/molecules/|from "@/components/molecules/|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/ui/lib/|from "@/lib/|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/ui"|from "@/components/ui"|g' {} \;

# Fix @polar-sh/client imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/client"|from "@/lib/api"|g' {} \;

# Fix @polar-sh/currency imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/currency"|from "@/lib/currency"|g' {} \;

# Fix @polar-sh/checkout imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/checkout"|from "@/components/checkout"|g' {} \;

# Fix @polar-sh/orbit imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak 's|from "@polar-sh/orbit"|from "@/lib/orbit"|g' {} \;

# Clean up backup files
find src -name "*.bak" -delete

echo "   ✓ Import paths updated!"

# Step 9: Update package.json with all dependencies
echo ""
echo "📝 Updating package.json..."

# Merge dependencies from all packages
cat > package.json.tmp << 'EOF'
{
  "name": "blyss-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000 --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.62.11",
    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-checkbox": "^1.1.3",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-popover": "^1.1.4",
    "@radix-ui/react-progress": "^1.1.1",
    "@radix-ui/react-radio-group": "^1.2.2",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slider": "^1.2.1",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.1.6",
    "tailwindcss": "^3.4.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.469.0",
    "zustand": "^5.0.2",
    "stripe": "^14.0.0",
    "posthog-js": "^1.200.0",
    "@sentry/nextjs": "^8.46.0",
    "react-day-picker": "^9.4.4",
    "recharts": "^2.15.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.2.13",
    "@types/react-dom": "^19.2.3",
    "typescript": "^5.7.2",
    "eslint": "^9.18.0",
    "eslint-config-next": "^15.1.6",
    "prettier": "^3.8.1",
    "@tailwindcss/typography": "^0.5.15"
  }
}
EOF

mv package.json.tmp package.json

# Step 10: Install dependencies
echo ""
echo "📥 Installing dependencies..."
echo "   This may take a few minutes..."
pnpm install

# Step 11: Create helper scripts
echo ""
echo "📝 Creating helper scripts..."

cat > check-imports.sh << 'EOF'
#!/bin/bash
echo "Checking for remaining @polar-sh imports..."
echo ""
REMAINING=$(grep -r "@polar-sh" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
echo "Found $REMAINING remaining @polar-sh imports"
if [ $REMAINING -gt 0 ]; then
    echo ""
    echo "Files with @polar-sh imports:"
    grep -r "@polar-sh" src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null
fi
EOF

chmod +x check-imports.sh

# Final summary
echo ""
echo "=========================================="
echo "✅ Migration Complete!"
echo "=========================================="
echo ""
echo "📁 New app location: $NEW_APP_DIR"
echo ""
echo "Next steps:"
echo "  1. cd $NEW_APP_DIR"
echo "  2. ./check-imports.sh      # Check for any remaining issues"
echo "  3. pnpm run typecheck      # Verify TypeScript"
echo "  4. pnpm run dev            # Start development server"
echo ""
echo "If everything works:"
echo "  - Test thoroughly"
echo "  - Deploy to Vercel"
echo "  - Delete the old clients/ folder"
echo ""

