# Landing Pages Redesign Spec

## Overview

Redesign all landing pages to create an Etsy-like marketplace experience while maintaining our branding and using our existing components and functionality. The landing pages should showcase products, creators, and marketplace features in an engaging, visually appealing way.

## Goals

- Transform the landing experience into a marketplace-first design
- Showcase products prominently like Etsy does
- Maintain brand consistency with existing design system
- Use existing components from `@polar-sh/ui` and custom components
- Ensure all pages are performant and SEO-optimized
- Create a cohesive user journey from landing to purchase

## Design Principles

1. **Marketplace-First**: Products and creators are the hero content
2. **Visual Discovery**: Large, beautiful product images and cards
3. **Easy Navigation**: Clear categories, search, and filtering
4. **Trust Signals**: Reviews, ratings, creator profiles
5. **Brand Consistency**: Use existing color palette, typography, and components
6. **Performance**: Optimized images, lazy loading, static generation where possible

## Pages to Redesign

### 1. Main Landing Page (`/`)

**Current State**: Generic landing page with company messaging

**Target State**: Etsy-like marketplace homepage

#### Requirements

- [ ] Hero section with marketplace tagline and search bar
- [ ] Featured products grid (8-12 products)
- [ ] Category showcase (6-8 main categories with images)
- [ ] Trending products section
- [ ] Featured creators section (4-6 creators with avatars and product counts)
- [ ] Trust indicators (total products, creators, reviews)
- [ ] Newsletter signup section
- [ ] Footer with marketplace links

#### Components Needed

- `ProductCard` - Display product with image, title, price, rating
- `CategoryCard` - Display category with image and product count
- `CreatorCard` - Display creator with avatar, name, and stats
- `SearchBar` - Prominent search with autocomplete
- `TrustBadges` - Display marketplace statistics
- `NewsletterSignup` - Email capture form

#### Data Requirements

- Fetch featured products (API: `/v1/products?featured=true&limit=12`)
- Fetch categories (API: `/v1/categories?limit=8`)
- Fetch trending products (API: `/v1/products?sort=trending&limit=8`)
- Fetch featured creators (API: `/v1/organizations?featured=true&limit=6`)
- Fetch marketplace stats (API: `/v1/analytics/marketplace/stats`)

---

### 2. Marketplace Page (`/marketplace`)

**Current State**: Basic marketplace listing

**Target State**: Full marketplace experience with filtering and search

#### Requirements

- [ ] Advanced search bar with filters
- [ ] Category sidebar/filter panel
- [ ] Product grid with infinite scroll or pagination
- [ ] Sort options (newest, popular, price, rating)
- [ ] Filter options (price range, category, creator, rating)
- [ ] Active filters display with clear buttons
- [ ] Empty state when no products match
- [ ] Loading states for async operations

#### Components Needed

- `MarketplaceFilters` - Sidebar with all filter options
- `ProductGrid` - Responsive grid of product cards
- `SortDropdown` - Sort options selector
- `ActiveFilters` - Display and clear active filters
- `PaginationControls` - Navigate through pages
- `EmptyState` - No results message

#### Data Requirements

- Fetch products with filters (API: `/v1/products?category={id}&min_price={min}&max_price={max}&sort={sort}`)
- Fetch categories for filter (API: `/v1/categories`)
- Fetch price range (API: `/v1/products/price-range`)

---

### 3. Company Page (`/company`)

**Current State**: Generic company information

**Target State**: Marketplace-focused company story

#### Requirements

- [ ] Hero section with company mission
- [ ] Marketplace statistics and growth
- [ ] Team section (if applicable)
- [ ] Timeline of marketplace milestones
- [ ] Values and principles
- [ ] Press mentions (if any)
- [ ] Contact information

#### Components Needed

- `StatsGrid` - Display key metrics
- `Timeline` - Visual timeline of milestones
- `TeamGrid` - Team member cards
- `ValueCard` - Display company values

---

### 4. Blog Page (`/blog`)

**Current State**: Blog listing

**Target State**: Marketplace-focused blog with categories

#### Requirements

- [ ] Featured blog post hero
- [ ] Blog post grid with images
- [ ] Category filter (marketplace tips, creator stories, updates)
- [ ] Search functionality
- [ ] Pagination
- [ ] Related posts sidebar
- [ ] Newsletter signup CTA

#### Components Needed

- `BlogPostCard` - Display post with image, title, excerpt, date
- `BlogCategories` - Filter by category
- `FeaturedPost` - Large hero post card
- `RelatedPosts` - Sidebar with related content

---

### 5. Customers Page (`/customers`)

**Current State**: Generic customer testimonials

**Target State**: Creator success stories and testimonials

#### Requirements

- [ ] Hero section with customer/creator tagline
- [ ] Success story cards (creators who succeeded)
- [ ] Testimonial carousel
- [ ] Statistics (revenue generated, products sold)
- [ ] Case studies (3-4 detailed stories)
- [ ] CTA to become a creator

