# Blyss Marketplace Frontend Implementation Spec

## Quick Summary for Spec Generator

**Task**: Convert 8 HTML marketplace designs to React/Next.js, UPDATE 4 existing pages + CREATE 4 new pages. Follow `blyss_design_brand/DESIGN.md` design system TO THE TOOTH. Integrate with FastAPI backend, support multi-currency pricing (KES default, USD, EUR, 20+ others). Reuse existing components 100%, only update styling. Maintain dark mode with `dark:` classes.

**Existing Pages to UPDATE**: `/cart`, `/wishlist`, `/product/[slug]`, `/[organization]`
**New Pages to CREATE**: `/` (homepage), `/products`, `/creators`, `/help`
**Design Files**: 8 HTML files in `marketplace-design-system/` + 1 master design doc
**Currency System**: Products have `price_amount` (cents) + `price_currency` (kes/usd/eur/etc), display with currency selector

---

## Overview

Convert 8 HTML design pages from `marketplace-design-system/` to fully functional React/Next.js pages in `blyss-web`, maintaining pixel-perfect design while integrating with existing FastAPI backend (`server/polar/`).

## CRITICAL: Update vs Create Strategy

**DO NOT create new pages if they already exist!** Check these existing routes first:

- ✅ `/cart` - EXISTS at `blyss-web/src/app/(main)/cart/page.tsx` - UPDATE ONLY
- ✅ `/wishlist` - EXISTS at `blyss-web/src/app/(main)/wishlist/page.tsx` - UPDATE ONLY
- ✅ `/product/[slug]` - EXISTS at `blyss-web/src/app/(main)/product/[slug]/page.tsx` - UPDATE ONLY
- ✅ `/[organization]` - EXISTS at `blyss-web/src/app/(main)/[organization]/` - UPDATE ONLY
- ❌ `/` (homepage) - CREATE NEW (currently no landing page)
- ❌ `/products` or `/explore` (browse) - CREATE NEW
- ❌ `/creators` - CREATE NEW
- ❌ `/help` - CREATE NEW

**For existing pages**: Import and use existing components, update styling to match new design system, maintain all current functionality.

## Multi-Currency Price System

**CRITICAL**: Products support multiple currencies with separate prices per currency. Backend uses `price_currency` field (default: `kes` for Kenya Shillings).

**Supported Currencies** (from `server/polar/product/schemas.py`):

- `kes` - Kenya Shillings (KSh) - DEFAULT, minimum 65 cents
- `usd` - US Dollars ($) - minimum 50 cents
- `eur` - Euros (€) - minimum 50 cents
- `gbp` - British Pounds (£) - minimum 30 cents
- Plus 20+ other currencies (inr, jpy, aud, cad, etc.)

**Price Display Requirements**:

1. Show prices in user's selected currency (default to KES for Kenyan marketplace)
2. Currency selector in header/settings
3. Format: `format_currency(amount, currency)` from backend
4. All prices stored in cents (divide by 100 for display)
5. Product can have multiple price points for different currencies
6. Example: Product A = KSh 1,200 (kes) OR $15 (usd) OR €12 (eur)

**API Integration**:

- `GET /v1/products` returns `price_amount` and `price_currency` per product
- Filter/sort by price respects selected currency
- Cart calculations use selected currency
- Checkout must specify currency

## Design System Requirements

**Reference Document**: `marketplace-design-system/blyss_design_brand/DESIGN.md` - FOLLOW TO THE TOOTH

