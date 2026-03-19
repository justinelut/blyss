# Platform Rebrand Brand Asset Locations

## Overview

This document lists all brand asset file paths and their usage throughout the Blyss platform. All original Polar assets are maintained in version control for rollback purposes.

## Brand Asset Files

### Frontend Assets (clients/apps/web/public/)

#### Logo Files

**Primary Logo (Light Mode)**
- **Path:** `clients/apps/web/public/blyss-logo.svg`
- **Format:** SVG (vector)
- **Usage:** Main logo displayed in light mode UI
- **Dimensions:** Scalable vector
- **Used In:**
  - Application header
  - Navigation components
  - Landing pages
  - Dashboard
- **Component Reference:** `clients/apps/web/src/components/Brand/Logo.tsx`

**Dark Mode Logo**
- **Path:** `clients/apps/web/public/blyss-logo-dark.svg`
- **Format:** SVG (vector)
- **Usage:** Logo displayed in dark mode UI
- **Dimensions:** Scalable vector
- **Used In:**
  - Application header (dark mode)
  - Navigation components (dark mode)
  - Dashboard (dark mode)
- **Component Reference:** `clients/apps/web/src/components/Brand/Logo.tsx`

**Email Logo**
- **Path:** `clients/apps/web/public/blyss-logo-email.png`
- **Format:** PNG (raster)
- **Usage:** Logo for email templates (PNG for better email client compatibility)
- **Dimensions:** Optimized for email rendering
- **Used In:**
  - Email templates
  - Transactional emails
- **Component Reference:** `clients/apps/web/src/components/Brand/Logo.tsx`
- **Note:** Currently references external S3 URL in `server/emails/src/components/PolarHeader.tsx`

#### Favicon Files

**Primary Favicon**
- **Path:** `clients/apps/web/public/blyss-favicon.ico`
- **Format:** ICO (multi-resolution)
- **Usage:** Browser tab icon
- **Dimensions:** 16x16, 32x32, 48x48 (standard favicon sizes)
- **Used In:**
  - Browser tabs
  - Bookmarks
  - Browser history
- **HTML Reference:** `<link rel="icon" href="/blyss-favicon.ico" />`

#### Social Media / Open Graph Images

**Open Graph Image**
- **Path:** `clients/apps/web/public/blyss-og-image.png`
- **Format:** PNG (raster)
- **Usage:** Social media preview image (Facebook, LinkedIn, Twitter, etc.)
- **Dimensions:** 1200x630px (recommended Open Graph size)
- **Used In:**
  - Social media link previews
  - Open Graph meta tags
  - Twitter Card meta tags
- **Meta Tag References:**
  - `<meta property="og:image" content="https://polar.sh/blyss-og-image.png" />`
  - `<meta name="twitter:image" content="https://polar.sh/blyss-og-image.png" />`
- **Location in Code:** `clients/apps/web/src/app/layout.tsx`

### Backend Email Assets (server/emails/)

**Email Logo (External)**
- **Current URL:** `https://polar-public-assets.s3.us-east-2.amazonaws.com/emails/polar-logo-black-badge.png`
- **Status:** Needs to be updated to Blyss logo
- **Usage:** Logo displayed in email headers
- **Component:** `server/emails/src/components/PolarHeader.tsx`
- **Note:** This is an external S3 URL that needs to be replaced with Blyss logo

**Email Logo Assets (Local)**
- **Light Mode:** `clients/apps/web/public/email-logo.png`
- **Dark Mode:** `clients/apps/web/public/email-logo-dark.png`
- **Format:** PNG (raster)
- **Usage:** Alternative email logo assets
- **Note:** These may be used for email templates that support dark mode

## Component Usage Map

### Logo Component

**Location:** `clients/apps/web/src/components/Brand/Logo.tsx`

**Purpose:** Centralized logo component with variant support

**Variants:**
- `light` → `/blyss-logo.svg`
- `dark` → `/blyss-logo-dark.svg`
- `email` → `/blyss-logo-email.png`