#### Components Needed

- `SuccessStoryCard` - Creator story with image and metrics
- `TestimonialCarousel` - Rotating testimonials
- `CaseStudy` - Detailed success story layout
- `CreatorCTA` - Call to action to join as creator

---

### 6. Downloads Page (`/downloads`)

**Current State**: Generic downloads page

**Target State**: Digital product showcase and download center

#### Requirements

- [ ] Hero section explaining digital products
- [ ] Featured downloadable products
- [ ] Categories of downloadable content
- [ ] Free vs paid products filter
- [ ] Download statistics
- [ ] How it works section
- [ ] Creator tools section

#### Components Needed

- `DownloadCard` - Product card with download icon
- `DownloadStats` - Display download metrics
- `HowItWorks` - Step-by-step guide
- `CreatorTools` - Tools for creating digital products

---

### 7. Features Page (`/features`)

**Current State**: Generic feature list

**Target State**: Marketplace features for buyers and sellers

#### Requirements

- [ ] Hero section with feature overview
- [ ] Buyer features section
  - [ ] Easy search and discovery
  - [ ] Secure payments
  - [ ] Reviews and ratings
  - [ ] Wishlist and cart
  - [ ] Download management
- [ ] Seller features section
  - [ ] Easy product upload
  - [ ] Analytics dashboard
  - [ ] Payment processing
  - [ ] Customer management
  - [ ] Marketing tools
- [ ] Feature comparison table (if applicable)
- [ ] CTA sections for buyers and sellers

#### Components Needed

- `FeatureCard` - Display feature with icon and description
- `FeatureSection` - Group related features
- `ComparisonTable` - Compare plans or features
- `FeatureCTA` - Call to action buttons

---

### 8. Resources Page (`/resources`)

**Current State**: Generic resources

**Target State**: Marketplace resources hub

#### Requirements

- [ ] Hero section with resource categories
- [ ] Resource categories
  - [ ] Guides and tutorials
  - [ ] API documentation
  - [ ] Creator handbook
  - [ ] Marketing resources
  - [ ] Legal and policies
- [ ] Search functionality
- [ ] Popular resources section
- [ ] Newsletter signup for updates
- [ ] Community links

#### Components Needed

- `ResourceCard` - Display resource with icon and link
- `ResourceCategory` - Group resources by category
- `PopularResources` - Highlight most accessed resources
- `CommunityLinks` - Links to Discord, forums, etc.

---

## Shared Components

### Navigation

- [ ] Update header navigation to include marketplace-focused links
- [ ] Add search bar to header (persistent across pages)
- [ ] Add cart icon with item count
- [ ] Add wishlist icon with item count
- [ ] User menu with creator dashboard link

### Footer

- [ ] Marketplace section (browse, categories, trending)
- [ ] Creators section (become a creator, creator resources)
- [ ] Company section (about, blog, careers)
- [ ] Support section (help center, contact, FAQ)
- [ ] Legal section (terms, privacy, cookies)
- [ ] Social media links
- [ ] Newsletter signup

### Common Elements

- [ ] Breadcrumbs for navigation
- [ ] Loading skeletons for async content
- [ ] Error boundaries for graceful failures
- [ ] Toast notifications for user actions
- [ ] Modal dialogs for quick actions

---

## Technical Requirements

### Performance

- [ ] Use Next.js Image component for all images
- [ ] Implement lazy loading for below-fold content
- [ ] Use static generation where possible
- [ ] Implement proper caching strategies
- [ ] Optimize bundle size (code splitting)
- [ ] Achieve Lighthouse score > 90

### SEO

- [ ] Proper meta tags for all pages
- [ ] Open Graph tags for social sharing
- [ ] Structured data (JSON-LD) for products
- [ ] Sitemap generation
- [ ] Robots.txt configuration
- [ ] Canonical URLs

### Accessibility

- [ ] ARIA labels for interactive elements
- [ ] Keyboard navigation support
- [ ] Focus management
- [ ] Color contrast compliance (WCAG AA)
- [ ] Screen reader testing
- [ ] Alt text for all images

### Responsive Design

- [ ] Mobile-first approach
- [ ] Breakpoints: mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
- [ ] Touch-friendly interactive elements
- [ ] Responsive images with srcset
- [ ] Adaptive layouts for different screen sizes

---

## Implementation Tasks

### Phase 1: Foundation (Week 1)

- [ ] Task 1.1: Create shared components library
  - [ ] ProductCard component
  - [ ] CategoryCard component
  - [ ] CreatorCard component
  - [ ] SearchBar component
  - [ ] FilterPanel component

- [ ] Task 1.2: Update navigation and footer
  - [ ] Header with marketplace links
  - [ ] Footer with marketplace sections
  - [ ] Mobile navigation menu

- [ ] Task 1.3: Set up API integration
  - [ ] Product fetching hooks
  - [ ] Category fetching hooks
  - [ ] Creator fetching hooks
  - [ ] Search and filter hooks

