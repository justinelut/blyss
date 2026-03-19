# Blyss Brand Assets Documentation

This document provides a comprehensive guide to the Blyss brand assets used throughout the platform, including their locations, usage guidelines, and configuration.

## Overview

The Blyss platform uses a consistent set of brand assets across all touchpoints:
- Web application (frontend)
- Email communications
- Social media sharing
- Browser interface elements

All brand assets are version-controlled and can be updated by replacing the files in their designated locations.

## Asset Locations

### Frontend Assets

Located in `clients/apps/web/public/`:

| Asset File | Purpose | Recommended Dimensions | Format |
|------------|---------|----------------------|--------|
| `blyss-logo.svg` | Main logo for light mode | Scalable | SVG |
| `blyss-logo-dark.svg` | Logo for dark mode | Scalable | SVG |
| `blyss-favicon.ico` | Browser favicon | 32x32, 16x16 (multi-size) | ICO |
| `blyss-og-image.png` | Social media Open Graph image | 1200x630px | PNG |

### Email Assets

Located in `server/emails/assets/`:

| Asset File | Purpose | Recommended Dimensions | Format |
|------------|---------|----------------------|--------|
| `blyss-logo-email.png` | Logo for email templates | 600px width | PNG |

## Environment Variable Configuration

### Backend Configuration

Configure brand-related settings in `server/.env`:

```bash
# Email Branding
EMAIL_FROM_NAME=Blyss
EMAIL_FROM_DOMAIN=notifications.blyss.co.ke
EMAIL_FROM_LOCAL=mail
EMAIL_DEFAULT_REPLY_TO_NAME=Blyss Support
EMAIL_DEFAULT_REPLY_TO_EMAIL_ADDRESS=support@blyss.co.ke

# Brand Assets
FAVICON_URL=/blyss-favicon.ico
THUMBNAIL_URL=/blyss-og-image.png

# Platform Configuration
PLATFORM_FEE_BASIS_POINTS=2000  # 20% platform fee
```

### Frontend Configuration

Configure brand-related settings in `clients/apps/web/.env.local`:

