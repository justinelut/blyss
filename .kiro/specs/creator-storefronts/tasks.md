# Implementation Plan: Creator Storefronts

## Overview

This implementation plan breaks down the Creator Storefronts feature into discrete coding tasks. The feature enables public discovery of creators through a directory page and individual storefront pages, with profile management capabilities for creators. Implementation follows a backend-first approach to establish data models and APIs before building frontend components.

NB - for social links check the ones polar.sh already provides and use those instead avoid creating socials links schemas if they exist u didnt not check properly

## Tasks

- [x] 1. Database schema and model extensions
  - [x] 1.1 Create Alembic migration for Organization model extensions
    - Add `bio` TEXT column (nullable)
    - Add `social_links` JSONB column (nullable)
    - Create GIN index on `social_links` for JSON queries
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.2 Update Organization model with new fields
    - Add `bio` mapped column (Text, nullable)
    - Add `social_links` mapped column (JSONB, nullable) # check the existing social links models polar already has and use that insted
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Backend API schemas and validation
  - [x] 2.1 Create public creator schemas in organization/schemas.py
    - Implement `SocialLinks` schema with twitter, instagram, website fields
    - Implement `CreatorSummarySchema` with id, name, slug, avatar_url, product_count
    - Implement `CreatorStorefrontSchema` with profile and products
    - Implement `ProfileUpdateSchema` with bio validation (max 500 chars)
    - _Requirements: 6.5, 6.6, 5.3_

  - [x] 2.2 Write unit tests for schema validation
    - Test bio max length validation
    - Test social links URL format validation
    - Test schema serialization with null values
    - _Requirements: 5.3_

- [x] 3. Backend repository layer
  - [x] 3.1 Add creator query methods to OrganizationRepository
    - Implement `get_creators_with_products()` with product count join
    - Implement `get_by_slug_public()` for public storefront access
    - Implement `update_profile()` for bio and social_links updates
    - _Requirements: 1.1, 6.1, 6.7_

  - [x] 3.2 Write property test for creators with products filter
    - **Property 1: Creators with Products Filter**
    - **Validates: Requirements 1.1, 6.1, 6.7**
    - Generate organizations with varying product counts
    - Verify only organizations with products are returned
    - _Requirements: 1.1, 6.1, 6.7_

  - [x] 3.3 Write property test for social links round trip
    - **Property 8: Social Links Serialization Round Trip**
    - **Validates: Requirements 4.3, 5.4**
    - Generate various social links combinations
    - Verify data persists correctly through save/retrieve cycle
    - _Requirements: 4.3, 5.4_

- [x] 4. Backend service layer
  - [x] 4.1 Add creator service methods to OrganizationService
    - Implement `get_creators_directory()` with search filtering
    - Implement `get_creator_storefront()` with products eager loading
    - Implement `update_creator_profile()` with validation and authorization
    - _Requirements: 2.1, 2.2, 3.1, 5.1, 5.2, 5.3, 5.4_

  - [x] 4.2 Add custom exception classes for creator errors
    - Implement `CreatorNotFound` exception (404)
    - Implement `InvalidSocialLinkURL` exception (422)
    - Implement `BioTooLong` exception (422)
    - Implement `UnauthorizedProfileUpdate` exception (403)
    - _Requirements: 3.7, 5.3, 5.6_

  - [x] 4.3 Write unit tests for service layer
    - Test search filtering logic
    - Test authorization checks for profile updates
    - Test error handling for invalid data
    - _Requirements: 2.2, 5.3, 5.6_

- [ ] 5. Backend API endpoints
  - [x] 5.1 Create public creator endpoints in organization/endpoints.py
    - Implement `GET /v1/creators` with search, limit, offset parameters
    - Implement `GET /v1/creators/{slug}` for storefront data
    - Ensure endpoints do not require authentication
    - _Requirements: 1.2, 3.1, 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Create authenticated profile management endpoint
    - Implement `PATCH /v1/organizations/{id}/profile` with WebUser auth
    - Validate user has permission to update organization
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.3 Write E2E tests for creator endpoints
    - Test public access without authentication
    - Test creators list excludes organizations without products
    - Test creator not found returns 404
    - Test profile update with invalid URLs returns 422
    - Test profile update without permission returns 403
    - _Requirements: 1.1, 1.2, 3.1, 3.7, 5.3, 5.6, 6.3, 6.4_

- [x] 6. Checkpoint - Backend complete
  - Ensure all backend tests pass
  - Verify migrations apply cleanly
  - Test API endpoints manually with curl or Postman
  - Ask the user if questions arise

- [x] 7. Frontend TypeScript types
  - [x] 7.1 Create creator type definitions
    - Define `SocialLinks` interface
    - Define `CreatorSummary` interface
    - Define `CreatorStorefront` interface
    - _Requirements: 1.4, 3.2, 7.1_

