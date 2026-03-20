/**
 * Navigation Link Validation Utilities
 *
 * This module provides utilities for validating navigation links to ensure
 * all links in the application navigate to valid pages that return HTTP 200
 * status codes and render without errors.
 *
 * Feature: platform-rebrand
 * Requirements: 9.1, 9.2
 */

import { Route, SubRoute } from '@/components/Dashboard/navigation'

/**
 * Extract all navigation links from route configuration
 *
 * @param routes - Array of route configurations
 * @returns Array of all link URLs from routes and sub-routes
 */
export function extractNavigationLinks(routes: Route[]): string[] {
  const links: string[] = []

  for (const route of routes) {
    // Add main route link
    links.push(route.link)

    // Add sub-route links if they exist
    if (route.subs && Array.isArray(route.subs)) {
      for (const subRoute of route.subs) {
        links.push(subRoute.link)
      }
    }
  }

  return links
}

/**
 * Validate that a link is properly formatted
 *
 * @param link - The link URL to validate
 * @returns True if the link is valid, false otherwise
 */
export function isValidLinkFormat(link: string): boolean {
  // Links should start with /
  if (!link.startsWith('/')) {
    return false
  }

  // Links should not contain spaces
  if (link.includes(' ')) {
    return false
  }

  // Links should not be empty
  if (link === '/') {
    return false
  }

  return true
}

/**
 * Check if a route should be visible based on its 'if' condition
 *
 * @param route - The route to check
 * @returns True if the route should be visible, false otherwise
 */
export function isRouteVisible(route: Route): boolean {
  return route.if === true || route.if === undefined
}

/**
 * Check if a sub-route should be visible based on its 'if' condition
 *
 * @param subRoute - The sub-route to check
 * @returns True if the sub-route should be visible, false otherwise
 */
export function isSubRouteVisible(subRoute: SubRoute): boolean {
  if (subRoute.if === undefined) {
    return true
  }

  if (typeof subRoute.if === 'boolean') {
    return subRoute.if
  }

  if (typeof subRoute.if === 'function') {
    return subRoute.if()
  }

  return false
}

/**
 * Get all visible navigation links from route configuration
 *
 * This function filters routes based on their visibility conditions
 * and returns only the links that should be accessible to users.
 *
 * @param routes - Array of route configurations
 * @returns Array of visible link URLs
 */
export function getVisibleNavigationLinks(routes: Route[]): string[] {
  const links: string[] = []

  for (const route of routes) {
    // Only include visible routes
    if (!isRouteVisible(route)) {
      continue
    }

    // Add main route link
    links.push(route.link)

    // Add visible sub-route links
    if (route.subs && Array.isArray(route.subs)) {
      for (const subRoute of route.subs) {
        if (isSubRouteVisible(subRoute)) {
          links.push(subRoute.link)
        }
      }
    }
  }

  return links
}

/**
 * Validate that all navigation links are properly formatted
 *
 * @param routes - Array of route configurations
 * @returns Object with validation results
 */
export function validateNavigationLinkFormats(routes: Route[]): {
  valid: boolean
  invalidLinks: Array<{ link: string; reason: string }>
} {
  const invalidLinks: Array<{ link: string; reason: string }> = []
  const allLinks = extractNavigationLinks(routes)

  for (const link of allLinks) {
    if (!isValidLinkFormat(link)) {
      let reason = 'Invalid format'

      if (!link.startsWith('/')) {
        reason = 'Link must start with /'
      } else if (link.includes(' ')) {
        reason = 'Link contains spaces'
      } else if (link === '/') {
        reason = 'Link is empty'
      }

      invalidLinks.push({ link, reason })
    }
  }

  return {
    valid: invalidLinks.length === 0,
    invalidLinks,
  }
}

/**
 * Check if a link contains dynamic segments (e.g., [organization])
 *
 * @param link - The link URL to check
 * @returns True if the link contains dynamic segments, false otherwise
 */
export function hasDynamicSegments(link: string): boolean {
  return link.includes('[') && link.includes(']')
}

/**
 * Replace dynamic segments in a link with sample values
 *
 * @param link - The link URL with dynamic segments
 * @param replacements - Object mapping segment names to replacement values
 * @returns Link with dynamic segments replaced
 */
export function replaceDynamicSegments(
  link: string,
  replacements: Record<string, string>,
): string {
  let result = link

  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(`[${key}]`, value)
  }

  return result
}

/**
 * Get all unique navigation links with dynamic segments resolved
 *
 * @param routes - Array of route configurations
 * @param dynamicValues - Object mapping dynamic segment names to values
 * @returns Array of resolved link URLs
 */
export function getResolvedNavigationLinks(
  routes: Route[],
  dynamicValues: Record<string, string>,
): string[] {
  const visibleLinks = getVisibleNavigationLinks(routes)
  const resolvedLinks = visibleLinks.map((link) => {
    if (hasDynamicSegments(link)) {
      return replaceDynamicSegments(link, dynamicValues)
    }
    return link
  })

  // Return unique links
  return Array.from(new Set(resolvedLinks))
}
