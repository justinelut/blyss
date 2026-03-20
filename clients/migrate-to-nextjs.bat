@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo Starting Turborepo to Next.js Migration
echo ========================================
echo.

cd ..
set "NEW_APP_DIR=%CD%\blyss-web"

echo Current directory: %CD%
echo New app will be created at: %NEW_APP_DIR%
echo.

REM Check if blyss-web already exists
if exist "%NEW_APP_DIR%" (
    echo Warning: %NEW_APP_DIR% already exists!
    set /p "REPLY=Delete and recreate? (y/n): "
    if /i not "!REPLY!"=="y" (
        echo Aborted.
        exit /b 1
    )
    rmdir /s /q "%NEW_APP_DIR%"
)

REM Step 1: Create new Next.js app
echo.
echo Creating fresh Next.js app...
call npx create-next-app@latest blyss-web --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git --use-pnpm

cd blyss-web

REM Step 2: Copy web app files
echo.
echo Copying web app files...
rmdir /s /q src 2>nul
xcopy /E /I /Y ..\clients\apps\web\src src
if exist ..\clients\apps\web\public xcopy /E /I /Y ..\clients\apps\web\public public
copy /Y ..\clients\apps\web\next.config.mjs .
copy /Y ..\clients\apps\web\tailwind.config.ts .
if exist ..\clients\apps\web\postcss.config.mjs copy /Y ..\clients\apps\web\postcss.config.mjs .
if exist ..\clients\apps\web\.env.local copy /Y ..\clients\apps\web\.env.local .
if exist ..\clients\apps\web\.env.development copy /Y ..\clients\apps\web\.env.development .

REM Step 3: Merge UI package
echo.
echo Merging UI package...
mkdir src\components\ui 2>nul
mkdir src\lib 2>nul
xcopy /E /I /Y ..\clients\packages\ui\src\components\ui src\components\ui
if exist ..\clients\packages\ui\src\components\atoms xcopy /E /I /Y ..\clients\packages\ui\src\components\atoms src\components\atoms
if exist ..\clients\packages\ui\src\components\molecules xcopy /E /I /Y ..\clients\packages\ui\src\components\molecules src\components\molecules
xcopy /E /I /Y ..\clients\packages\ui\src\lib src\lib

REM Step 4: Merge API client
echo.
echo Merging API client...
mkdir src\lib\api 2>nul
xcopy /E /I /Y ..\clients\packages\client\src src\lib\api

REM Step 5: Merge currency utilities
echo.
echo Merging currency utilities...
mkdir src\lib\currency 2>nul
xcopy /E /I /Y ..\clients\packages\currency\src src\lib\currency

REM Step 6: Merge checkout components
echo.
echo Merging checkout components...
mkdir src\components\checkout 2>nul
xcopy /E /I /Y ..\clients\packages\checkout\src src\components\checkout

REM Step 7: Merge orbit utilities
echo.
echo Merging orbit utilities...
mkdir src\lib\orbit 2>nul
xcopy /E /I /Y ..\clients\packages\orbit\src src\lib\orbit

REM Step 8: Fix import paths using PowerShell
echo.
echo Fixing import paths...
echo This may take a minute...

powershell -Command "$files = Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse; foreach ($file in $files) { $content = Get-Content $file.FullName -Raw; $content = $content -replace 'from \"@polar-sh/ui/components/ui/', 'from \"@/components/ui/'; $content = $content -replace 'from \"@polar-sh/ui/components/atoms/', 'from \"@/components/atoms/'; $content = $content -replace 'from \"@polar-sh/ui/components/molecules/', 'from \"@/components/molecules/'; $content = $content -replace 'from \"@polar-sh/ui/lib/', 'from \"@/lib/'; $content = $content -replace 'from \"@polar-sh/ui\"', 'from \"@/components/ui\"'; $content = $content -replace 'from \"@polar-sh/client\"', 'from \"@/lib/api\"'; $content = $content -replace 'from \"@polar-sh/currency\"', 'from \"@/lib/currency\"'; $content = $content -replace 'from \"@polar-sh/checkout\"', 'from \"@/components/checkout\"'; $content = $content -replace 'from \"@polar-sh/orbit\"', 'from \"@/lib/orbit\"'; Set-Content -Path $file.FullName -Value $content }"

echo Import paths updated!

REM Step 9: Update package.json
echo.
echo Updating package.json...

(
echo {
echo   "name": "blyss-web",
echo   "version": "1.0.0",
echo   "private": true,
echo   "scripts": {
echo     "dev": "next dev --port 3000 --turbopack",
echo     "build": "next build --turbopack",
echo     "start": "next start",
echo     "lint": "next lint",
echo     "typecheck": "tsc --noEmit"
echo   },
echo   "dependencies": {
echo     "next": "^15.1.6",
echo     "react": "^19.0.0",
echo     "react-dom": "^19.0.0",
echo     "@tanstack/react-query": "^5.62.11",
echo     "@radix-ui/react-accordion": "^1.2.2",
echo     "@radix-ui/react-avatar": "^1.1.2",
echo     "@radix-ui/react-checkbox": "^1.1.3",
echo     "@radix-ui/react-dialog": "^1.1.4",
echo     "@radix-ui/react-dropdown-menu": "^2.1.4",
echo     "@radix-ui/react-label": "^2.1.1",
echo     "@radix-ui/react-popover": "^1.1.4",
echo     "@radix-ui/react-select": "^2.1.4",
echo     "@radix-ui/react-separator": "^1.1.1",
echo     "@radix-ui/react-slot": "^1.1.1",
echo     "@radix-ui/react-switch": "^1.1.2",
echo     "@radix-ui/react-tabs": "^1.1.2",
echo     "@radix-ui/react-toast": "^1.2.4",
echo     "@radix-ui/react-tooltip": "^1.1.6",
echo     "tailwindcss": "^3.4.1",
echo     "class-variance-authority": "^0.7.1",
echo     "clsx": "^2.1.1",
echo     "tailwind-merge": "^2.6.0",
echo     "lucide-react": "^0.469.0",
echo     "zustand": "^5.0.2",
echo     "stripe": "^14.0.0",
echo     "posthog-js": "^1.200.0",
echo     "@sentry/nextjs": "^8.46.0",
echo     "react-day-picker": "^9.4.4",
echo     "recharts": "^2.15.0",
echo     "date-fns": "^4.1.0"
echo   },
echo   "devDependencies": {
echo     "@types/node": "^22.10.2",
echo     "@types/react": "^19.2.13",
echo     "@types/react-dom": "^19.2.3",
echo     "typescript": "^5.7.2",
echo     "eslint": "^9.18.0",
echo     "eslint-config-next": "^15.1.6"
echo   }
echo }
) > package.json

REM Step 10: Install dependencies
echo.
echo Installing dependencies...
echo This may take a few minutes...
call pnpm install

REM Final summary
echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo New app location: %NEW_APP_DIR%
echo.
echo Next steps:
echo   1. cd %NEW_APP_DIR%
echo   2. pnpm run typecheck      # Verify TypeScript
echo   3. pnpm run dev            # Start development server
echo.
echo If everything works:
echo   - Test thoroughly
echo   - Deploy to Vercel
echo   - Delete the old clients\ folder
echo.

pause