```bash
# Logo Assets
NEXT_PUBLIC_LOGO_URL=/blyss-logo.svg
NEXT_PUBLIC_LOGO_DARK_URL=/blyss-logo-dark.svg

# API Configuration
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Usage Guidelines

### Logo Usage

**Light Mode Logo** (`blyss-logo.svg`):
- Use on light backgrounds
- Primary logo for the application header
- Maintains brand consistency across the platform

**Dark Mode Logo** (`blyss-logo-dark.svg`):
- Use on dark backgrounds
- Automatically switches based on user theme preference
- Ensures visibility and brand recognition in dark mode

**Email Logo** (`blyss-logo-email.png`):
- PNG format for maximum email client compatibility
- Used in all transactional email templates
- Recommended width: 600px for optimal rendering

### Favicon

The favicon (`blyss-favicon.ico`) appears in:
- Browser tabs
- Bookmarks
- Browser history
- Mobile home screen shortcuts (when applicable)

Should contain multiple sizes (16x16, 32x32) for optimal display across devices.

### Social Media Image

The Open Graph image (`blyss-og-image.png`) is used when:
- Sharing links on social media platforms
- Previewing links in messaging apps
- Displaying rich previews in search results

**Specifications**:
- Dimensions: 1200x630px (Facebook/LinkedIn recommended)
- Format: PNG or JPG
- File size: Under 1MB for optimal loading
- Safe zone: Keep important content within center 1200x600px

## Updating Brand Assets

### Process for Updating Assets

1. **Prepare New Assets**:
   - Ensure assets meet the recommended dimensions and formats
   - Optimize file sizes for web performance
   - Test assets in both light and dark modes (where applicable)

2. **Replace Files**:
   - Frontend assets: Replace files in `clients/apps/web/public/`
   - Email assets: Replace files in `server/emails/assets/`
   - Maintain the same filenames to avoid breaking references

3. **Clear Caches**:
   - Browser cache may need clearing for favicon updates
   - CDN cache may need purging for production deployments
   - Email templates may need rebuilding

4. **Verify Changes**:
   - Test in multiple browsers
   - Test in light and dark modes
   - Send test emails to verify email logo rendering
   - Test social media sharing previews

### Version Control

All brand assets are tracked in Git:
- Changes are versioned and auditable
- Rollback is possible by reverting commits
- Asset history is preserved

## Component Integration

### Frontend Logo Component

The platform uses a centralized logo component that:
- Automatically selects the correct logo variant (light/dark)
- Provides fallback text if logo fails to load
- Handles error states gracefully

Example usage:
```typescript
<Logo variant="light" />  // Uses blyss-logo.svg
<Logo variant="dark" />   // Uses blyss-logo-dark.svg
```

### Email Template Integration

Email templates reference the logo via:
- Direct file path: `server/emails/assets/blyss-logo-email.png`
- Embedded in email HTML during rendering
- Fallback to text-based branding if image fails

### Metadata Integration

Social media metadata is configured in:
- Next.js layout files
- Meta tag components
- Open Graph tag generators

## Troubleshooting

### Logo Not Displaying

**Symptoms**: Logo appears as broken image or doesn't load

**Solutions**:
1. Verify file exists at the correct path
2. Check file permissions (should be readable)
3. Clear browser cache
4. Verify environment variables are set correctly
5. Check browser console for 404 errors

### Favicon Not Updating

**Symptoms**: Old favicon still appears after update

**Solutions**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh the page (Ctrl+Shift+R)
3. Close and reopen the browser
4. Check if favicon file was actually replaced
5. Verify FAVICON_URL environment variable

### Email Logo Not Rendering

**Symptoms**: Logo doesn't appear in emails

**Solutions**:
1. Verify PNG file exists in `server/emails/assets/`
2. Check email template references correct file path
3. Rebuild email templates: `uv run task emails`
4. Test with different email clients
5. Verify file size is under email client limits

### Social Media Preview Not Showing

**Symptoms**: Wrong or no image in social media previews

**Solutions**:
1. Verify og:image meta tag is set correctly
2. Check image dimensions (1200x630px recommended)
3. Verify image is publicly accessible
4. Use social media debugging tools:
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator
   - LinkedIn: https://www.linkedin.com/post-inspector/
5. Clear social media platform caches (may take 24-48 hours)

## Asset Specifications Reference

### Logo Specifications

**SVG Logos** (web):
- Format: SVG (Scalable Vector Graphics)
- Color mode: RGB
- Transparency: Supported
- Artboard: Trim to content
- Text: Convert to paths/outlines

**PNG Logo** (email):
- Format: PNG-24 with transparency
- Width: 600px (height proportional)
- Resolution: 72 DPI (web standard)
- Color mode: RGB
- Compression: Optimized for web

### Favicon Specifications

- Format: ICO (multi-size)
- Sizes included: 16x16, 32x32
- Color depth: 32-bit (with transparency)
- Alternative: PNG favicons (modern browsers)

### Open Graph Image Specifications

- Format: PNG or JPG
- Dimensions: 1200x630px (1.91:1 aspect ratio)
- File size: Under 1MB (under 300KB recommended)
- Color mode: RGB
- Resolution: 72 DPI

## Related Documentation

- [DEVELOPMENT.md](../DEVELOPMENT.md) - Development environment setup
- [Platform Rebrand Spec](../.kiro/specs/platform-rebrand/) - Complete rebrand specification
- Email template documentation: `server/emails/README.md`

## Support

For questions or issues related to brand assets:
- Check this documentation first
- Review the troubleshooting section
- Consult the platform rebrand specification
- Contact the development team

---

**Last Updated**: 2025
**Maintained By**: Blyss Development Team