**Error Handling:** Falls back to text "Blyss" if image fails to load

**Usage Example:**
```tsx
import Logo from '@/components/Brand/Logo'

// Light mode logo
<Logo variant="light" />

// Dark mode logo
<Logo variant="dark" />

// Email logo
<Logo variant="email" />
```

### Email Header Component

**Location:** `server/emails/src/components/PolarHeader.tsx`

**Current Logo Reference:**
```tsx
<Img
  alt="Blyss Logo"
  height="48"
  src="https://polar-public-assets.s3.us-east-2.amazonaws.com/emails/polar-logo-black-badge.png"
/>
```

**Status:** Alt text updated to "Blyss Logo", but image URL still points to Polar logo

**Action Required:** Update `src` attribute to point to Blyss logo URL

### Metadata Configuration

**Location:** `clients/apps/web/src/app/layout.tsx`

**Open Graph Configuration:**
```typescript
openGraph: {
  images: 'https://polar.sh/blyss-og-image.png',
  type: 'website',
  siteName: 'Blyss',
}
```

**Twitter Card Configuration:**
```typescript
twitter: {
  images: 'https://polar.sh/blyss-og-image.png',
  card: 'summary_large_image',
  title: 'Blyss | Marketplace for Kenyan Creators',
}
```

## Original Polar Assets (Maintained for Rollback)

### Preserved Assets

The following original Polar assets are maintained in version control for rollback purposes:

**Favicon Files:**
- `clients/apps/web/public/favicon.ico` - Original Polar favicon
- `clients/apps/web/public/favicon.png` - Original Polar favicon (PNG)
- `clients/apps/web/public/favicon-dark.png` - Original Polar dark mode favicon
- `clients/apps/web/public/favicon-dev.png` - Original Polar dev favicon
- `clients/apps/web/public/favicon-dev-dark.png` - Original Polar dev dark favicon

**Open Graph Images:**
- `clients/apps/web/public/og_logotype.png` - Original Polar logotype
- `clients/apps/web/public/og_thumbs_up.png` - Original Polar thumbs up image

**Email Logos:**
- `clients/apps/web/public/email-logo.png` - Original Polar email logo (light)
- `clients/apps/web/public/email-logo-dark.png` - Original Polar email logo (dark)

**External Assets:**
- S3 URL: `https://polar-public-assets.s3.us-east-2.amazonaws.com/emails/polar-logo-black-badge.png`

## Asset Loading and Error Handling

### Frontend Logo Component

**Error Handling Strategy:**
```tsx
const Logo = ({ variant = "light" }) => {
  const [error, setError] = useState(false)

  if (error) {
    return <span className="font-bold">Blyss</span>
  }

  return (
    <img
      src={getLogoUrl(variant)}
      alt="Blyss Logo"
      onError={() => setError(true)}
    />
  )
}
```

**Fallback Behavior:**
- If logo image fails to load, displays text "Blyss" instead
- Prevents broken image icons from appearing
- Maintains brand presence even if assets are unavailable

### Email Template Error Handling

**Current Behavior:**
- Email templates use external S3 URLs for logos
- No explicit error handling in email templates
- Email clients handle missing images differently

**Recommendation:**
- Upload Blyss logo to S3 bucket
- Update email template references
- Consider adding alt text for accessibility

## Asset Optimization

### File Sizes

**SVG Files (Vector):**
- `blyss-logo.svg` - Minimal file size (typically < 10KB)
- `blyss-logo-dark.svg` - Minimal file size (typically < 10KB)
- **Advantage:** Scalable without quality loss

**PNG Files (Raster):**
- `blyss-favicon.ico` - Multi-resolution (< 50KB)
- `blyss-og-image.png` - 1200x630px (< 200KB recommended)
- `blyss-logo-email.png` - Optimized for email (< 100KB)
- **Advantage:** Better compatibility with email clients and social media

### Performance Considerations

