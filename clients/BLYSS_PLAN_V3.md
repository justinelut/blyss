# Blyss Transformation Plan V3 - Human Readable

## What We're Actually Doing

### No Docker
We're skipping Docker completely. We'll install PostgreSQL and Redis directly on your Windows machine. Faster, simpler, easier to debug.

### Only Server + Web Client
Just the backend API and the Next.js frontend. Nothing else. No extra services, no complications.

### Storage: Cloudflare R2
Using Cloudflare R2 for file storage (it's S3-compatible, so Polar will work with it out of the box).

---

## Creator Storefronts - What Exists vs What We Build

### What Polar Already Has
Polar has a "customer portal" at `/[organization]/portal/` but this is PRIVATE - only for people who bought something. It shows their orders, subscriptions, etc.

There's NO public creator storefront yet.

### What We Need to Build
Two new pages:

**1. Creators Directory** (`/creators`)
- Shows all creators who have products
- Grid of creator cards with avatar, name, how many products they have
- Click a creator to go to their storefront

**2. Individual Creator Storefront** (`/creator/[organization-slug]`)
- Left sidebar: Creator avatar, name, bio, Subscribe button, Donate button
- Top tabs: Overview, Products, Subscriptions, Newsletter
- Main area: Grid of their products using the same beautiful cards Polar already has

Based on your screenshot (the polardemo page), Polar definitely has those product cards already. We just need to make them public and create the creator pages.

---

## Platform Fee - Already Built!

This is HUGE: Polar already has platform fee infrastructure!

**What exists:**
- A column in the database called `platform_fee_amount`
- Code that automatically calculates fees when orders are created
- Currently set to 4% + 40 cents

**What we do:**
- Change one config file to make it 20% instead of 4%
- Remove the 40 cents fixed fee
- That's it!

No new database tables, no new code. Just change the config.

**How it works:**
- Customer pays 1,000 KES
- System automatically calculates: 1,000 × 20% = 200 KES
- Stores this in the order
- When we integrate Paystack subaccounts, the money splits automatically

---

## Shopping Cart - Only for Digital Products

**The Rule:**
- One-time digital products (ebooks, templates, courses you buy once) → Can add to cart
- Subscriptions (monthly/yearly recurring) → Go straight to checkout, no cart

**Why:**
You can't mix one-time and recurring purchases in the same transaction. Payment processors don't allow it. So we need to be smart about when to show "Add to Cart" vs "Buy Now".

**How it looks:**
- Digital product card: Shows "Add to Cart" button
- Subscription product card: Shows "Buy Now" button
- Cart page: Shows all items, total, checkout button
- Checkout: Works with multiple products from cart

---

## Local Development Setup (No Docker)

### What You Need to Install

**PostgreSQL**
- The database where everything is stored
- Download for Windows, install with default settings
- Remember the password you set
- It runs on port 5432

**Redis**
- Used for caching and background jobs
- Download for Windows, extract, run the exe file
- It runs on port 6379

**Cloudflare R2**
- For storing uploaded files (product images, digital downloads)
- Create a bucket in Cloudflare dashboard
- Get access keys
- Polar will treat it like Amazon S3

**Stripe Test Keys (Temporary)**
- Just to get Polar running initially
- We'll replace with Paystack later
- Get from Stripe dashboard

### The Setup Process

**Step 1: Database**
- Install PostgreSQL
- Create a new database called "polar"
- Note down the connection details

**Step 2: Backend**
- Go to server folder
- Install Python dependencies
- Create environment file with database connection
- Run database migrations (creates all the tables)
- Start the API server

**Step 3: Frontend**
- Go to clients folder
- Install Node dependencies
- Create environment file with API URL
- Start the web server

**Step 4: Test**
- Open browser to localhost:3000
- Create a test account
- Explore the UI
- See how products, checkout, everything works

---

## Development Timeline

### Day 1: Get It Running (6 hours)
- Install PostgreSQL and Redis on your machine
- Setup the backend with database connection
- Setup the frontend
- Get Polar running locally
- Create test account and explore
- Find the product card components
- Understand how creator pages should work

### Day 2: Paystack Integration Basics (10 hours)
- Create the Paystack integration module
- Build the service that talks to Paystack API
- Implement payment initialization (when customer clicks pay)
- Implement payment verification (checking if payment succeeded)
- Build webhook handler (Paystack notifies us of payment status)
- Test with Paystack test keys

### Day 3: Subaccounts + M-Pesa + Platform Fee (10 hours)
- Implement Paystack subaccounts (each creator gets one)
- Build UI for creators to add M-Pesa number
- Add the KES 10 verification fee
- Change platform fee from 4% to 20%
- Test the 80/20 money split
- Verify everything is stored correctly

### Day 4: Shopping Cart (10 hours)
- Create cart database tables
- Build backend API for cart (add, remove, view items)
- Build cart UI components
- Add logic to show "Add to Cart" for digital products only
- Add logic to show "Buy Now" for subscriptions
- Build cart page
- Connect cart to checkout

### Day 5: Creator Storefronts (10 hours)
- Build the creators directory page (list all creators)
- Build individual creator storefront page
- Add tabs for Overview, Products, Subscriptions
- Reuse existing product cards
- Make everything public (no login required)
- Test creator pages

### Day 6: Marketplace + Cleanup (10 hours)
- Build marketplace homepage (all products from all creators)
- Add search functionality
- Add category filters
- Hide developer features (API tokens, webhooks, GitHub stuff)
- Change default currency to KES
- Rebrand to Blyss (logo, colors, text)
- Update email templates

### Day 7: Deploy (8 hours)
- Setup production database
- Deploy backend to hosting service
- Deploy frontend to Vercel
- Setup DNS for api.blyss.co.ke and blyss.co.ke
- Switch to Paystack live keys
- Test everything end-to-end
- Send welcome emails to your 90 signups

---

## Key Discoveries That Make This Easier

### Platform Fee Already Exists
We don't need to build this from scratch. Just change a config value. Saves us probably 8 hours of work.

### Product Cards Already Exist
Polar has beautiful product cards (we saw them in your screenshot). We just reuse them. No design work needed.

### Checkout Already Works
The checkout flow is solid. We just swap Stripe for Paystack under the hood. The UI stays the same.

### Database Schema is Solid
All the tables we need exist. We only add cart tables. Everything else is already there.

---

## What Makes This Harder

### Creator Storefronts Don't Exist
Polar only has a customer portal (private). We need to build public creator pages from scratch. But we can copy the layout from their demo page.

### Cart is Completely New
No cart exists in Polar. It's single-product checkout only. We're adding multi-product cart functionality.

### Paystack Subaccounts
This is a new concept. We need to understand how they work and integrate them properly. But Paystack documentation is good.

---

## What You Need to Provide

### To Start Today:
1. Confirmation you're ready
2. I'll guide you through installing PostgreSQL
3. I'll guide you through installing Redis
4. Stripe test keys (just to get it running)

### Within 24 Hours:
5. Paystack test keys
6. Cloudflare R2 bucket and access keys
7. Paystack business account status

### Within 48 Hours:
8. Blyss logo (PNG file)
9. Brand colors (if you have specific ones)
10. Hosting budget confirmation

---

## The Big Picture

**What we're doing:**
Taking Polar (a developer payment platform) and transforming it into Blyss (a creator marketplace for Kenya).

**What stays the same:**
- The entire UI design and components
- The checkout flow
- The product management system
- The subscription system
- The pricing tiers

**What we change:**
- Replace Stripe with Paystack
- Add M-Pesa payouts
- Change platform fee to 20%
- Add shopping cart
- Build public creator storefronts
- Build marketplace homepage
- Hide developer features
- Rebrand to Blyss

**What we add:**
- Paystack subaccounts for automatic money splitting
- Cart for buying multiple products at once
- Public creator pages
- Marketplace directory

**Timeline:**
7 days of focused work to get it live.

**Risk:**
Biggest risk is Paystack approval delay. Everything else is manageable.

---

## When You're Ready

Just tell me "let's start" and I'll guide you through:
1. Installing PostgreSQL on Windows
2. Installing Redis on Windows
3. Setting up Cloudflare R2
4. Getting Polar running locally
5. Exploring what exists
6. Then we start building

No rush. When you're ready, I'm ready.

---

**Version**: 3.0
**Date**: March 16, 2025
**Status**: Waiting for your go-ahead
**Approach**: No Docker, Server + Web only, Human readable
