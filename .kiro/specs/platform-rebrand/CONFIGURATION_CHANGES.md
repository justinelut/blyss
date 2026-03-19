# Platform Rebrand Configuration Changes

## Overview

This document lists all configuration changes made during the Polar → Blyss rebrand. These changes are reversible through environment variable modifications, allowing for easy rollback if needed.

## Modified Environment Variables

### Backend Configuration (server/.env)

#### Platform Fee Configuration

**Variable:** `POLAR_PLATFORM_FEE_BASIS_POINTS`

- **Original Value:** `400` (4%)
- **New Value:** `2000` (20%)
- **Purpose:** Sets the platform commission on all transactions
- **Location:** `server/polar/config.py`
- **Validation:** Must be non-negative and ≤ 10000 (100%)
- **Rollback:** Set to `400` to restore 4% fee

#### Email Sender Configuration

**Variable:** `POLAR_EMAIL_FROM_NAME`

- **Original Value:** `"Polar"`
- **New Value:** `"Blyss"`
- **Purpose:** Sets the sender name for all platform emails
- **Location:** `server/polar/config.py`
- **Validation:** Must be non-empty string
- **Rollback:** Set to `"Polar"` to restore original sender name

**Variable:** `POLAR_EMAIL_FROM_DOMAIN`

- **Original Value:** `"notifications.polar.sh"`
- **New Value:** `"notifications.blyss.co.ke"`
- **Purpose:** Sets the email domain for sender addresses
- **Location:** `server/polar/config.py`
- **Rollback:** Set to `"notifications.polar.sh"` to restore original domain

**Variable:** `POLAR_EMAIL_DEFAULT_REPLY_TO_NAME`

- **Original Value:** `"Polar Support"`
- **New Value:** `"Blyss Support"`
- **Purpose:** Sets the reply-to name for platform emails
- **Location:** `server/polar/config.py`
- **Rollback:** Set to `"Polar Support"` to restore original name

**Variable:** `POLAR_EMAIL_DEFAULT_REPLY_TO_EMAIL_ADDRESS`

- **Original Value:** `"support@polar.sh"`
- **New Value:** `"support@blyss.co.ke"`
- **Purpose:** Sets the reply-to email address
- **Location:** `server/polar/config.py`
- **Rollback:** Set to `"support@polar.sh"` to restore original address

#### Currency Configuration

**Variable:** `POLAR_DEFAULT_CURRENCY`

- **Original Value:** `"usd"` (implicit default)
- **New Value:** `"kes"` (Kenyan Shillings)
- **Purpose:** Sets the default currency for product creation and display
- **Location:** `server/polar/config.py`
- **Rollback:** Set to `"usd"` to restore USD as default

#### Stripe Configuration

**Variable:** `POLAR_STRIPE_STATEMENT_DESCRIPTOR`

- **Original Value:** `"POLAR"`
- **New Value:** `"POLAR"` (unchanged - kept for backward compatibility)
- **Purpose:** Sets the descriptor shown on customer credit card statements
- **Location:** `server/polar/config.py`
- **Note:** Not changed to avoid confusion with existing transactions

### Frontend Configuration (clients/apps/web/.env)

#### Metadata Configuration

**Variable:** `NEXT_PUBLIC_SITE_NAME`

- **Original Value:** `"Polar"`
- **New Value:** `"Blyss"`
- **Purpose:** Sets the site name for metadata and SEO
- **Rollback:** Set to `"Polar"` to restore original name

**Variable:** `NEXT_PUBLIC_SITE_DESCRIPTION`

- **Original Value:** `"Polar - Creator monetization platform"`
- **New Value:** `"Blyss - Marketplace for Kenyan Creators"`
- **Purpose:** Sets the site description for metadata and SEO
- **Rollback:** Set to original description

#### Asset URLs

**Variable:** `POLAR_FAVICON_URL`

- **Original Value:** `"https://raw.githubusercontent.com/polarsource/polar/2648cf7472b5128704a097cd1eb3ae5f1dd847e5/docs/docs/assets/favicon.png"`
- **New Value:** `"/blyss-favicon.ico"` (local asset)
- **Purpose:** Sets the favicon URL for browser tabs
- **Location:** `server/polar/config.py`
- **Rollback:** Set to original GitHub URL

**Variable:** `POLAR_THUMBNAIL_URL`

- **Original Value:** `"https://raw.githubusercontent.com/polarsource/polar/4fd899222e200ca70982f437039f549b7a822ecc/clients/apps/web/public/email-logo-dark.png"`
- **New Value:** `"/blyss-og-image.png"` (local asset)
- **Purpose:** Sets the Open Graph image for social media sharing
- **Location:** `server/polar/config.py`
- **Rollback:** Set to original GitHub URL

## Code Configuration Changes

### Feature Flags (Frontend)

**Location:** `clients/apps/web/src/components/Dashboard/navigation.tsx`

```typescript
const FEATURES = {
  developerTools: false,      // Original: true (or no flag)
  webhooks: false,            // Original: true (or no flag)
  githubIntegration: false,   // Original: true (or no flag)
}
```

**Purpose:** Controls visibility of developer-focused features in navigation

**Rollback:** Set all flags to `true` to restore developer features

### Navigation Routes (Frontend)

**Location:** `clients/apps/web/src/components/Dashboard/navigation.tsx`