**Frontend Assets:**
- SVG logos are cached by browser
- Favicon is cached aggressively
- Open Graph images are cached by social media platforms

**Email Assets:**
- External S3 URLs are cached by email clients
- PNG format ensures compatibility across email clients
- Consider using CDN for faster loading

## Asset Deployment Checklist

### Pre-Deployment

- [ ] Verify all Blyss brand assets are present in `clients/apps/web/public/`
- [ ] Verify Logo component references correct asset paths
- [ ] Verify email templates reference correct logo URLs
- [ ] Verify metadata configuration uses correct Open Graph image
- [ ] Test logo loading in light and dark modes
- [ ] Test favicon display in multiple browsers
- [ ] Test Open Graph image preview on social media platforms

### Post-Deployment

- [ ] Verify logos display correctly on production
- [ ] Verify favicon appears in browser tabs
- [ ] Verify Open Graph images appear in social media previews
- [ ] Verify email templates display Blyss logo
- [ ] Test error handling (temporarily break asset URL to verify fallback)
- [ ] Clear CDN cache if using CDN
- [ ] Update social media platform caches (may take 24-48 hours)

## Rollback Procedure

### To Restore Polar Branding

1. **Update Logo Component:**
   ```tsx
   // In clients/apps/web/src/components/Brand/Logo.tsx
   const getLogoUrl = (variant: LogoVariant): string => {
     switch (variant) {
       case 'dark':
         return '/favicon-dark.png'  // Original Polar dark logo
       case 'email':
         return '/email-logo.png'    // Original Polar email logo
       case 'light':
       default:
         return '/favicon.png'       // Original Polar light logo
     }
   }
   ```

2. **Update Favicon Reference:**
   ```html
   <link rel="icon" href="/favicon.ico" />
   ```

3. **Update Open Graph Images:**
   ```typescript
   openGraph: {
     images: '/og_logotype.png',  // Original Polar OG image
   }
   ```

4. **Update Email Templates:**
   ```tsx
   <Img
     alt="Polar Logo"
     src="https://polar-public-assets.s3.us-east-2.amazonaws.com/emails/polar-logo-black-badge.png"
   />
   ```

5. **Clear Browser Caches:**
   - Users may need to hard refresh (Ctrl+F5) to see old logos
   - Favicon changes may require browser restart

## Testing and Validation

### Visual Testing

**Manual Checks:**
- [ ] Logo displays correctly in application header
- [ ] Logo switches correctly between light/dark modes
- [ ] Favicon appears in browser tab
- [ ] Open Graph image appears in social media link previews
- [ ] Email templates display logo correctly
- [ ] No broken image icons anywhere in the application

### Automated Testing

**Property Tests:**
- Image reference validity test (`clients/apps/web/src/__tests__/image-reference-validity.property.test.tsx`)
- Validates all brand asset paths exist
- Validates image URLs are accessible
- Validates alt text is descriptive

**Test Coverage:**
```typescript
// Logo references
const logoReferences = ['/blyss-logo.svg', '/blyss-logo-dark.svg']

// Favicon references
const faviconReferences = ['/blyss-favicon.ico']

// Open Graph image references
const ogImageReferences = ['/blyss-og-image.png']

// Required brand assets
const requiredAssets = [
  '/blyss-logo.svg',
  '/blyss-logo-dark.svg',
  '/blyss-favicon.ico',
  '/blyss-og-image.png',
]
```

## Notes

- All brand assets are version controlled in Git
- Original Polar assets are preserved for rollback
- Asset paths are centralized in Logo component for easy updates
- Error handling ensures graceful degradation if assets fail to load
- Social media platforms cache Open Graph images (may take 24-48 hours to update)
- Email client compatibility requires PNG format for logos

## Related Documentation

- [Configuration Changes](./CONFIGURATION_CHANGES.md) - Environment variable documentation
- [Requirements Document](./requirements.md) - Original requirements for the rebrand
- [Design Document](./design.md) - Technical design and architecture
- [Tasks Document](./tasks.md) - Implementation task list
