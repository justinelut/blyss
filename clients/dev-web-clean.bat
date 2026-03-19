@echo off
REM Clean development script for web app only (Windows)
REM This clears all caches and runs ONLY the web app (no package building)

echo 🧹 Clearing caches...
if exist apps\web\.next rmdir /s /q apps\web\.next
if exist .turbo rmdir /s /q .turbo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo 🚀 Starting web app only (no package building)...
echo This should start instantly!
echo.

cd apps\web
pnpm dev