**Changes:**
- Removed "Developer" route from `accountRoutesList()`
- Removed "Webhooks" sub-route from organization settings
- Removed "GitHub Integration" links from navigation

**Rollback:** Re-add removed routes to navigation configuration

### Currency Formatting (Frontend)

**Location:** `clients/apps/web/src/utils/currency.ts` (or similar)

**Changes:**
- Default currency parameter changed from `"USD"` to `"KES"`
- Locale changed from `"en-US"` to `"en-KE"`

**Rollback:** Change default back to USD and en-US locale

## Validation Functions

### Platform Fee Validation

**Location:** `server/polar/config.py`

```python
def validate_platform_fee_config(self) -> None:
    """Validate that platform fee configuration is within acceptable range."""
    if self.PLATFORM_FEE_BASIS_POINTS < 0:
        raise ValueError(
            f"PLATFORM_FEE_BASIS_POINTS must be non-negative, got {self.PLATFORM_FEE_BASIS_POINTS}"
        )

    if self.PLATFORM_FEE_BASIS_POINTS > 10000:
        raise ValueError(
            f"PLATFORM_FEE_BASIS_POINTS cannot exceed 10000 (100%), got {self.PLATFORM_FEE_BASIS_POINTS}"
        )
```

### Rebrand Configuration Validation

**Location:** `server/polar/config.py`

```python
def validate_rebrand_config(self) -> None:
    """Validate rebrand-specific configuration at startup."""
    if self.PLATFORM_FEE_BASIS_POINTS < 0:
        raise ValueError(
            f"PLATFORM_FEE_BASIS_POINTS must be non-negative, got {self.PLATFORM_FEE_BASIS_POINTS}"
        )

    if not self.EMAIL_FROM_NAME:
        raise ValueError("EMAIL_FROM_NAME is required for email branding")
```

## Deployment Configuration

### Environment Variable Checklist

Before deploying the rebrand, ensure these environment variables are set:

**Required:**
- [ ] `POLAR_PLATFORM_FEE_BASIS_POINTS=2000`
- [ ] `POLAR_EMAIL_FROM_NAME="Blyss"`
- [ ] `POLAR_EMAIL_FROM_DOMAIN="notifications.blyss.co.ke"`
- [ ] `POLAR_DEFAULT_CURRENCY="kes"`

**Optional (for complete rebrand):**
- [ ] `POLAR_EMAIL_DEFAULT_REPLY_TO_NAME="Blyss Support"`
- [ ] `POLAR_EMAIL_DEFAULT_REPLY_TO_EMAIL_ADDRESS="support@blyss.co.ke"`
- [ ] `POLAR_FAVICON_URL="/blyss-favicon.ico"`
- [ ] `POLAR_THUMBNAIL_URL="/blyss-og-image.png"`
- [ ] `NEXT_PUBLIC_SITE_NAME="Blyss"`
- [ ] `NEXT_PUBLIC_SITE_DESCRIPTION="Blyss - Marketplace for Kenyan Creators"`

### Rollback Procedure

To rollback the rebrand to Polar:

1. **Update environment variables:**
   ```bash
   POLAR_PLATFORM_FEE_BASIS_POINTS=400
   POLAR_EMAIL_FROM_NAME="Polar"
   POLAR_EMAIL_FROM_DOMAIN="notifications.polar.sh"
   POLAR_DEFAULT_CURRENCY="usd"
   POLAR_EMAIL_DEFAULT_REPLY_TO_NAME="Polar Support"
   POLAR_EMAIL_DEFAULT_REPLY_TO_EMAIL_ADDRESS="support@polar.sh"
   ```

2. **Revert code changes:**
   - Restore navigation routes (add back Developer, Webhooks, GitHub Integration)
   - Set feature flags to `true`
   - Change currency formatting defaults back to USD

3. **Restart services:**
   ```bash
   # Backend
   cd server
   uv run task api
   uv run task worker

   # Frontend
   cd clients
   pnpm run dev
   ```

4. **Verify rollback:**
   - Check that "Polar" branding appears throughout the platform
   - Verify platform fee is 4%
   - Verify default currency is USD
   - Verify developer features are visible

## Configuration Testing

### Startup Validation

The application validates configuration at startup through:

1. `validate_platform_fee_config()` - Ensures fee is valid
2. `validate_rebrand_config()` - Ensures required rebrand config is set
3. `validate_paystack_config()` - Ensures Paystack config is complete (if used)

### Runtime Validation

Configuration is validated at runtime through:

1. Fee calculation validation (ensures fees are non-negative and ≤ transaction amount)
2. Currency formatting error handling (falls back to raw display if formatting fails)
3. Asset loading error handling (shows text fallback if logo fails to load)

## Notes

- All configuration changes are reversible through environment variables
- No database migrations are required for the rebrand
- Existing data (users, products, transactions) remains compatible
- Feature hiding (not removal) allows potential re-enabling of developer features
- Configuration validation prevents invalid values at startup and runtime

## Related Documentation

- [Brand Asset Locations](./BRAND_ASSETS.md) - Documentation of all brand asset file paths
- [Requirements Document](./requirements.md) - Original requirements for the rebrand
- [Design Document](./design.md) - Technical design and architecture
- [Tasks Document](./tasks.md) - Implementation task list
