# Design Document: Platform Rebrand

## Overview

This design document outlines the technical approach for rebranding the Polar platform to Blyss. The rebrand encompasses visual identity changes (logos, colors, text), feature visibility adjustments (hiding developer-focused features), and platform configuration updates (fees, currency) to transform Polar into a marketplace platform optimized for the Kenyan market.

The rebrand is the final transformation step (5 of 5) in converting Polar into Blyss. This is a comprehensive change affecting frontend UI components, backend configuration, email templates, and metadata across the entire platform.

## CRITICAL IMPLEMENTATION GUIDELINES

**IMAGE HANDLING - DO NOT TOUCH:**
- **DO NOT modify, move, or change any image files or image routes**
- **DO NOT touch logo files, favicon files, or any images in public folders**
- **DO NOT update image references or paths in code**
- **DO NOT create or modify any image-related components that change image sources**
- The rebrand is for TEXT CONTENT ONLY - update text, configuration, and non-image elements
- User will replace all images manually after text rebrand is complete
- Focus on: text content, configuration values, metadata text, email text, navigation text

### Key Design Principles

1. **Minimal Code Changes**: Leverage configuration and environment variables where possible to enable easy reversibility
2. **Backward Compatibility**: Ensure existing data (users, products, transactions) continues to function without migration
3. **Feature Hiding vs Removal**: Hide developer features from UI rather than removing functionality entirely
4. **Centralized Configuration**: Use environment variables and configuration files for all rebrand parameters

## Architecture

### Component Overview

The rebrand touches four main architectural layers:

1. **Frontend Layer** (Next.js/React)
   - UI components (headers, navigation, logos)
   - Metadata and SEO tags
   - Client-side configuration

2. **Backend Layer** (FastAPI/Python)
   - Configuration management (`polar/config.py`)
   - Fee calculation logic
   - Currency handling

3. **Email Layer** (React Email)
   - Email templates
   - Email sender configuration
   - Brand assets in emails

4. **Asset Layer**
   - Logo files (SVG, PNG)
   - Favicon
   - Brand imagery for social media

### Configuration Strategy

The design uses a layered configuration approach:

```
Environment Variables (.env)
    ↓
Settings Class (config.py)
    ↓
Application Runtime
```

Key configuration variables:

- `PLATFORM_FEE_BASIS_POINTS`: Platform commission (2000 = 20%)
- `EMAIL_FROM_NAME`: Email sender name ("Blyss")
- `FAVICON_URL`: Browser favicon URL
- `THUMBNAIL_URL`: Social media thumbnail URL

## Components and Interfaces

### 1. Brand Asset Management

**Component**: `BrandAssets`

**Purpose**: Centralize all brand-related assets and references

**Structure**:

```
clients/apps/web/public/
  ├── blyss-logo.svg          # Main logo
  ├── blyss-logo-dark.svg     # Dark mode logo
  ├── blyss-favicon.ico       # Browser favicon
  └── blyss-og-image.png      # Social media image

server/emails/assets/
  └── blyss-logo-email.png    # Email logo
```

**Interface**:

- Logo components should accept `variant` prop: `"light" | "dark" | "email"`
- All logo references should use centralized constants

### 2. Navigation Configuration

**Component**: `NavigationConfig`

**Purpose**: Control which navigation items are visible based on platform mode

**Location**: `clients/apps/web/src/components/Dashboard/navigation.tsx`

**Changes Required**:

- Remove "Developer" route from `accountRoutesList()`
- Remove "Webhooks" sub-route from organization settings
- Add feature flag system for conditional route rendering

**Interface**:

```typescript
interface RouteConfig {
  id: string
  title: string
  link: string
  if: boolean // Visibility condition
  subs?: SubRoute[]
}

// Feature flags
const FEATURES = {
  developerTools: false, // Hide developer features
  webhooks: false, // Hide webhook configuration
  githubIntegration: false, // Hide GitHub integration
}
```

### 3. Platform Fee Configuration

**Component**: `PlatformFeeConfig`

**Purpose**: Configure and calculate platform fees

**Location**: `server/polar/config.py`

**Current State**:

```python
PLATFORM_FEE_BASIS_POINTS: int = 400  # 4%
PLATFORM_FEE_FIXED: int = 40
```

**Target State**:

