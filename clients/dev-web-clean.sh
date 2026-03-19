#!/bin/bash

# Clean development script for web app only
# This clears all caches and runs ONLY the web app (no package building)

echo "🧹 Clearing caches..."
rm -rf apps/web/.next
rm -rf .turbo
rm -rf node_modules/.cache

echo "🚀 Starting web app only (no package building)..."
echo "This should start instantly!"
echo ""

cd apps/web && pnpm dev
