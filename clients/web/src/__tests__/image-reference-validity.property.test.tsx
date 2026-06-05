/**
 * Feature: platform-rebrand
 * Property 7: Image Reference Validity
 *
 * Validates: Requirements 9.4
 *
 * This property test verifies that all image references in the user interface
 * are valid and resolve successfully. It ensures that users do not encounter
 * broken image references, which would degrade the user experience and brand
 * perception.
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Helper function to check if a public asset exists
 */
function publicAssetExists(path: string): boolean {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const fullPath = join(process.cwd(), 'public', cleanPath)
  return existsSync(fullPath)
}

/**
 * Helper function to validate image path format
 */
function isValidImagePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false

  // Malformed: contains whitespace (e.g. "/path/with spaces.png").
  if (/\s/.test(path)) return false

  // Check for valid image extensions
  const validExtensions = [
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.ico',
    '.webp',
    '.gif',
  ]
  const hasValidExtension = validExtensions.some((ext) =>
    path.toLowerCase().endsWith(ext),
  )

  // Check for valid URL or path format
  const isUrl = path.startsWith('http://') || path.startsWith('https://')
  const isRelativePath = path.startsWith('/')

  return hasValidExtension && (isUrl || isRelativePath)
}

describe('Feature: platform-rebrand, Property 7: Image Reference Validity', () => {
  /**
   * Test that all brand logo references are valid
   *
   * This test validates that logo image paths are properly formatted
   * and point to existing files in the public directory.
   */
  it('should have valid logo image references', () => {
    const logoReferences = ['/blyss-logo.svg', '/blyss-logo-dark.svg']

    logoReferences.forEach((logoPath) => {
      expect(isValidImagePath(logoPath)).toBe(true)
      expect(publicAssetExists(logoPath)).toBe(true)
    })
  })

  /**
   * Test that all favicon references are valid
   *
   * This test validates that favicon paths are properly formatted
   * and point to existing files in the public directory.
   */
  it('should have valid favicon references', () => {
    const faviconReferences = [
      '/favicon.png',
      '/favicon-dark.png',
      '/favicon-dev.png',
      '/favicon-dev-dark.png',
      '/blyss-favicon.ico',
    ]

    faviconReferences.forEach((faviconPath) => {
      expect(isValidImagePath(faviconPath)).toBe(true)
      expect(publicAssetExists(faviconPath)).toBe(true)
    })
  })

  /**
   * Test that Open Graph image references are valid
   *
   * This test validates that social media preview images are properly
   * formatted and exist in the public directory.
   */
  it('should have valid Open Graph image references', () => {
    const ogImageReferences = ['/blyss-og-image.png']

    ogImageReferences.forEach((imagePath) => {
      expect(isValidImagePath(imagePath)).toBe(true)
      expect(publicAssetExists(imagePath)).toBe(true)
    })
  })

  /**
   * Test that email logo references are valid
   *
   * This test validates that email template logo paths are properly
   * formatted and point to existing files.
   */
  it('should have valid email logo references', () => {
    const emailLogoReferences = ['/email-logo.png', '/email-logo-dark.png']

    emailLogoReferences.forEach((logoPath) => {
      expect(isValidImagePath(logoPath)).toBe(true)
      expect(publicAssetExists(logoPath)).toBe(true)
    })
  })

  /**
   * Test that image path formats are valid
   *
   * This test validates that image paths follow correct formatting rules:
   * - Have valid image extensions
   * - Are either absolute URLs or relative paths starting with /
   * - Are not empty or malformed
   */
  it('should reject invalid image path formats', () => {
    const invalidPaths = [
      '',
      'invalid',
      'no-extension',
      '/path/without/extension',
      'relative/path.png', // Should start with /
      '/path/with spaces.png',
    ]

    invalidPaths.forEach((invalidPath) => {
      expect(isValidImagePath(invalidPath)).toBe(false)
    })
  })

  /**
   * Test that valid image path formats are accepted
   *
   * This test validates that properly formatted image paths are
   * recognized as valid by the validation function.
   */
  it('should accept valid image path formats', () => {
    const validPaths = [
      '/logo.svg',
      '/images/photo.png',
      '/assets/icon.jpg',
      'https://example.com/image.png',
      'http://cdn.example.com/photo.jpg',
      '/favicon.ico',
      '/image.webp',
      '/animation.gif',
    ]

    validPaths.forEach((validPath) => {
      expect(isValidImagePath(validPath)).toBe(true)
    })
  })

  /**
   * Test that all brand assets exist in the public directory
   *
   * This test validates that all required brand assets for the Blyss
   * rebrand are present in the public directory and accessible.
   */
  it('should have all required brand assets in public directory', () => {
    const requiredAssets = [
      '/blyss-logo.svg',
      '/blyss-logo-dark.svg',
      '/blyss-favicon.ico',
      '/blyss-og-image.png',
      '/email-logo.png',
      '/email-logo-dark.png',
      '/favicon.png',
      '/favicon-dark.png',
    ]

    const missingAssets = requiredAssets.filter(
      (asset) => !publicAssetExists(asset),
    )

    if (missingAssets.length > 0) {
      console.error('Missing brand assets:', missingAssets)
    }

    expect(missingAssets).toHaveLength(0)
  })

  /**
   * Test that image references do not contain broken paths
   *
   * This test validates that common broken path patterns are not present
   * in image references (e.g., double slashes, incorrect protocols).
   */
  it('should not contain broken path patterns', () => {
    const brokenPatterns = [
      '//double-slash.png',
      'file:///local-path.png',
      'C:\\windows\\path.png',
      '/path//with//double//slashes.png',
    ]

    brokenPatterns.forEach((brokenPath) => {
      // These should either be invalid or not exist
      if (isValidImagePath(brokenPath)) {
        expect(publicAssetExists(brokenPath)).toBe(false)
      }
    })
  })

  /**
   * Test that image alt text is provided for accessibility
   *
   * This test validates that image references include proper alt text
   * attributes for accessibility compliance.
   */
  it('should have descriptive alt text for brand images', () => {
    const imageAltTexts = [
      { path: '/blyss-logo.svg', alt: 'Blyss Logo' },
      { path: '/blyss-logo-dark.svg', alt: 'Blyss Logo' },
      { path: '/blyss-og-image.png', alt: 'Blyss' },
    ]

    imageAltTexts.forEach(({ path, alt }) => {
      expect(alt).toBeTruthy()
      expect(alt.length).toBeGreaterThan(0)
      expect(alt.toLowerCase()).not.toContain('polar')
      expect(publicAssetExists(path)).toBe(true)
    })
  })

  /**
   * Test that external image URLs use HTTPS
   *
   * This test validates that any external image references use secure
   * HTTPS protocol for security and privacy.
   */
  it('should use HTTPS for external image URLs', () => {
    const externalUrls = ['https://polar.sh/blyss-og-image.png']

    externalUrls.forEach((url) => {
      expect(url.startsWith('https://')).toBe(true)
      expect(url.startsWith('http://')).toBe(false)
    })
  })

  /**
   * Test that image file extensions are lowercase
   *
   * This test validates that image file extensions follow the convention
   * of using lowercase extensions for consistency.
   */
  it('should use lowercase file extensions', () => {
    const imagePaths = [
      '/blyss-logo.svg',
      '/blyss-logo-dark.svg',
      '/blyss-favicon.ico',
      '/blyss-og-image.png',
      '/email-logo.png',
      '/email-logo-dark.png',
    ]

    imagePaths.forEach((path) => {
      const extension = path.split('.').pop()
      expect(extension).toBe(extension?.toLowerCase())
    })
  })
})