- **Brand Colors**: 50+ Material Design 3 tokens (primary: #a73400, secondary: #006972, tertiary: #765700, surfaces: #fcf9f7 family)
- **Typography**: Epilogue (headlines), Inter (body/labels)
- **No Borders Rule**: Use tonal layering (surface → surface-container-low → surface-container-lowest) instead of 1px borders
- **Editorial Shadows**: `box-shadow: 0 12px 32px rgba(27, 28, 27, 0.06)` for floating elements
- **Spacing**: 4rem/5rem vertical padding between major sections
- **Dark Mode**: Use existing dark mode system (`dark:` Tailwind classes), maintain with new design tokens
- **Component Reuse**: Use existing UI components from `blyss-web/src/components/` 100% - only update styling, never recreate

## 8 Pages to Implement

### 1. Homepage (`blyss_homepage_with_subscriptions`)

**Route**: `/` (main landing)
**Backend APIs**:

- `GET /v1/products` (featured products grid)
- `GET /v1/subscriptions` (subscription tiers)
- `GET /v1/organizations` (trending creators)

**Components**:

- Hero section with asymmetric 7/5 grid, dual CTAs
- Category filter pills (Digital Art, Templates, E-books, Music, Subscriptions)
- Top Products: 4-column bento grid, 4:5 aspect ratio cards, hover animations
- Featured Subscriptions: 3-column cards with pricing, benefits list, "Join Circle" CTA
- Trending Creators: 2-column creator cards with follow buttons
- Social Proof: 3-column testimonials on primary background

### 2. Browse Marketplace (`blyss_browse_marketplace`)

**Route**: `/products` or `/explore`
**Backend APIs**:

- `GET /v1/products` with filters (category, price range, sort)
- `GET /v1/categories` (filter sidebar)

**Components**:

- Search bar in header (live search)
- Left sidebar: Category filters, price range slider, creator filter
- Main grid: Responsive product cards (1/2/3/4 columns based on viewport)
- Pagination or infinite scroll
- Sort dropdown (Newest, Popular, Price: Low-High, Price: High-Low)

### 3. Product Detail (`product_detail_savannah_mist`)

**Route**: `/product/[id]`
**Backend APIs**:

- `GET /v1/products/{id}` (product details)
- `POST /v1/cart/items` (add to cart)
- `POST /v1/wishlist/items` (add to wishlist)
- `GET /v1/products/{id}/reviews` (product reviews)

**Components**:

- Image gallery with thumbnails (5-6 images)
- Product info: title, creator link, price, description
- "Add to Cart" + "Add to Wishlist" buttons
- File details: format, size, license type
- Creator profile card (avatar, name, follow button)
- Related products carousel
- Reviews section with ratings

### 4. Creator Storefront (`blyss_creator_storefront`)

**Route**: `/[organization]` (organization slug)
**Backend APIs**:

- `GET /v1/organizations/{slug}` (creator profile)
- `GET /v1/products?organization_id={id}` (creator's products)
- `GET /v1/subscriptions?organization_id={id}` (creator's subscription tiers)
- `POST /v1/organizations/{id}/follow` (follow creator)

**Components**:

- Hero banner with creator avatar, cover image, bio
- Stats: Total products, followers, joined date
- Follow button
- Tabs: Products, Subscriptions, About
- Product grid (creator's products)
- Subscription tiers (if available)

### 5. Explore Creators (`blyss_explore_creators`)

**Route**: `/creators`
**Backend APIs**:

- `GET /v1/organizations` with filters (category, follower count, sort)

**Components**:

- Search bar for creators
- Filter chips: Category specialization (Digital Art, Music, Templates, etc.)
- Creator cards grid: Avatar, name, bio snippet, follower count, sample products
- Follow button on each card
- Sort: Popular, Newest, Most Products

### 6. Shopping Cart (`shopping_cart`)

**Route**: `/cart`
**Backend APIs**:

- `GET /v1/cart` (current cart)
- `PATCH /v1/cart/items/{id}` (update quantity)
- `DELETE /v1/cart/items/{id}` (remove item)
- `POST /v1/checkout` (proceed to checkout)

**Components**:

- Cart items list: Product image, name, creator, price, remove button
- Empty cart state with "Browse Products" CTA
- Subtotal, tax, total calculation
- "Proceed to Checkout" button
- Continue shopping link

### 7. Wishlist (`wishlist`)

**Route**: `/wishlist`
**Backend APIs**:

- `GET /v1/wishlist` (user's wishlist)
- `DELETE /v1/wishlist/items/{id}` (remove from wishlist)
- `POST /v1/cart/items` (move to cart)

**Components**:

- Wishlist items grid (similar to product browse)
- "Move to Cart" button on each item
- Remove from wishlist button
- Empty wishlist state
- Share wishlist functionality (optional)

### 8. Help/Community Center (`help_community_center`)

**Route**: `/help` or `/community`
**Backend APIs**:

- Static content (can use MDX or CMS)
- `GET /v1/newsletter/subscribe` (newsletter signup)

**Components**:

- FAQ accordion sections
- Search help articles
- Contact form
- Community guidelines
- Creator resources links
- Newsletter signup form

## Technical Requirements

### Authentication Integration

- Use existing auth system (`server/polar/auth/`)
- Protected routes: `/cart`, `/wishlist`, `/dashboard`
- Public routes: `/`, `/products`, `/product/[id]`, `/[organization]`, `/creators`, `/help`
- Auth modals: Login, signup (existing components)

### Data Fetching

- Use existing `@/lib/api` client (openapitop: Full multi-column layouts, persistent sidebars
- All hover states, transitions, animations from designs

### Performance

- Image optimization: Next.js Image component
- Lazy loading: Product grids, creator cards
- Code splitting: Route-based chunks
- Prefetching: Link hover prefetch

## Success Criteria

1. ✅ Pixel-perfect match to HTML designs (use design screenshots for comparison)
2. ✅ All API endpoints integrated and working
3. ✅ Full authentication flow (login, signup, protected routes)
4. ✅ Cart and wishlist functionality complete
5. ✅ Search and filters working with backend
6. ✅ Responsive on mobile, tablet, desktop
7. ✅ No console errors or warnings
8. ✅ Accessibility: ARIA labels, keyboard navigation, screen reader support
9. ✅ SEO: Meta tags, Open Graph, structured data
10. ✅ Loading states, error states, empty states for all components

## Implementation Order

1. **Setup Tailwind theme** with all brand colors from `blyss_design_brand/DESIGN.md`
2. **Update existing components** to use new design tokens (buttons, cards, inputs)
3. **Create shared layout** components (Header, Footer) - reuse existing where possible
4. **Homepage** (CREATE NEW) - most important for first impression
5. **Product Detail** (UPDATE EXISTING) - core conversion page
6. **Browse Marketplace** (CREATE NEW) - discovery
7. **Shopping Cart** (UPDATE EXISTING) - checkout flow
8. **Creator Storefront** (UPDATE EXISTING) - creator profiles
9. **Explore Creators** (CREATE NEW) - creator discovery
10. **Wishlist** (UPDATE EXISTING) - nice-to-have feature
11. **Help Center** (CREATE NEW) - support content

## Design Reference Files

Each page has HTML code in `marketplace-design-system/[page_name]/code.html`:

1. `blyss_homepage_with_subscriptions/code.html` - Homepage design
2. `blyss_browse_marketplace/code.html` - Browse/explore design
3. `product_detail_savannah_mist/code.html` - Product page design
4. `blyss_creator_storefront/code.html` - Creator profile design
5. `blyss_explore_creators/code.html` - Creators directory design
6. `shopping_cart/code.html` - Cart page design
7. `wishlist/code.html` - Wishlist page design
8. `help_community_center/code.html` - Help center design

**PLUS**: `blyss_design_brand/DESIGN.md` - Master design system document with all rules, colors, typography, spacing, do's and don'ts.

## Final Checklist

Before marking any page complete:

- [ ] Matches HTML design pixel-perfect (compare with screenshot)
- [ ] All colors from design system applied correctly
- [ ] Dark mode works using existing `dark:` classes
- [ ] Existing components reused 100% (no recreation)
- [ ] Multi-currency prices display correctly (KES default)
- [ ] All API endpoints integrated and tested
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console errors or warnings
- [ ] Accessibility: ARIA labels, keyboard nav
- [ ] Loading/error/empty states implemented
