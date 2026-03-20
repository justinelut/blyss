#!/bin/bash
set -e

echo "🚀 Migrating Existing Turborepo to Standalone Next.js"
echo "======================================================"
echo ""
echo "This will reorganize the existing code without creating a new app"
echo ""

# Get the parent directory
PARENT_DIR="$(cd .. && pwd)"
NEW_APP_DIR="$PARENT_DIR/blyss-web"

# Check if blyss-web already exists
if [ -d "$NEW_APP_DIR" ]; then
    echo "⚠️  $NEW_APP_DIR already exists!"
    read -p "Delete and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$NEW_APP_DIR"
    else
        echo "Aborted."
        exit 1
    fi
fi

echo "📁 Creating new directory structure..."
mkdir -p "$NEW_APP_DIR"
cd "$NEW_APP_DIR"

# Copy the web app as base
echo "📋 Copying web app..."
cp -r ../clients/apps/web/* .

# Merge packages into src
echo "📦 Merging packages..."

# UI package
echo "  - Merging UI components..."
cp -r ../clients/packages/ui/src/components/* ./src/components/ 2>/dev/null || true
cp -r ../clients/packages/ui/src/lib/* ./src/lib/ 2>/dev/null || true

# API client
echo "  - Merging API client..."
mkdir -p src/lib/api
cp -r ../clients/packages/client/src/* ./src/lib/api/ 2>/dev/null || true

# Currency
echo "  - Merging currency utilities..."
mkdir -p src/lib/currency
cp -r ../clients/packages/currency/src/* ./src/lib/currency/ 2>/dev/null || true

# Checkout
echo "  - Merging checkout components..."
mkdir -p src/components/checkout
cp -r ../clients/packages/checkout/src/* ./src/components/checkout/ 2>/dev/null || true

# Orbit
echo "  - Merging orbit utilities..."
mkdir -p src/lib/orbit
cp -r ../clients/packages/orbit/src/* ./src/lib/orbit/ 2>/dev/null || true

# Fix imports
echo ""
echo "🔧 Fixing import paths..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
    -e 's|from "@polar-sh/ui/components/ui/|from "@/components/ui/|g' \
    -e 's|from "@polar-sh/ui/components/atoms/|from "@/components/atoms/|g' \
    -e 's|from "@polar-sh/ui/components/molecules/|from "@/components/molecules/|g' \
    -e 's|from "@polar-sh/ui/lib/|from "@/lib/|g' \
    -e 's|from "@polar-sh/ui"|from "@/components/ui"|g' \
    -e 's|from "@polar-sh/client"|from "@/lib/api"|g' \
    -e 's|from "@polar-sh/currency"|from "@/lib/currency"|g' \
    -e 's|from "@polar-sh/checkout"|from "@/components/checkout"|g' \
    -e 's|from "@polar-sh/orbit"|from "@/lib/orbit"|g' \
    {} \;

# Clean up backup files
find src -name "*.bak" -delete

echo "  ✓ Import paths updated!"

# Update package.json
echo ""
echo "📝 Updating package.json..."
cat > package.json << 'EOF'
{
  "name": "blyss-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000 --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
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
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
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
    "eslint-config-next": "^15.1.6"
  }
}
EOF

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pnpm install

echo ""
echo "======================================================"
echo "✅ Migration Complete!"
echo "======================================================"
echo ""
echo "📁 New app location: $NEW_APP_DIR"
echo ""
echo "Next steps:"
echo "  1. cd $NEW_APP_DIR"
echo "  2. pnpm run typecheck"
echo "  3. pnpm run dev"
echo ""
