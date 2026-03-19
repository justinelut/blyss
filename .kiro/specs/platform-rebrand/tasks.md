# Implementation Plan: Platform Rebrand (Polar → Blyss)

## Overview

This plan implements the complete rebranding of Polar to Blyss, including visual identity changes, feature visibility adjustments, and platform configuration updates for the Kenyan marketplace. The implementation follows a layered approach: assets → configuration → frontend → backend → emails → testing.

## CRITICAL IMPLEMENTATION GUIDELINES

**IMAGE HANDLING - DO NOT TOUCH:**
- **DO NOT modify, move, or change any image files or image routes**
- **DO NOT touch logo files, favicon files, or any images in public folders**
- **DO NOT update image references or paths in code**
- **DO NOT create or modify any image-related components that change image sources**
- The rebrand is for TEXT CONTENT ONLY - update text, configuration, and non-image elements
- User will replace all images manually after text rebrand is complete
- Focus on: text content, configuration values, metadata text, email text, navigation text

## Tasks

- [x] 1. Set up brand assets and configuration
  - Create directory structure for Blyss brand assets
  - Add Blyss logo files (SVG for web, PNG for email)
  - Add Blyss favicon and social media images
  - Update environment variable documentation
  - _Requirements: 1.1, 1.2, 1.3, 6.5_

- [ ] 2. Configure backend platform settings
  - [x] 2.1 Update platform fee configuration in server/polar/config.py
    - Change PLATFORM_FEE_BASIS_POINTS from 400 to 2000 (20%)
    - Update configuration validation to check fee range
    - _Requirements: 3.1, 3.2_
  - [x] 2.2 Write property test for platform fee calculation
    - **Property 2: Platform Fee Calculation Consistency**
    - **Validates: Requirements 3.1, 3.3**
  - [x] 2.3 Update default currency configuration
    - Set DEFAULT_CURRENCY to "kes" in configuration
    - Update product creation defaults to use KES
    - _Requirements: 4.1, 4.3_
  - [x] 2.4 Update email sender configuration
    - Set EMAIL_FROM_NAME to "Blyss"
    - Update email domain configuration if needed
    - _Requirements: 5.2_

- [ ] 3. Update frontend brand identity
  - [x] 3.1 Create centralized logo component
    - Implement Logo component with variant support (light/dark/email)
    - Add error handling with text fallback
    - Use Blyss logo assets
    - _Requirements: 1.1_
  - [x] 3.2 Update application header and favicon
    - Replace logo in header component with Blyss logo
    - Update favicon reference in HTML head
    - _Requirements: 1.1, 1.2_
  - [x] 3.3 Update metadata and SEO tags
    - Update page titles to include "Blyss"
    - Update meta descriptions to describe Blyss
    - Update Open Graph tags (og:title, og:description, og:image)
    - Update Twitter Card tags
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.4 Write property test for brand text replacement
    - **Property 1: No Polar Branding in User-Facing Content**
    - **Validates: Requirements 1.4, 5.3**

- [x] 4. Implement navigation and feature visibility changes
  - [x] 4.1 Create feature flag configuration
    - Add FEATURES object with flags for developer tools, webhooks, GitHub integration
    - Set all developer feature flags to false
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 4.2 Update navigation configuration
    - Remove "Developer" route from account routes list
    - Remove "Webhooks" sub-route from organization settings
    - Remove "GitHub Integration" links from navigation
    - Add conditional rendering based on feature flags
    - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.2, 7.3_
  - [x] 4.3 Add route guards for hidden features
    - Implement middleware to redirect from hidden feature URLs
    - Return 404 or redirect to dashboard for disabled features
    - _Requirements: 9.3_
  - [x] 4.4 Write property test for hidden feature link removal
    - **Property 6: Hidden Feature Link Removal**
    - **Validates: Requirements 9.3**