```python
PLATFORM_FEE_BASIS_POINTS: int = 2000  # 20%
PLATFORM_FEE_FIXED: int = 40
```

**Interface**:

- Fee calculation functions must read from `settings.PLATFORM_FEE_BASIS_POINTS`
- No hardcoded fee percentages in business logic

### 4. Currency Configuration

**Component**: `CurrencyConfig`

**Purpose**: Set default currency and formatting

**Changes Required**:

- Update default currency from USD to KES
- Update currency formatting functions to handle KES
- Update product creation defaults

**Interface**:

```python
# Backend configuration
DEFAULT_CURRENCY: str = "kes"

# Frontend currency formatting
formatCurrency(amount: number, currency: string = "KES"): string
```

### 5. Email Template System

**Component**: `EmailTemplates`

**Purpose**: Rebrand all transactional emails

**Location**: `server/emails/src/`

**Changes Required**:

- Update `PolarHeader.tsx` to use Blyss logo
- Update email sender name in configuration
- Replace all "Polar" text with "Blyss" in templates

**Interface**:

```typescript
// Email header component
interface HeaderProps {
  logoUrl: string // Blyss logo URL
  altText: string // "Blyss Logo"
}

// Email configuration
EMAIL_FROM_NAME: 'Blyss'
EMAIL_FROM_DOMAIN: 'notifications.blyss.co.ke'
```

### 6. Metadata Management

**Component**: `MetadataConfig`

**Purpose**: Update SEO and social media metadata

**Location**: Frontend layout files and meta tag components

**Changes Required**:

- Update page titles to include "Blyss"
- Update meta descriptions
- Update Open Graph tags (og:title, og:description, og:image)
- Update Twitter Card tags

**Interface**:

```typescript
interface PageMetadata {
  title: string // "Blyss - Marketplace for Kenyan Creators"
  description: string // Platform description
  ogTitle: string
  ogDescription: string
  ogImage: string // Blyss brand image URL
}
```

## Data Models

No new data models are required. The rebrand is primarily a presentation and configuration change that works with existing data structures.

### Affected Existing Models

1. **Organization**: No schema changes, but display logic updated
2. **Product**: No schema changes, default currency updated
3. **Transaction**: No schema changes, fee calculation updated
4. **User**: No schema changes, UI presentation updated

### Migration Strategy

No database migrations required. All changes are:

- Configuration-based (environment variables)
- Presentation-based (UI components, templates)
- Calculation-based (using new fee configuration)

Existing data remains unchanged and compatible.

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties and examples. Several criteria were combined or eliminated to avoid redundancy:

**Redundancy Analysis**:

- Requirements 2.1-2.5 (navigation exclusions) can be tested together as they all verify absence of developer features
- Requirements 7.1-7.3 (settings page exclusions) overlap with navigation requirements and can be combined
- Requirements 8.1-8.4 (backward compatibility) can be tested together as they all verify data loading
- Requirements 9.1-9.2 (navigation validity) can be combined into a single property about link integrity

**Consolidated Properties**:

- Developer feature visibility → Single property checking absence of developer routes
- Backward compatibility → Single property checking data loading across all entity types
- Link integrity → Single property checking all navigation links are valid

### Property 1: No Polar Branding in User-Facing Content

For any user-facing page or component, the rendered content should not contain the text "Polar" (case-insensitive).

**Validates: Requirements 1.4, 5.3**

### Property 2: Platform Fee Calculation Consistency

For any transaction amount, the calculated platform fee should equal exactly 20% of the transaction amount (2000 basis points).

**Validates: Requirements 3.1, 3.3**

### Property 3: Currency Display Formatting

For any price amount displayed in the user interface, the formatted string should use KES currency format and symbol.

**Validates: Requirements 4.2**

### Property 4: Backward Compatibility for Existing Data

For any existing entity (user, product, transaction, payment configuration), loading and displaying that entity should succeed without errors and render with Blyss branding.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 5: Navigation Link Validity

For any navigation link in the application, clicking that link should navigate to a page that returns HTTP 200 status and renders without errors.

**Validates: Requirements 9.1, 9.2**

### Property 6: Hidden Feature Link Removal

For any feature that is hidden (developer tools, webhooks, GitHub integration), navigation should not contain links to that feature's pages.

**Validates: Requirements 9.3**

### Property 7: Image Reference Validity

