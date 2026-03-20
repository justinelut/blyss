# Blyss Homepage Conversion Plan

## Task Overview

Convert the HTML design from `marketplace-design-system/blyss_homepage_with_subscriptions/code.html` to React components in `blyss-web` with full ecommerce functionality while maintaining the exact design.

## Phase 1: Cleanup (CURRENT)

- [x] Remove cart from dashboard navigation
- [ ] Remove profile from dashboard (it's for creators dashboard only)

## Phase 2: Theming Setup

### 2.1 Create Tailwind Theme Configuration

- Extract all color tokens from the HTML design
- Create `tailwind.config.ts` with Blyss brand colors
- Set up font families (Epilogue for headlines, Inter for body)
- Configure border radius tokens

### 2.2 Brand Colors to Implement

```typescript
colors: {
  background: "#fcf9f7",
  "on-secondary-fixed": "#001f23",
  "surface-container-low": "#f6f3f1",
  "surface-bright": "#fcf9f7",
  "surface-container": "#f0edeb",
  "primary-fixed": "#ffdbcf",
  // ... (all 50+ color tokens from design)
}
```

## Phase 3: Component Structure

### 3.1 Layout Components

- `LandingHeader.tsx` - Fixed top navigation with backdrop blur
- `LandingFooter.tsx` - 4-column footer with brand info
- `LandingLayout.tsx` - Wrapper with header + footer

### 3.2 Homepage Sections (in order)

1. **HeroSection.tsx**
   - Asymmetric grid (7/5 columns)
   - Headline with italic accent
   - Dual CTA buttons
   - Overlapping image composition

2. **CategoriesSection.tsx**
   - Pill-shaped filter chips
   - Selected state with tertiary-fixed color
   - Horizontal scroll on mobile

3. **TopProductsGrid.tsx**
   - 4-column bento grid
   - Product cards with 4:5 aspect ratio
   - Hover scale animation
   - Favorite icon overlay
   - Price + CTA button

4. **FeaturedSubscriptionsSection.tsx**
   - 3-column subscription cards
   - Creator avatar + info
   - Feature list with check icons
   - Pricing display
   - "Join Circle" CTA

5. **TrendingCreatorsSection.tsx**
   - Asymmetric layout (1/3 text, 2/3 grid)
   - Creator cards with follow button
   - Hover shadow effect

6. **SocialProofSection.tsx**
   - Full-width primary background
   - 3-column testimonial grid
   - 5-star ratings
   - Border-left accent

## Phase 4: Integration with Existing System

### 4.1 Data Fetching

- Connect TopProductsGrid to actual products API
- Connect FeaturedSubscriptions to subscriptions API
- Connect TrendingCreators to organizations API

### 4.2 Navigation

- Link "Start Browsing" to `/products`
- Link "Join as Creator" to `/dashboard/create`
- Link product cards to `/products/[id]`
- Link creator cards to `/[organization]`

### 4.3 Authentication

- Cart icon should use existing `CartIcon` component
- Profile icon should use existing `PublicProfileDropdown`
- Maintain existing auth flow

## Phase 5: Responsive Design

- Mobile: Single column, stacked layout
- Tablet: 2-column grids
- Desktop: Full multi-column layouts as designed
- Maintain all hover states and transitions

## Design System Rules to Follow

1. **NO 1px borders** - Use background color shifts only
2. **Tonal layering** - surface → surface-container-low → surface-container-lowest
3. **Editorial shadows** - `box-shadow: 0 12px 32px rgba(27, 28, 27, 0.06)`
4. **Typography scale** - Minimum 2-step jump between header and body
5. **Asymmetrical margins** - Intentional offset for editorial feel
6. **Spacing scale** - Use 16 (4rem) or 20 (5rem) for major sections

## Files to Create

```
blyss-web/src/
├── app/(main)/(landing)/
│   └── page.tsx (new homepage)
├── components/Landing/
│   ├── LandingHeader.tsx
│   ├── LandingFooter.tsx
│   ├── HeroSection.tsx
│   ├── CategoriesSection.tsx
│   ├── TopProductsGrid.tsx
│   ├── ProductCard.tsx
│   ├── FeaturedSubscriptionsSection.tsx
│   ├── SubscriptionCard.tsx
│   ├── TrendingCreatorsSection.tsx
│   ├── CreatorCard.tsx
│   └── SocialProofSection.tsx
└── styles/
    └── editorial.css (custom shadows and effects)
```

## Success Criteria

- [ ] Design matches HTML pixel-perfect
- [ ] All animations and transitions work
- [ ] Fully responsive on all breakpoints
- [ ] Connected to real data from API
- [ ] All links navigate correctly
- [ ] Cart and auth functionality integrated
- [ ] No console errors or warnings
- [ ] Passes accessibility checks
