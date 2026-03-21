/**
 * Feature: platform-rebrand
 * Property 6: Hidden Feature Link Removal
 *
 * For any feature that is hidden (developer tools, webhooks, GitHub integration),
 * navigation should not contain links to that feature's pages.
 *
 * Validates: Requirements 9.3
 */

import { FEATURES } from '@/utils/config'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  useAccountRoutes,
  useDashboardRoutes,
  useOrganizationRoutes,
} from '../navigation'

describe('Feature: platform-rebrand, Property 6: Hidden Feature Link Removal', () => {
  it('should not include developer route when developerTools feature is disabled', () => {
    // Given: developerTools feature is disabled
    expect(FEATURES.developerTools).toBe(false)

    // When: account routes are generated
    const { result } = renderHook(() => useAccountRoutes())
    const routes = result.current

    // Then: developer route should not be present
    const developerRoute = routes.find((route) => route.id === 'developer')
    expect(developerRoute).toBeUndefined()
  })

  it('should not include webhooks sub-route when webhooks feature is disabled', () => {
    // Given: webhooks feature is disabled
    expect(FEATURES.webhooks).toBe(false)

    // When: organization routes are generated
    const { result } = renderHook(() => useOrganizationRoutes())
    const routes = result.current

    // Then: webhooks sub-route should not be present in settings
    const settingsRoute = routes.find((route) => route.id === 'settings')
    expect(settingsRoute).toBeDefined()

    const webhooksSubRoute = settingsRoute?.subs?.find(
      (sub) => sub.title === 'Webhooks',
    )
    expect(webhooksSubRoute).toBeUndefined()
  })

  it('should filter out all routes with if=false', () => {
    // When: dashboard routes are generated
    const { result } = renderHook(() => useDashboardRoutes())
    const routes = result.current

    // Then: all routes should have if=true or be filtered out
    routes.forEach((route) => {
      expect(route.if).toBe(true)
    })
  })

  it('should filter out all sub-routes with if=false', () => {
    // When: dashboard routes are generated
    const { result } = renderHook(() => useDashboardRoutes())
    const routes = result.current

    // Then: all sub-routes should have if=true or be filtered out
    routes.forEach((route) => {
      if (route.subs) {
        route.subs.forEach((subRoute) => {
          // Sub-routes without explicit if are considered enabled
          if (subRoute.if !== undefined) {
            expect(subRoute.if).toBe(true)
          }
        })
      }
    })
  })

  it('should not expose any developer-related links when feature is disabled', () => {
    // Given: developerTools feature is disabled
    expect(FEATURES.developerTools).toBe(false)

    // When: all routes are generated
    const { result: accountResult } = renderHook(() => useAccountRoutes())
    const { result: dashboardResult } = renderHook(() => useDashboardRoutes())

    const allRoutes = [...accountResult.current, ...dashboardResult.current]

    // Then: no route should link to developer pages
    const developerLinks = allRoutes.filter(
      (route) =>
        route.link.includes('/developer') ||
        route.title.toLowerCase().includes('developer'),
    )

    expect(developerLinks).toHaveLength(0)
  })

  it('should not expose any webhook-related links when feature is disabled', () => {
    // Given: webhooks feature is disabled
    expect(FEATURES.webhooks).toBe(false)

    // When: all routes are generated
    const { result: orgResult } = renderHook(() => useOrganizationRoutes())
    const { result: dashboardResult } = renderHook(() => useDashboardRoutes())

    const allRoutes = [...orgResult.current, ...dashboardResult.current]

    // Then: no route or sub-route should link to webhook pages
    const webhookLinks: any[] = []

    allRoutes.forEach((route) => {
      if (
        route.link.includes('/webhooks') ||
        route.title.toLowerCase().includes('webhook')
      ) {
        webhookLinks.push(route)
      }

      if (route.subs) {
        route.subs.forEach((sub) => {
          if (
            sub.link.includes('/webhooks') ||
            sub.title.toLowerCase().includes('webhook')
          ) {
            webhookLinks.push(sub)
          }
        })
      }
    })

    expect(webhookLinks).toHaveLength(0)
  })
})