For any image reference in the user interface, the image URL should resolve successfully (HTTP 200) and the image should load without broken reference errors.

**Validates: Requirements 9.4**

## Error Handling

### Configuration Errors

**Scenario**: Invalid or missing environment variables

**Handling**:

- Application startup validation checks for required configuration
- Clear error messages indicating which variables are missing
- Fallback to default values where safe (e.g., logo URLs)
- Fatal errors for critical configuration (e.g., platform fee)

**Implementation**:

```python
# In config.py
def validate_rebrand_config(self) -> None:
    if self.PLATFORM_FEE_BASIS_POINTS < 0:
        raise ValueError("PLATFORM_FEE_BASIS_POINTS must be non-negative")

    if not self.EMAIL_FROM_NAME:
        raise ValueError("EMAIL_FROM_NAME is required")
```

### Asset Loading Errors

**Scenario**: Logo or brand asset files not found

**Handling**:

- Graceful degradation: show text-based branding if logo fails to load
- Log warnings for missing assets
- Provide fallback URLs for critical assets
- Health check endpoint to verify asset availability

**Implementation**:

```typescript
// Frontend logo component
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

### Navigation Errors

**Scenario**: User attempts to access hidden developer features directly via URL

**Handling**:

- Route guards check feature flags
- Redirect to dashboard if feature is disabled
- Return 404 for completely removed routes
- Log access attempts for monitoring

**Implementation**:

```typescript
// Route guard middleware
const requireFeature = (feature: string) => {
  return (req, res, next) => {
    if (!FEATURES[feature]) {
      return res.redirect('/dashboard')
    }
    next()
  }
}
```

### Fee Calculation Errors

**Scenario**: Fee calculation produces invalid results

**Handling**:

- Validate fee amounts are non-negative
- Validate fee amounts don't exceed transaction amount
- Log calculation errors with transaction details
- Fail transaction if fee calculation fails

**Implementation**:

```python
def calculate_platform_fee(amount: int) -> int:
    if amount < 0:
        raise ValueError(f"Transaction amount must be non-negative: {amount}")

    fee = (amount * settings.PLATFORM_FEE_BASIS_POINTS) // 10000

    if fee > amount:
        raise ValueError(f"Calculated fee {fee} exceeds amount {amount}")

    return fee
```

### Currency Conversion Errors

**Scenario**: Currency formatting or conversion fails

**Handling**:

- Validate currency codes against supported list
- Fallback to raw number display if formatting fails
- Log formatting errors with currency and amount
- Provide clear error messages to users

**Implementation**:

```typescript
function formatCurrency(amount: number, currency: string = 'KES'): string {
  try {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  } catch (error) {
    console.error(`Currency formatting failed: ${currency}`, error)
    return `${currency.toUpperCase()} ${amount / 100}`
  }
}
```

### Email Sending Errors

**Scenario**: Email template rendering or sending fails

**Handling**:

- Validate email template data before rendering
- Catch rendering errors and log with template name
- Retry email sending with exponential backoff
- Alert monitoring if email failure rate exceeds threshold

**Implementation**:

```python
async def send_branded_email(
    recipient: str,
    template: str,
    data: dict
) -> None:
    try:
        # Validate branding data
        if "logo_url" not in data:
            data["logo_url"] = settings.EMAIL_LOGO_URL

        if "sender_name" not in data:
            data["sender_name"] = settings.EMAIL_FROM_NAME

        # Render and send
        await email_service.send(recipient, template, data)

    except TemplateRenderError as e:
        logger.error(f"Email template rendering failed: {template}", exc_info=e)
        raise
    except EmailSendError as e:
        logger.error(f"Email sending failed: {recipient}", exc_info=e)
        # Retry logic handled by email service
        raise
```

## Testing Strategy

### Dual Testing Approach

The rebrand will be validated using both unit tests and property-based tests:

**Unit Tests**: Verify specific examples, edge cases, and error conditions

- Specific logo references in components
- Specific navigation routes that should be hidden
- Specific configuration values
- Integration points between components
- Error handling for missing assets

**Property Tests**: Verify universal properties across all inputs

- No "Polar" text across all pages (comprehensive text scanning)
- Fee calculations for wide range of amounts
- Currency formatting for various amounts
- Backward compatibility across all data types
- Link validity across all navigation routes

### Property-Based Testing Configuration

**Library Selection**:

- **Frontend**: `fast-check` (JavaScript/TypeScript property testing)
- **Backend**: `hypothesis` (Python property testing)

**Test Configuration**:

- Minimum 100 iterations per property test
- Each property test tagged with reference to design document
- Tag format: `Feature: platform-rebrand, Property {number}: {property_text}`

**Example Property Test Structure**:

```typescript
// Frontend property test example
import fc from 'fast-check'

