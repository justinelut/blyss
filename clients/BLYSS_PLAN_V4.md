# Blyss Transformation Plan V4 - Updated After Setup

## What We've Accomplished So Far ✅

### Environment Setup (DONE)

- ✅ Backend API running on http://127.0.0.1:8000
- ✅ Frontend running on http://localhost:3000
- ✅ Neon PostgreSQL connected (managed, SSL enabled)
- ✅ Upstash Redis connected (managed, SSL enabled)
- ✅ Cloudflare R2 configured for file storage
- ✅ Google OAuth working for login
- ✅ Database migrations completed (300+ tables)
- ✅ Admin access granted (justinequartz@gmail.com)
- ✅ Backoffice built and styled (http://127.0.0.1:8000/backoffice)
- ✅ Windows compatibility fixes (fcntl, Redis SSL, PostgreSQL SSL)
- ✅ CSP updated to allow R2 uploads
- ✅ Developer integration page removed from onboarding

### Key Learnings

**1. No MinIO/Docker Needed**

- Your laptop (2 cores, 8GB RAM) can't handle Docker
- Using managed services instead: Neon (PostgreSQL), Upstash (Redis), Cloudflare R2
- This is actually BETTER for production too!

**2. Platform Fee Already Exists**

- Config: `PLATFORM_FEE_BASIS_POINTS=400` (4%)
- Just change to `2000` (20%)
- Database column `Order.platform_fee_amount` already exists
- No new code needed!

**3. Backoffice is Powerful**

- Built with Python (Tagflow), Tailwind CSS, DaisyUI, HTMX
- Manages: Users, Organizations, Products, Orders, Payouts, Subscriptions
- Has impersonation feature (log in as any user)
- Perfect for managing Blyss platform

**4. Onboarding Flow**

- Original: org → product → integrate (developer stuff)
- Fixed: org → product → dashboard (skip integration)
- Creators now go straight to dashboard after creating first product

**5. File Uploads**

- R2 needs CORS configuration (done)
- CSP needs R2 endpoint whitelisted (done)
- Files upload directly from browser to R2
- Backend generates presigned URLs

---

## What We're Building - Updated Scope

### Phase 1: Paystack Integration (3 days)

**Goal**: Replace Stripe with Paystack, add M-Pesa payouts

**Backend Work:**

1. Create Paystack integration module (similar to `server/polar/integrations/stripe/`)
2. Implement payment initialization
3. Implement payment verification
4. Build webhook handler
5. Implement subaccounts for creators
6. Add M
   heckout.md` - Frontend checkout flow

- `spec-003-paystack-subaccounts.md` - Creator subaccounts
- `spec-004-mpesa-payouts.md` - M-Pesa configuration

---

### Phase 2: Shopping Cart (2 days)

**Goal**: Allow buying multiple digital products at once

**Backend Work:**

1. Create cart database tables
2. Build cart API endpoints (add, remove, list, clear)
3. Update checkout to handle multiple products
4. Add logic to prevent mixing one-time and recurring products

**Frontend Work:**

1. Build cart UI components
2. Add "Add to Cart" button for digital products
3. Keep "Buy Now" for subscriptions
4. Build cart page with item list and totals
5. Update product cards to show correct button

**Database Changes:**

```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Estimated Specs Needed**: 3 spec files

- `spec-005-cart-backend.md` - Cart API and database
- `spec-006-cart-frontend.md` - Cart UI components
- `spec-007-cart-checkout.md` - Multi-product checkout

---

### Phase 3: Creator Storefronts (2 days)

**Goal**: Public pages for creators to showcase their products

**What Exists:**

- Customer portal at `/[organization]/portal/` (PRIVATE - only for buyers)
- Product cards already exist and look great
- Organization profiles exist

**What We Build:**

1. **Creators Directory** (`/creators`)
   - List all creators with products
   - Grid layout with creator cards
   - Search and filter functionality
   - Click to go to creator storefront

2. **Creator Storefront** (`/creator/[slug]`)
   - Public page (no login required)
   - Left sidebar: Avatar, name, bio, social links
   - Tabs: Overview, Products, Subscriptions, Newsletter
   - Reuse existing product cards
   - Subscribe button, Donate button

**Frontend Work:**

1. Create `/creators` page
2. Create `/creator/[slug]` page
3. Build creator card component
4. Add tabs component
5. Make product cards public
6. Add creator bio/description field

**Backend Work:**

1. Add public API endpoint for listing creators
2. Add public API endpoint for creator profile
3. Add `bio` and `social_links` to Organization table
4. Update permissions to allow public access

**Estimated Specs Needed**: 3 spec files

- `spec-008-creators-directory.md` - List all creators
- `spec-009-creator-storefront.md` - Individual creator page
- `spec-010-creator-profile.md` - Bio and social links

---

### Phase 4: Marketplace Homepage (1 day)

**Goal**: Homepage showing all products from all creators

**What We Build:**

1. Homepage at `/` (when not logged in)
2. Grid of all products from all creators
3. Search functionality
4. Category filters
5. Featured products section
6. "Become a Creator" CTA

**Frontend Work:**

1. Create homepage component
2. Add search bar
3. Add category filters
4. Reuse product cards
5. Add hero section

**Backend Work:**

1. Public API endpoint for all products
2. Search functionality
3. Category filtering

**Estimated Specs Needed**: 2 spec files

- `spec-011-marketplace-homepage.md` - Homepage layout
- `spec-012-product-search.md` - Search and filters

---

### Phase 5: Hide Developer Features (1 day)

**Goal**: Remove/hide features meant for developers

**What to Hide:**

1. API tokens page
2. Webhooks page
3. GitHub integration
4. Sandbox mode toggle
5. Developer documentation links
6. "Integrate Checkout" onboarding (DONE ✅)

**What to Keep:**

1. Products management
2. Orders and customers
3. Subscriptions
4. Analytics
5. Settings
6. Payouts

**Frontend Work:**

1. Remove navigation items
2. Hide settings sections
3. Update onboarding flow (DONE ✅)
4. Remove developer-focused copy

**Estimated Specs Needed**: 1 spec file

- `spec-013-hide-developer-features.md` - UI cleanup

---

### Phase 6: Branding & Polish (1 day)

**Goal**: Rebrand from Polar to Blyss

**What to Change:**

1. Logo (replace Polar logo with Blyss)
2. Colors (if you have specific brand colors)
3. App name in all places
4. Email templates
5. Default currency to KES
6. Platform fee to 20%
7. Meta tags and SEO

**Frontend Work:**

1. Replace logo files
2. Update color variables
3. Update text content
4. Update email templates

**Backend Work:**

1. Change `PLATFORM_FEE_BASIS_POINTS` to 2000
2. Change default currency to KES
3. Update email sender name

**Estimated Specs Needed**: 2 spec files

- `spec-014-rebrand-blyss.md` - Logo, colors, text
- `spec-015-platform-config.md` - Fees, currency, settings

---

## Total Estimated Specs: 15 spec files

### Breakdown by Phase:

- Phase 1 (Paystack): 4 specs
- Phase 2 (Cart): 3 specs
- Phase 3 (Storefronts): 3 specs
- Phase 4 (Marketplace): 2 specs
- Phase 5 (Hide Dev Features): 1 spec
- Phase 6 (Branding): 2 specs

---

## Updated Timeline (10 days focused work)

### Days 1-3: Paystack Integration

- Implement Paystack payment flow
- Add subaccounts for creators
- Configure M-Pesa payouts
- Test with Paystack test keys

### Days 4-5: Shopping Cart

- Build cart backend and database
- Build cart UI
- Update checkout for multiple products
- Test cart flow

### Days 6-7: Creator Storefronts

- Build creators directory
- Build individual creator pages
- Add creator profiles
- Make everything public

### Day 8: Marketplace Homepage

- Build homepage
- Add search and filters
- Test discovery flow

### Day 9: Hide Developer Features & Branding

- Remove developer UI elements
- Rebrand to Blyss
- Update platform fee
- Change default currency

### Day 10: Testing & Deployment

- End-to-end testing
- Deploy to production
- Setup DNS
- Switch to live Paystack keys
- Send emails to 90+ signups

---

## What You Need to Provide

### Immediately:

1. ✅ Neon PostgreSQL URL (DONE)
2. ✅ Upstash Redis URL (DONE)
3. ✅ Google OAuth credentials (DONE)
4. ✅ Cloudflare R2 credentials (DONE)

### Within 24 Hours:

5. Paystack test keys (for development)
6. Paystack business account status
7. Blyss logo (PNG, SVG preferred)
8. Brand colors (hex codes) if you have them

### Within 48 Hours:

9. Paystack live keys (when approved)
10. Production domain (blyss.co.ke)
11. Hosting budget confirmation

---

## Key Technical Decisions Made

### 1. Managed Services (Not Self-Hosted)

- **PostgreSQL**: Neon (free tier, then paid)
- **Redis**: Upstash (free tier, then paid)
- **Storage**: Cloudflare R2 (pay as you go)
- **Hosting**: Oracle Cloud Free Tier for 1 month, then upgrade

**Why**: Your laptop can't handle Docker, and managed services are more reliable for production anyway.

### 2. Windows Compatibility

- Fixed `fcntl` module (Unix-only) with `msvcrt` wrapper
- Added SSL support for Neon PostgreSQL
- Added SSL support for Upstash Redis
- Fixed backoffice build scripts for Windows

### 3. No Docker Development

- Direct Python and Node.js installation
- Faster startup times
- Easier debugging
- Less resource usage

### 4. Cloudflare R2 for Storage

- S3-compatible API (Polar works out of the box)
- Cheaper than AWS S3
- No egress fees
- Fast global CDN

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  (http://localhost:3000 → https://blyss.co.ke)          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js Frontend (Port 3000)                │
│  - React components                                      │
│  - TanStack Query for data fetching                     │
│  - Tailwind CSS + shadcn/ui                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│           FastAPI Backend (Port 8000)                    │
│  - REST API endpoints                                    │
│  - Authentication & authorization                        │
│  - Business logic                                        │
│  - Paystack integration                                  │
└────┬────────┬────────┬────────┬────────────────────────┘
     │        │        │        │
     ▼        ▼        ▼        ▼
┌─────────┐ ┌──────┐ ┌──────┐ ┌─────────────┐
│  Neon   │ │Upstash│ │  R2  │ │  Paystack   │
│PostgreSQL│ │ Redis │ │Storage│ │     API     │
└─────────┘ └──────┘ └──────┘ └─────────────┘
```

---

## Risk Assessment

### Low Risk ✅

- Platform fee change (just config)
- Cart implementation (straightforward)
- Creator storefronts (UI work)
- Branding (copy/paste)

### Medium Risk ⚠️

- Paystack integration (new API to learn)
- Subaccounts setup (need to understand Paystack docs)
- M-Pesa payouts (testing required)

### High Risk 🔴

- Paystack business approval (could take weeks)
- Production hosting stability (Oracle free tier limits)
- File upload performance (R2 bandwidth)

### Mitigation:

- Start Paystack approval process NOW
- Have backup hosting plan (Render, Railway)
- Monitor R2 usage and costs
- Test everything thoroughly in development

---

## Success Metrics

### Week 1 (Development):

- All 15 specs completed
- Paystack test payments working
- Cart functional
- Creator storefronts live
- Marketplace homepage done

### Week 2 (Testing):

- End-to-end testing complete
- All bugs fixed
- Performance optimized
- Ready for production

### Week 3 (Launch):

- Deployed to production
- DNS configured
- Paystack live keys active
- First 10 creators onboarded
- First 10 sales completed

### Month 1 (Growth):

- 50+ active creators
- 100+ products listed
- 500+ customers
- KES 100,000+ in transactions
- Platform fee revenue: KES 20,000+

---

## Next Steps

1. **Review this plan** - Make sure you agree with the approach
2. **Provide Paystack keys** - So we can start integration
3. **Start spec generation** - I'll create detailed specs for each phase
4. **Begin Phase 1** - Paystack integration first
5. **Daily check-ins** - Keep momentum going

---

**Version**: 4.0
**Date**: March 16, 2025
**Status**: Ready to start Phase 1
**Environment**: ✅ Fully configured and running
**Total Specs**: 15 files across 6 phases
**Timeline**: 10 days focused work
**Risk Level**: Medium (Paystack approval is main blocker)

---

## Questions to Answer Before Starting

1. Do you have Paystack test keys ready?
2. Have you applied for Paystack business account?
3. Do you have the Blyss logo ready?
4. What are your brand colors (if any)?
5. When do you want to launch? (Target date)
6. Do you have a backup hosting plan if Oracle doesn't work?

Once you answer these, we can start generating specs and building!