- [  ] 5. Checkpoint - Verify configuration and navigation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update currency formatting and display
  - [x] 6.1 Implement KES currency formatting function
    - Create formatCurrency function with KES default
    - Add error handling for invalid currency codes
    - Use Intl.NumberFormat with 'en-KE' locale
    - _Requirements: 4.2_
  - [x] 6.2 Update price display components
    - Replace currency formatting calls to use KES
    - Update product listing price displays
    - Update checkout and payment displays
    - _Requirements: 4.2_
  - [x] 6.3 Write property test for currency display formatting
    - **Property 3: Currency Display Formatting**
    - **Validates: Requirements 4.2**

- [x] 7. Update email templates
  - [  ] 7.1 Update email header component
    - Replace logo in PolarHeader.tsx with Blyss logo
    - Update alt text to "Blyss Logo"
    - _Requirements: 1.3, 5.1_
  - [x] 7.2 Replace "Polar" text in all email templates
    - Search and replace "Polar" with "Blyss" in all template files
    - Update sender name references
    - _Requirements: 5.3_
  - [x] 7.3 Apply Blyss brand colors to email templates
    - Update color variables in email styles
    - Apply brand colors to headers, buttons, and accents
    - _Requirements: 1.5, 5.4_

- [x] 8. Implement error handling and fallbacks
  - [x] 8.1 Add configuration validation
    - Validate PLATFORM_FEE_BASIS_POINTS is non-negative
    - Validate EMAIL_FROM_NAME is set
    - Add startup validation checks
    - _Requirements: 10.3_
  - [x] 8.2 Add asset loading error handling
    - Implement logo component error fallback
    - Add image reference validation
    - Log warnings for missing assets
    - _Requirements: 9.4_
  - [x] 8.3 Add fee calculation validation
    - Validate fee amounts are non-negative
    - Validate fees don't exceed transaction amount
    - Add error logging for calculation failures
    - _Requirements: 3.3_
  - [x] 8.4 Write property test for image reference validity
    - **Property 7: Image Reference Validity**
    - **Validates: Requirements 9.4**

- [  ] 9. Checkpoint - Verify error handling and edge cases
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement backward compatibility verification
  - [x] 10.1 Add data loading compatibility checks
    - Verify existing user accounts load correctly
    - Verify existing products display with new branding
    - Verify existing transactions show correct fees
    - Verify payment configurations remain functional
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 10.2 Write property test for backward compatibility
    - **Property 4: Backward Compatibility for Existing Data**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 11. Implement navigation link validation
  - [x] 11.1 Add link integrity checks
    - Verify all navigation links return HTTP 200
    - Verify all links navigate to valid pages
    - Add automated link checking
    - _Requirements: 9.1, 9.2_
  - [x] 11.2 Write property test for navigation link validity
    - **Property 5: Navigation Link Validity**
    - **Validates: Requirements 9.1, 9.2**

- [x] 12. Create comprehensive integration tests
  - [x] 12.1 Write integration test for new user journey
    - Test signup flow with Blyss branding
    - Verify no "Polar" text in user experience
    - Verify all navigation links work
  - [x] 12.2 Write integration test for creator transaction flow
    - Test product creation with KES default
    - Test payment processing with 20% fee
    - Verify transaction records show correct branding
  - [x] 12.3 Write integration test for email branding
    - Test email template rendering with Blyss logo
    - Verify sender name is "Blyss"
    - Verify no "Polar" text in emails

- [x] 13. Documentation and reversibility
  - [x] 13.1 Document configuration changes
    - Create list of all modified environment variables
    - Document original values for rollback
    - Update deployment documentation
    - _Requirements: 10.2, 10.3_
  - [x] 13.2 Document brand asset locations
    - List all brand asset file paths
    - Document asset usage in components
    - Maintain original assets in version control
    - _Requirements: 10.1_

- [ ] 14. Final checkpoint - Complete verification
  - Run all unit tests and property tests
  - Verify no "Polar" text in user-facing code
  - Verify all configuration values are correct
  - Verify all navigation links work
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The rebrand is reversible through environment variable changes
- No database migrations required - all changes are configuration and presentation
- Feature hiding (not removal) allows potential re-enabling of developer features
