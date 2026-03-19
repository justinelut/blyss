# Requirements Document

## Introduction

This document defines requirements for Creator Storefronts, a public-facing feature that enables anyone to discover creators and view their products on the Blyss marketplace. The feature consists of a creators directory page, individual creator storefront pages, and creator profile management capabilities. Unlike the existing private customer portal, these pages are publicly accessible without authentication.

## Glossary

- **Creator**: An Organization entity that has products available on the marketplace
- **Storefront**: A public page displaying a creator's profile, products, and subscriptions
- **Directory**: The public listing page showing all creators with products
- **Organization**: The existing database model representing a creator entity
- **Product_Card**: An existing UI component for displaying product information
- **Customer_Portal**: The existing private portal at `/[organization]/portal/`
- **Bio**: A text description of the creator
- **Social_Links**: JSON object containing creator's social media URLs (twitter, instagram, website)

## Requirements

### Requirement 1: Public Creators Directory

**User Story:** As a visitor, I want to browse all creators on the platform, so that I can discover new creators and their products.

#### Acceptance Criteria

1. THE Directory SHALL display all creators that have at least one product
2. WHEN a visitor accesses `/creators`, THE Directory SHALL render without requiring authentication
3. THE Directory SHALL display creator cards in a grid layout
4. FOR EACH creator card, THE Directory SHALL display the creator's avatar, name, and product count
5. WHEN a visitor clicks a creator card, THE Directory SHALL navigate to that creator's storefront page
6. THE Directory SHALL include proper SEO meta tags for search engine indexing

### Requirement 2: Creator Search and Filtering

**User Story:** As a visitor, I want to search and filter creators, so that I can quickly find specific creators or types of content.

#### Acceptance Criteria

1. THE Directory SHALL provide a search input field
2. WHEN a visitor enters text in the search field, THE Directory SHALL filter creators by name matching the search term
3. THE Directory SHALL update the displayed results in real-time as the visitor types
4. WHEN no creators match the search criteria, THE Directory SHALL display a message indicating no results found

### Requirement 3: Individual Creator Storefront

**User Story:** As a visitor, I want to view a creator's storefront, so that I can learn about the creator and browse their products.

#### Acceptance Criteria

1. WHEN a visitor accesses `/creator/[slug]`, THE Storefront SHALL render without requiring authentication
2. THE Storefront SHALL display the creator's avatar, name, bio, and social links in a left sidebar
3. THE Storefront SHALL provide tabs for Overview, Products, and Subscriptions
4. WHEN the Products tab is active, THE Storefront SHALL display all creator products using existing Product_Card components
5. THE Storefront SHALL include a Subscribe button and a Donate button
6. THE Storefront SHALL include proper SEO meta tags with creator name and bio
7. WHEN a creator slug does not exist, THE Storefront SHALL return a 404 error page

### Requirement 4: Creator Profile Data Model

**User Story:** As a developer, I want to extend the Organization model with profile fields, so that creators can provide additional information for their storefronts.

#### Acceptance Criteria

1. THE Organization model SHALL include a bio field of type text
2. THE Organization model SHALL include a social_links field of type JSON
3. THE social_links field SHALL support twitter, instagram, and website properties
4. THE Organization model SHALL allow bio to be null or empty
5. THE Organization model SHALL allow social_links to be null or empty
6. WHEN a database migration is applied, THE Organization table SHALL be updated with the new fields without data loss

### Requirement 5: Creator Profile Management

**User Story:** As a creator, I want to edit my bio and social links, so that I can customize my public storefront.

#### Acceptance Criteria

1. THE Profile_Editor SHALL provide an input field for editing bio text
2. THE Profile_Editor SHALL provide input fields for twitter, instagram, and website URLs
3. WHEN a creator saves their profile, THE Profile_Editor SHALL validate that social link URLs are properly formatted
4. WHEN a creator saves their profile, THE Profile_Editor SHALL update the Organization record with the new values
5. THE Profile_Editor SHALL display success feedback when the profile is saved successfully
6. THE Profile_Editor SHALL display error messages when validation fails

### Requirement 6: Public API Endpoints

**User Story:** As a frontend developer, I want public API endpoints for creator data, so that I can build the directory and storefront pages.

#### Acceptance Criteria

1. THE API SHALL provide a GET endpoint at `/api/creators` that returns all creators with products
2. THE API SHALL provide a GET endpoint at `/api/creators/[slug]` that returns a specific creator's profile and products
3. THE `/api/creators` endpoint SHALL not require authentication
4. THE `/api/creators/[slug]` endpoint SHALL not require authentication
5. THE `/api/creators` endpoint SHALL return creator name, slug, avatar, and product count
6. THE `/api/creators/[slug]` endpoint SHALL return creator name, slug, avatar, bio, social_links, and products array
7. WHEN a creator has no products, THE `/api/creators` endpoint SHALL exclude that creator from results

### Requirement 7: Storefront Social Links Display

**User Story:** As a visitor, I want to see a creator's social media links, so that I can follow them on other platforms.

#### Acceptance Criteria

1. WHEN a creator has social_links configured, THE Storefront SHALL display clickable icons for each social platform
2. WHEN a visitor clicks a social link icon, THE Storefront SHALL open the social profile in a new browser tab
3. WHEN a creator has no social_links configured, THE Storefront SHALL not display the social links section
4. THE Storefront SHALL display social link icons in a consistent order: twitter, instagram, website

### Requirement 8: Product Display on Storefront

**User Story:** As a visitor, I want to see all products from a creator, so that I can browse and purchase items I'm interested in.

#### Acceptance Criteria

1. THE Storefront SHALL reuse existing Product_Card components for displaying products
2. THE Storefront SHALL display products in a grid layout
3. WHEN a creator has no products, THE Storefront SHALL display a message indicating no products available
4. WHEN a visitor clicks a product card, THE Storefront SHALL navigate to the product detail page
5. THE Storefront SHALL display products in the same visual style as the existing Customer_Portal

### Requirement 9: Storefront Tabs Navigation

**User Story:** As a visitor, I want to navigate between different sections of a creator's storefront, so that I can view products, subscriptions, or overview information.

#### Acceptance Criteria

1. THE Storefront SHALL provide three tabs: Overview, Products, and Subscriptions
2. WHEN a visitor clicks a tab, THE Storefront SHALL display the corresponding content
3. THE Storefront SHALL highlight the active tab visually
4. WHEN the Storefront loads, THE Storefront SHALL default to the Overview tab
5. THE Storefront SHALL maintain the selected tab when the page is refreshed using URL parameters

### Requirement 10: SEO Optimization

**User Story:** As a creator, I want my storefront to be discoverable by search engines, so that potential customers can find me through search.

#### Acceptance Criteria

1. THE Storefront SHALL include a page title with the creator's name
2. THE Storefront SHALL include a meta description using the creator's bio
3. THE Storefront SHALL include Open Graph tags for social media sharing
4. THE Directory SHALL include a page title describing the creators marketplace
5. THE Directory SHALL include a meta description explaining the purpose of the directory
6. THE Storefront SHALL include canonical URL tags to prevent duplicate content issues
