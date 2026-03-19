# Vercel Deployment Guide

This guide covers deploying the Blyss frontend to Vercel from a monorepo.

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Backend deployed and running at https://server.blyss.co.ke
3. Domain DNS configured (blyss.co.ke and www.blyss.co.ke)

## Step 1: Push Latest Code to GitHub

```bash
git add -A
git commit -m "Prepare for Vercel deployment"
git push
```

## Step 2: Import Project to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository: `justinelut/blyss`
4. Click "Import"

## Step 3: Configure Project Settings

### Framework Preset
- Select: **Next.js**

### Root Directory
- Click "Edit" next to Root Directory
- Set to: `clients/apps/web`
- This tells Vercel where your Next.js app is in the monorepo

### Build Settings
- **Build Command**: `cd ../.. && cd clients && pnpm install && pnpm run build --filter=web`
- **Output Directory**: `.next` (default)
- **Install Command**: `cd ../.. && cd clients && pnpm install`

Or use the simpler approach:
- Leave build settings as default
- Vercel will use the `vercel.json` in the root

## Step 4: Environment Variables

Add these environment variables in Vercel dashboard:

```
NEXT_PUBLIC_API_URL=https://server.blyss.co.ke
NEXT_PUBLIC_FRONTEND_BASE_URL=https://blyss.co.ke
NEXT_PUBLIC_POSTHOG_KEY=phc_zNTymlFv1RP5JFqMc9563NyHsCtqofzwVc0NiLJ1Ayl
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_1e298a9b7cf0509d128be4c8dc7aaacecac54f80
NEXT_PUBLIC_LOGO_URL=/blyss-logo.svg
NEXT_PUBLIC_LOGO_DARK_URL=/blyss-logo-dark.svg
```

## Step 5: Deploy

Click "Deploy" and wait for the build to complete.

## Step 6: Configure Custom Domain

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your domains:
   - `blyss.co.ke`
   - `www.blyss.co.ke`

4. Vercel will provide DNS records. Add these to your domain DNS:

For `blyss.co.ke`:
```
Type: A
Name: @
Value: 76.76.21.21
```

For `www.blyss.co.ke`:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## Step 7: Update Backend CORS (Already Done)

The backend `.env.production` already includes:
```
POLAR_CORS_ORIGINS='["https://blyss.co.ke", "https://www.blyss.co.ke", "https://*.vercel.app", "http://localhost:3000"]'
POLAR_USER_SESSION_COOKIE_DOMAIN=".blyss.co.ke"
```

After updating, restart the backend:
```bash
ssh -i oracle/ssh-key-2026-03-17.key ubuntu@92.4.130.9
cd /opt/blyss/blyss/oracle
sudo ./scripts/update.sh
```

## Step 8: Test the Deployment

1. Visit https://blyss.co.ke
2. Test login/signup
3. Test creating products
4. Test file uploads
5. Check browser console for errors

## Troubleshooting

### CORS Errors
- Check backend logs: `sudo tail -f /var/log/blyss/api.log`
- Verify CORS origins include your Vercel domain
- Restart backend after CORS changes

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check if backend is accessible: `curl https://server.blyss.co.ke/healthz`
- Check browser Network tab for failed requests

### Cookie/Session Issues
- Verify `POLAR_USER_SESSION_COOKIE_DOMAIN=".blyss.co.ke"`
- Ensure both frontend and backend use same root domain
- Check browser cookies in DevTools

### Build Failures
- Check Vercel build logs
- Verify all dependencies are in `package.json`
- Test build locally: `cd clients && pnpm run build --filter=web`

## Monorepo Considerations

Since this is a monorepo:
- Vercel needs to know the root directory (`clients/apps/web`)
- Build commands must navigate to the correct directory
- Shared packages in `clients/packages/` are automatically included
- Changes outside `clients/` won't trigger rebuilds (by design)

## Automatic Deployments

Vercel will automatically deploy:
- **Production**: Every push to `master` branch
- **Preview**: Every pull request

To disable auto-deploy for backend changes:
- The `vercel.json` includes `ignoreCommand` to only deploy when `clients/` changes

## Environment-Specific Builds

- **Production**: Uses `.env.production`
- **Preview**: Uses `.env` or Vercel environment variables
- **Development**: Uses `.env.local`

## Post-Deployment Checklist

- [ ] Frontend loads at https://blyss.co.ke
- [ ] API calls work (check Network tab)
- [ ] Login/signup works
- [ ] File uploads work
- [ ] Payments work (test mode)
- [ ] Analytics tracking works (PostHog)
- [ ] No console errors
- [ ] SSL certificate valid
- [ ] Mobile responsive

## Updating the Deployment

To deploy updates:
```bash
git add -A
git commit -m "Update frontend"
git push
```

Vercel will automatically build and deploy.

## Manual Deployment

If you need to manually trigger a deployment:
1. Go to Vercel dashboard
2. Select your project
3. Click "Deployments"
4. Click "Redeploy" on the latest deployment

## Cost

Vercel Free Tier includes:
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Preview deployments
- Analytics

This should be sufficient for initial launch. Upgrade to Pro ($20/month) if you need more bandwidth.
