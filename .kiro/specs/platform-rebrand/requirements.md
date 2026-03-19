# Requirements Document

## Introduction

This document specifies the requirements for rebranding the Polar platform to Blyss, including visual identity changes, feature visibility adjustments, and platform configuration updates for the Kenyan market. This is the final transformation step (5 of 5) to convert Polar into a marketplace platform optimized for Kenyan creators.

## CRITICAL IMPLEMENTATION GUIDELINES

**IMAGE HANDLING - DO NOT TOUCH:**
- **DO NOT modify, move, or change any image files or image routes**
- **DO NOT touch logo files, favicon files, or any images in public folders**
- **DO NOT update image references or paths in code**
- The rebrand is for TEXT CONTENT ONLY - update text, configuration, and non-image elements
- User will replace all images manually after text rebrand is complete

## Glossary

- **Platform**: The web application system being rebranded from Polar to Blyss
- **Brand_Assets**: Visual elements including logos, colors, and typography that represent Blyss
- **Developer_Features**: API tokens, webhooks, GitHub integration, and sandbox mode functionality
- **Platform_Fee**: The percentage commission charged on transactions (changing from 4% to 20%)
- **Base_Currency**: The default currency for the platform (changing to KES - Kenyan Shillings)
- **Email_Templates**: Transactional email messages sent by the platform
- **Navigation_UI**: User interface elements for site navigation including menus and links
- **Meta_Tags**: HTML metadata for SEO and social media sharing
- **Configuration_Variables**: Environment variables and settings that control platform behavior

## Requirements

### Requirement 1: Visual Brand Identity

**User Story:** As a user, I want to see Blyss branding throughout the platform, so that I recognize the platform's identity.

#### Acceptance Criteria

1. THE Platform SHALL display the Blyss logo in the application header
2. THE Platform SHALL display the Blyss logo as the browser favicon
3. THE Platform SHALL use the Blyss logo in email templates
4. THE Platform SHALL replace all instances of "Polar" text with "Blyss" in user-facing content
5. WHERE Blyss brand colors are defined, THE Platform SHALL apply them to the color scheme

### Requirement 2: Developer Feature Visibility

**User Story:** As a marketplace user, I want a simplified interface without developer tools, so that I can focus on buying and selling products.

#### Acceptance Criteria

1. THE Navigation_UI SHALL exclude links to API token management pages
2. THE Navigation_UI SHALL exclude links to webhook configuration pages
3. THE Navigation_UI SHALL exclude links to GitHub integration pages
4. THE Platform SHALL hide sandbox mode toggle controls from the user interface
5. THE Navigation_UI SHALL exclude links to developer documentation

### Requirement 3: Platform Fee Configuration

**User Story:** As a platform operator, I want to set the platform fee to 20%, so that the business model aligns with marketplace economics.

#### Acceptance Criteria

1. THE Platform SHALL apply a 20% commission on all transactions
2. THE Configuration_Variables SHALL set PLATFORM_FEE_BASIS_POINTS to 2000
3. WHEN calculating transaction fees, THE Platform SHALL use the configured platform fee percentage

### Requirement 4: Currency Localization

**User Story:** As a Kenyan user, I want prices displayed in Kenyan Shillings, so that I understand costs in my local currency.

#### Acceptance Criteria

1. THE Platform SHALL use KES (Kenyan Shillings) as the Base_Currency
2. THE Platform SHALL display prices in KES format throughout the user interface
3. WHEN creating new products, THE Platform SHALL default to KES currency

### Requirement 5: Email Branding

**User Story:** As a user receiving platform emails, I want to see Blyss branding, so that I recognize legitimate communications from the platform.

#### Acceptance Criteria

1. THE Email_Templates SHALL display the Blyss logo in the header
2. THE Email_Templates SHALL use "Blyss" as the sender name
3. THE Email_Templates SHALL replace all "Polar" text references with "Blyss"
4. WHERE brand colors are defined, THE Email_Templates SHALL apply Blyss brand colors

### Requirement 6: SEO and Social Media Metadata

**User Story:** As a potential user discovering the platform, I want to see Blyss branding in search results and social media, so that I understand what platform I'm visiting.

#### Acceptance Criteria

1. THE Meta_Tags SHALL set the page title to include "Blyss"
2. THE Meta_Tags SHALL set the meta description to describe Blyss
3. THE Meta_Tags SHALL set og:title to include "Blyss"
4. THE Meta_Tags SHALL set og:description to describe Blyss
5. WHERE og:image is defined, THE Meta_Tags SHALL reference Blyss brand imagery

### Requirement 7: Settings Interface Simplification

**User Story:** As a marketplace user, I want a streamlined settings interface, so that I'm not confused by developer-oriented options.

#### Acceptance Criteria

1. THE Platform SHALL hide API token management sections from settings pages
2. THE Platform SHALL hide webhook configuration sections from settings pages
3. THE Platform SHALL hide GitHub integration sections from settings pages
4. THE Platform SHALL maintain access to payment and profile settings

### Requirement 8: Backward Compatibility

**User Story:** As a platform operator, I want existing data to remain functional after rebranding, so that current users experience no disruption.

#### Acceptance Criteria

1. THE Platform SHALL maintain compatibility with existing user accounts
2. THE Platform SHALL maintain compatibility with existing product listings
3. THE Platform SHALL maintain compatibility with existing transaction records
4. THE Platform SHALL maintain compatibility with existing payment configurations
5. WHEN accessing historical data, THE Platform SHALL display it correctly with new branding

### Requirement 9: Link Integrity

**User Story:** As a user navigating the platform, I want all links to work correctly, so that I can access all available features.

#### Acceptance Criteria

1. WHEN a user clicks any navigation link, THE Platform SHALL navigate to a valid page
2. THE Platform SHALL return HTTP 200 status codes for all accessible pages
3. IF a feature is hidden, THEN THE Platform SHALL remove or redirect associated links
4. THE Platform SHALL display no broken image references in the user interface

### Requirement 10: Configuration Reversibility

**User Story:** As a platform operator, I want the ability to revert changes if needed, so that I can recover from issues.

#### Acceptance Criteria

1. THE Platform SHALL maintain original Brand_Assets in version control
2. THE Platform SHALL document all Configuration_Variables changes
3. THE Platform SHALL allow Configuration_Variables to be modified through environment settings
4. WHERE code changes are made, THE Platform SHALL maintain clear commit history