- [x] 8. Frontend API client hooks
  - [x] 8.1 Generate API client from OpenAPI schema
    - Run `pnpm run generate` in clients/packages/client
    - Verify creator endpoints are included in generated client
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Create custom hooks for creator data fetching
    - Implement `useCreators()` hook with search parameter
    - Implement `useCreator()` hook for individual storefront
    - Implement `useUpdateProfile()` mutation hook
    - _Requirements: 2.1, 2.2, 5.4_

- [x] 9. Creators directory page
  - [x] 9.1 Create directory server component page
    - Implement `app/(main)/creators/page.tsx` with metadata
    - Add SEO meta tags and Open Graph tags
    - Fetch initial creators data server-side
    - _Requirements: 1.2, 1.6, 10.4, 10.5_

  - [x] 9.2 Create CreatorsDirectory client component
    - Implement search input with real-time filtering
    - Implement grid layout for creator cards
    - Handle empty state when no creators found
    - Handle error state for failed API calls
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4_

  - [x] 9.3 Create CreatorCard component
    - Display avatar, name, and product count
    - Handle singular/plural product text
    - Add hover effects and navigation to storefront
    - _Requirements: 1.4, 1.5_

  - [x] 9.4 Write unit tests for directory components
    - Test CreatorCard renders correctly
    - Test search filtering updates results
    - Test empty state display
    - _Requirements: 1.3, 1.4, 2.2, 2.4_

- [x] 10. Creator storefront page
  - [x] 10.1 Create storefront server component page
    - Implement `app/(main)/creator/[slug]/page.tsx`
    - Implement `generateMetadata()` with creator name and bio
    - Add SEO meta tags, Open Graph tags, and canonical URL
    - Handle 404 for non-existent creators
    - _Requirements: 3.1, 3.6, 3.7, 10.1, 10.2, 10.3, 10.6_

  - [x] 10.2 Create StorefrontLayout component
    - Implement two-column layout with sidebar and main content
    - Pass creator data to sidebar and tabs
    - _Requirements: 3.2_

  - [x] 10.3 Create StorefrontSidebar component
    - Display avatar, name, and bio
    - Conditionally render bio section
    - Include Subscribe and Donate buttons
    - _Requirements: 3.2, 3.5_

  - [x] 10.4 Create SocialLinks component
    - Render icons for twitter, instagram, website in order
    - Open links in new tab with proper rel attributes
    - Hide section when no links configured
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 10.5 Write unit tests for social links component
    - Test icons render for configured platforms
    - Test icons display in correct order
    - Test component returns null when no links
    - _Requirements: 7.1, 7.3, 7.4_

- [x] 11. Storefront tabs and content
  - [x] 11.1 Create StorefrontTabs client component
    - Implement three tabs: Overview, Products, Subscriptions
    - Update URL parameters on tab change
    - Highlight active tab visually
    - _Requirements: 3.3, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 11.2 Create tab content components
    - Implement Overview tab content
    - Implement Products tab with Product_Card grid
    - Implement Subscriptions tab placeholder
    - Handle empty state for no products
    - _Requirements: 3.4, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 11.3 Write property test for tab state URL persistence
    - **Property 11: Tab State URL Persistence**
    - **Validates: Requirements 9.5**
    - Generate various tab selections
    - Verify URL reflects tab state and loads correctly
    - _Requirements: 9.5_

- [x] 12. Profile editor component
  - [x] 12.1 Create ProfileEditor component
    - Implement form with bio textarea and social link inputs
    - Add URL validation patterns for social links
    - Handle form submission with mutation hook
    - Display success and error toast notifications
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 12.2 Integrate ProfileEditor into organization settings
    - Add profile editor to organization dashboard
    - Ensure only authorized users can access
    - _Requirements: 5.1_

  - [x] 12.3 Write unit tests for profile editor
    - Test form validation
    - Test error handling for invalid URLs
    - Test success feedback
    - _Requirements: 5.3, 5.5, 5.6_

- [x] 13. Final integration and polish
  - [x] 13.1 Add navigation links to creators directory
    - Add link in main navigation or footer
    - Ensure proper routing configuration
    - _Requirements: 1.2_

  - [x] 13.2 Test complete user flows
    - Test directory browsing and search
    - Test storefront navigation and tab switching
    - Test profile editing and updates
    - Verify SEO meta tags in page source
    - _Requirements: All_

  - [x] 13.3 Verify accessibility compliance
    - Test keyboard navigation
    - Verify ARIA labels on social links
    - Test with screen reader
    - _Requirements: 7.2_

- [ ] 14. Final checkpoint
  - Ensure all tests pass (backend and frontend)
  - Verify no TypeScript or linting errors
  - Test in multiple browsers
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Backend tasks (1-6) should be completed before frontend tasks (7-14)
- Property tests validate universal correctness properties from the design document
- The implementation reuses existing Product_Card components for consistency
- All public endpoints are accessible without authentication for SEO benefits