### Phase 2: Main Pages (Week 2)

- [ ] Task 2.1: Redesign main landing page (`/`)
  - [ ] Hero section with search
  - [ ] Featured products grid
  - [ ] Category showcase
  - [ ] Trending products
  - [ ] Featured creators
  - [ ] Trust indicators
  - [ ] Newsletter signup

- [ ] Task 2.2: Redesign marketplace page (`/marketplace`)
  - [ ] Advanced search and filters
  - [ ] Product grid with pagination
  - [ ] Sort and filter controls
  - [ ] Empty and loading states

### Phase 3: Content Pages (Week 3)

- [ ] Task 3.1: Redesign company page (`/company`)
  - [ ] Company story and mission
  - [ ] Statistics and milestones
  - [ ] Team section
  - [ ] Values and principles

- [ ] Task 3.2: Redesign blog page (`/blog`)
  - [ ] Featured post hero
  - [ ] Blog post grid
  - [ ] Category filtering
  - [ ] Search functionality

- [ ] Task 3.3: Redesign customers page (`/customers`)
  - [ ] Success stories
  - [ ] Testimonials
  - [ ] Case studies
  - [ ] Creator CTA

### Phase 4: Feature Pages (Week 4)

- [ ] Task 4.1: Redesign downloads page (`/downloads`)
  - [ ] Digital product showcase
  - [ ] Download categories
  - [ ] How it works section

- [ ] Task 4.2: Redesign features page (`/features`)
  - [ ] Buyer features section
  - [ ] Seller features section
  - [ ] Feature comparison

- [ ] Task 4.3: Redesign resources page (`/resources`)
  - [ ] Resource categories
  - [ ] Search functionality
  - [ ] Popular resources

### Phase 5: Polish and Optimization (Week 5)

- [ ] Task 5.1: Performance optimization
  - [ ] Image optimization
  - [ ] Code splitting
  - [ ] Caching strategies
  - [ ] Lighthouse audits

- [ ] Task 5.2: SEO optimization
  - [ ] Meta tags
  - [ ] Structured data
  - [ ] Sitemap
  - [ ] Open Graph tags

- [ ] Task 5.3: Accessibility audit
  - [ ] ARIA labels
  - [ ] Keyboard navigation
  - [ ] Screen reader testing
  - [ ] Color contrast

- [ ] Task 5.4: Responsive testing
  - [ ] Mobile testing
  - [ ] Tablet testing
  - [ ] Desktop testing
  - [ ] Cross-browser testing

---

## Design Assets Needed

### Images

- [ ] Hero images for each page
- [ ] Category images (8-10 categories)
- [ ] Product placeholder images
- [ ] Creator avatar placeholders
- [ ] Feature icons
- [ ] Illustration assets

### Icons

- [ ] Category icons
- [ ] Feature icons
- [ ] Navigation icons
- [ ] Action icons (cart, wishlist, search)

### Branding

- [ ] Logo variations
- [ ] Color palette
- [ ] Typography scale
- [ ] Spacing system
- [ ] Component library

---

## Success Metrics

### User Engagement

- [ ] Time on site > 3 minutes
- [ ] Pages per session > 3
- [ ] Bounce rate < 40%
- [ ] Return visitor rate > 30%

### Conversion

- [ ] Click-through rate to products > 15%
- [ ] Add to cart rate > 5%
- [ ] Newsletter signup rate > 3%
- [ ] Creator signup rate > 1%

### Performance

- [ ] Lighthouse performance score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1

### SEO

- [ ] Organic search traffic increase > 50%
- [ ] Keyword rankings improvement
- [ ] Backlink growth
- [ ] Social shares increase

---

## Dependencies

### External

- Next.js 16+ (already in use)
- React 19+ (already in use)
- TanStack Query (already in use)
- Tailwind CSS (already in use)
- @polar-sh/ui components (already in use)

### Internal

- Backend API endpoints for products, categories, creators
- Image CDN for product images
- Analytics integration
- Search functionality (Algolia or similar)

---

## Risks and Mitigation

### Risk 1: Performance with Large Product Catalogs

**Mitigation**: Implement pagination, infinite scroll, and proper caching

### Risk 2: Image Loading Performance

**Mitigation**: Use Next.js Image component, lazy loading, and CDN

### Risk 3: SEO Impact During Redesign

**Mitigation**: Implement proper redirects, maintain URL structure, use canonical tags

### Risk 4: User Confusion with New Layout

**Mitigation**: Gradual rollout, user testing, clear navigation, onboarding tooltips

---

## Notes

- All pages should use existing components from `@polar-sh/ui` where possible
- Maintain brand consistency with current design system
- Focus on marketplace functionality and product discovery
- Ensure mobile-first responsive design
- Implement proper error handling and loading states
- Use TypeScript for type safety
- Follow existing code patterns and conventions
- Do not modify any image files or image routes (text content only)