describe('Feature: platform-rebrand, Property 1: No Polar Branding', () => {
  it('should not contain "Polar" text in any rendered page', () => {
    fc.assert(
      fc.property(
        fc.record({
          route: fc.constantFrom(...allRoutes),
          userType: fc.constantFrom('authenticated', 'anonymous'),
        }),
        async ({ route, userType }) => {
          const rendered = await renderPage(route, userType)
          const text = rendered.text().toLowerCase()
          expect(text).not.toContain('polar')
        },
      ),
      { numRuns: 100 },
    )
  })
})
```

```python
# Backend property test example
from hypothesis import given, strategies as st

class TestPlatformFee:
    """Feature: platform-rebrand, Property 2: Platform Fee Calculation"""

    @given(amount=st.integers(min_value=0, max_value=1000000))
    def test_fee_calculation_is_twenty_percent(self, amount: int):
        """For any transaction amount, fee should be exactly 20%"""
        fee = calculate_platform_fee(amount)
        expected_fee = (amount * 2000) // 10000
        assert fee == expected_fee
```

### Unit Test Coverage

**Critical Unit Tests**:

1. **Brand Asset Loading**
   - Logo component renders Blyss logo
   - Favicon reference points to Blyss favicon
   - Email templates use Blyss logo

2. **Navigation Configuration**
   - Developer route not in account routes
   - Webhooks route not in organization settings
   - GitHub integration route not present

3. **Configuration Values**
   - `PLATFORM_FEE_BASIS_POINTS` equals 2000
   - `EMAIL_FROM_NAME` equals "Blyss"
   - Default currency equals "KES"

4. **Metadata**
   - Page title includes "Blyss"
   - Meta description describes Blyss
   - OG tags reference Blyss

5. **Error Handling**
   - Missing logo shows fallback
   - Invalid currency code handled gracefully
   - Hidden feature URLs redirect properly

### Integration Tests

**End-to-End Scenarios**:

1. **User Journey**: New user signs up → sees Blyss branding throughout
2. **Creator Journey**: Creator lists product → default currency is KES → receives payment → 20% fee applied
3. **Email Journey**: User triggers email → receives email with Blyss branding
4. **Navigation Journey**: User navigates app → no developer features visible → all links work

### Manual Testing Checklist

**Visual Verification**:

- [ ] All logos display correctly (light/dark modes)
- [ ] Favicon shows in browser tab
- [ ] No "Polar" text visible in UI
- [ ] Email templates display Blyss branding
- [ ] Social media previews show Blyss imagery

**Functional Verification**:

- [ ] Platform fee calculates to 20%
- [ ] Prices display in KES format
- [ ] Developer features hidden from navigation
- [ ] All navigation links work
- [ ] Existing data loads correctly

**Configuration Verification**:

- [ ] Environment variables set correctly
- [ ] Configuration values match requirements
- [ ] Reversibility: can change back via environment variables

### Test Data Requirements

**Property Test Generators**:

- Route generator: all application routes
- Amount generator: 0 to 1,000,000 (transaction amounts)
- Currency generator: supported currency codes
- User type generator: authenticated, anonymous, admin
- Entity generator: sample users, products, transactions

**Unit Test Fixtures**:

- Sample user accounts (existing data)
- Sample products (existing data)
- Sample transactions (existing data)
- Sample email templates
- Sample navigation configurations

### Continuous Integration

**CI Pipeline Checks**:

1. Run all unit tests
2. Run all property tests (100 iterations each)
3. Check for "Polar" text in codebase (excluding comments/docs)
4. Verify configuration values
5. Run integration tests
6. Generate test coverage report (target: >80%)

**Pre-Deployment Checklist**:

- [ ] All tests passing
- [ ] No "Polar" text in user-facing code
- [ ] Configuration values verified
- [ ] Asset files uploaded and accessible
- [ ] Email templates tested
- [ ] Rollback plan documented
