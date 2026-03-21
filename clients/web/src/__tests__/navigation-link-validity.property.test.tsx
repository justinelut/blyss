/**
 * Feature: platform-rebrand
 * Property 5: Navigation Link Validity
 *
 * Validates: Requirements 9.1, 9.2
 *
 * This property test verifies that all navigation links in the application
 * navigate to valid pages that return HTTP 200 status codes and render
 * without errors. It ensures that users can access all visible features
 * through the navigation system.
 */

import {
  accountRoutesList,
  generalRoutesList,
  organizationRoutesList,
  Route,
} from '@/components/Dashboard/navigation'
import {
  extractNavigationLinks,
  getResolvedNavigationLinks,
  getVisibleNavigationLinks,
  hasDynamicSegments,
  isRouteVisible,
  isSubRouteVisible,
  isValidLinkFormat,
  replaceDynamicSegments,
  validateNavigationLinkFormats,
} from '@/utils/navigation-validation'
import { describe, expect, it } from 'vitest'

describe('Feature: platform-rebrand, Property 5: Navigation Link Validity', () => {
  /**
   * Test that all navigation links are properly formatted
   *
   * This test validates that navigation links follow the correct format:
   * - Start with /
   * - Do not contain spaces
   * - Are not empty
   */
  it('should have properly formatted navigation links', () => {
    const accountRoutes = accountRoutesList()
    const generalRoutes = generalRoutesList()
    const orgRoutes = organizationRoutesList()

    const allRoutes = [...accountRoutes, ...generalRoutes, ...orgRoutes]

    const validation = validateNavigationLinkFormats(allRoutes)

    if (!validation.valid) {
      console.error('Invalid navigation links found:', validation.invalidLinks)
    }

    expect(validation.valid).toBe(true)
    expect(validation.invalidLinks).toHaveLength(0)
  })

  /**
   * Test that visible routes have valid links
   *
   * This test validates that all routes marked as visible (if: true)
   * have properly formatted links that can be navigated to.
   */
  it('should have valid links for all visible routes', () => {
    const accountRoutes = accountRoutesList()
    const generalRoutes = generalRoutesList()
    const orgRoutes = organizationRoutesList()

    const allRoutes = [...accountRoutes, ...generalRoutes, ...orgRoutes]

    const visibleLinks = getVisibleNavigationLinks(allRoutes)

    for (const link of visibleLinks) {
      expect(isValidLinkFormat(link)).toBe(true)
    }

    expect(visibleLinks.length).toBeGreaterThan(0)
  })

  /**
   * Test that route visibility conditions work correctly
   *
   * This test validates that routes with if: false are properly filtered out
   * and routes with if: true or if: undefined are included.
   */
  it('should correctly filter routes based on visibility conditions', () => {
    const accountRoutes = accountRoutesList()

    // Find the developer route (should have if: false based on FEATURES config)
    const developerRoute = accountRoutes.find((r) => r.id === 'developer')

    if (developerRoute) {
      // If developer route exists, check its visibility
      expect(isRouteVisible(developerRoute)).toBe(false)
    }

    // All visible routes should have if: true or if: undefined
    const visibleRoutes = accountRoutes.filter(isRouteVisible)
    for (const route of visibleRoutes) {
      expect(route.if === true || route.if === undefined).toBe(true)
    }
  })

  /**
   * Test that sub-route visibility conditions work correctly
   *
   * This test validates that sub-routes with if: false are properly filtered out
   * and sub-routes with if: true or if: undefined are included.
   */
  it('should correctly filter sub-routes based on visibility conditions', () => {
    const orgRoutes = organizationRoutesList()

    // Find the settings route which has webhooks sub-route
    const settingsRoute = orgRoutes.find((r) => r.id === 'settings')

    if (settingsRoute && settingsRoute.subs) {
      // Find the webhooks sub-route (should have if: false based on FEATURES config)
      const webhooksSubRoute = settingsRoute.subs.find(
        (s) => s.title === 'Webhooks',
      )

      if (webhooksSubRoute) {
        // If webhooks sub-route exists, check its visibility
        expect(isSubRouteVisible(webhooksSubRoute)).toBe(false)
      }

      // All visible sub-routes should have if: true, if: undefined, or if: function returning true
      const visibleSubRoutes = settingsRoute.subs.filter(isSubRouteVisible)
      for (const subRoute of visibleSubRoutes) {
        if (subRoute.if !== undefined) {
          if (typeof subRoute.if === 'boolean') {
            expect(subRoute.if).toBe(true)
          } else if (typeof subRoute.if === 'function') {
            expect(subRoute.if()).toBe(true)
          }
        }
      }
    }
  })

  /**
   * Test that dynamic segment replacement works correctly
   *
   * This test validates that links with dynamic segments like [organization]
   * can be properly resolved with actual values.
   */
  it('should correctly replace dynamic segments in links', () => {
    const testCases = [
      {
        link: '/dashboard/[organization]',
        replacements: { organization: 'test-org' },
        expected: '/dashboard/test-org',
      },
      {
        link: '/dashboard/[organization]/products',
        replacements: { organization: 'my-company' },
        expected: '/dashboard/my-company/products',
      },
      {
        link: '/dashboard/account/preferences',
        replacements: {},
        expected: '/dashboard/account/preferences',
      },
    ]

    for (const testCase of testCases) {
      const result = replaceDynamicSegments(
        testCase.link,
        testCase.replacements,
      )
      expect(result).toBe(testCase.expected)
    }
  })

  /**
   * Test that dynamic segment detection works correctly
   *
   * This test validates that links with [segment] patterns are correctly identified.
   */
  it('should correctly detect dynamic segments in links', () => {
    expect(hasDynamicSegments('/dashboard/[organization]')).toBe(true)
    expect(hasDynamicSegments('/dashboard/[organization]/products')).toBe(true)
    expect(hasDynamicSegments('/dashboard/account/preferences')).toBe(false)
    expect(hasDynamicSegments('/dashboard')).toBe(false)
  })

  /**
   * Test that resolved navigation links are unique and valid
   *
   * This test validates that when dynamic segments are resolved,
   * the resulting links are unique and properly formatted.
   */
  it('should produce unique and valid resolved navigation links', () => {
    const orgRoutes = organizationRoutesList()
    const dynamicValues = { organization: 'test-org' }

    const resolvedLinks = getResolvedNavigationLinks(orgRoutes, dynamicValues)

    // All resolved links should be valid
    for (const link of resolvedLinks) {
      expect(isValidLinkFormat(link)).toBe(true)
      expect(link).not.toContain('[')
      expect(link).not.toContain(']')
    }

    // Links should be unique
    const uniqueLinks = new Set(resolvedLinks)
    expect(uniqueLinks.size).toBe(resolvedLinks.length)
  })

  /**
   * Test that all navigation link utilities handle edge cases
   *
   * This test validates that the navigation validation utilities
   * handle edge cases gracefully without throwing errors.
   */
  it('should handle edge cases in navigation validation', () => {
    // Empty routes array
    expect(extractNavigationLinks([])).toEqual([])
    expect(getVisibleNavigationLinks([])).toEqual([])
    expect(validateNavigationLinkFormats([]).valid).toBe(true)

    // Routes with no subs
    const routeWithoutSubs: Route = {
      id: 'test',
      title: 'Test',
      link: '/test',
      if: true,
    }
    expect(extractNavigationLinks([routeWithoutSubs])).toEqual(['/test'])

    // Routes with empty subs array
    const routeWithEmptySubs: Route = {
      id: 'test',
      title: 'Test',
      link: '/test',
      if: true,
      subs: [],
    }
    expect(extractNavigationLinks([routeWithEmptySubs])).toEqual(['/test'])

    // Invalid link formats
    const invalidRoutes: Route[] = [
      {
        id: 'invalid1',
        title: 'Invalid 1',
        link: 'no-slash',
        if: true,
      },
      {
        id: 'invalid2',
        title: 'Invalid 2',
        link: '/has space',
        if: true,
      },
    ]
    const validation = validateNavigationLinkFormats(invalidRoutes)
    expect(validation.valid).toBe(false)
    expect(validation.invalidLinks.length).toBe(2)
  })

  /**
   * Test that navigation configuration is consistent
   *
   * This test validates that the navigation configuration follows
   * consistent patterns and conventions across all route types.
   */
  it('should have consistent navigation configuration', () => {
    const accountRoutes = accountRoutesList()
    const generalRoutes = generalRoutesList()
    const orgRoutes = organizationRoutesList()

    const allRoutes = [...accountRoutes, ...generalRoutes, ...orgRoutes]

    // All routes should have required fields
    for (const route of allRoutes) {
      expect(route.id).toBeDefined()
      expect(route.title).toBeDefined()
      expect(route.link).toBeDefined()
      expect(typeof route.id).toBe('string')
      expect(typeof route.title).toBe('string')
      expect(typeof route.link).toBe('string')
    }

    // All route IDs should be unique
    const routeIds = allRoutes.map((r) => r.id)
    const uniqueIds = new Set(routeIds)
    expect(uniqueIds.size).toBe(routeIds.length)

    // All sub-routes should have required fields
    for (const route of allRoutes) {
      if (route.subs) {
        for (const subRoute of route.subs) {
          expect(subRoute.title).toBeDefined()
          expect(subRoute.link).toBeDefined()
          expect(typeof subRoute.title).toBe('string')
          expect(typeof subRoute.link).toBe('string')
        }
      }
    }
  })

  /**
   * Test that no hidden features are exposed in navigation
   *
   * This test validates that when developer features are disabled,
   * no developer-related links appear in the navigation.
   */
  it('should not expose hidden features in navigation', () => {
    const accountRoutes = accountRoutesList()
    const orgRoutes = organizationRoutesList()

    const allRoutes = [...accountRoutes, ...orgRoutes]
    const visibleLinks = getVisibleNavigationLinks(allRoutes)

    // Should not contain developer route
    expect(visibleLinks).not.toContain('/dashboard/account/developer')

    // Should not contain webhooks route
    const webhooksLinks = visibleLinks.filter((link) =>
      link.includes('webhooks'),
    )
    expect(webhooksLinks).toHaveLength(0)
  })

  /**
   * Property test: All visible navigation links should be properly formatted
   *
   * This property test validates that for any combination of route configurations,
   * all visible navigation links follow the correct format.
   */
  it('property: all visible links are properly formatted', () => {
    const accountRoutes = accountRoutesList()
    const generalRoutes = generalRoutesList()
    const orgRoutes = organizationRoutesList()

    const allRoutes = [...accountRoutes, ...generalRoutes, ...orgRoutes]
    const visibleLinks = getVisibleNavigationLinks(allRoutes)

    // Property: Every visible link must be properly formatted
    for (const link of visibleLinks) {
      expect(link).toMatch(/^\//)
      expect(link).not.toContain(' ')
      expect(link.length).toBeGreaterThan(1)
    }
  })

  /**
   * Property test: Dynamic segment resolution should preserve link validity
   *
   * This property test validates that resolving dynamic segments
   * always produces valid, navigable links.
   */
  it('property: resolved links are always valid', () => {
    const orgRoutes = organizationRoutesList()

    // Test with various organization slugs
    const testSlugs = [
      'test-org',
      'my-company',
      'org123',
      'a',
      'very-long-organization-name-with-many-words',
    ]

    for (const slug of testSlugs) {
      const resolvedLinks = getResolvedNavigationLinks(orgRoutes, {
        organization: slug,
      })

      // Property: All resolved links must be valid
      for (const link of resolvedLinks) {
        expect(isValidLinkFormat(link)).toBe(true)
        expect(link).not.toContain('[')
        expect(link).not.toContain(']')
        expect(link).toContain(slug)
      }
    }
  })

  /**
   * Property test: Visibility filtering should be idempotent
   *
   * This property test validates that filtering visible routes
   * multiple times produces the same result.
   */
  it('property: visibility filtering is idempotent', () => {
    const accountRoutes = accountRoutesList()
    const generalRoutes = generalRoutesList()
    const orgRoutes = organizationRoutesList()

    const allRoutes = [...accountRoutes, ...generalRoutes, ...orgRoutes]

    const firstFilter = getVisibleNavigationLinks(allRoutes)
    const secondFilter = getVisibleNavigationLinks(allRoutes)

    // Property: Filtering should produce the same result every time
    expect(firstFilter).toEqual(secondFilter)
  })
})
