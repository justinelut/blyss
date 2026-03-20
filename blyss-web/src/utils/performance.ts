/**
 * Performance monitoring utilities for tracking Core Web Vitals
 * Implements requirements 10.1, 10.2 for marketplace homepage
 */

export interface PerformanceMetrics {
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
}

/**
 * Report Core Web Vitals to analytics
 * This can be integrated with PostHog or other analytics platforms
 */
export function reportWebVitals(metric: PerformanceMetrics) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Performance]', metric)
  }

  // In production, send to analytics
  // Example: posthog.capture('web_vitals', metric)
}

/**
 * Measure and report First Contentful Paint
 */
export function measureFCP() {
  if (typeof window === 'undefined') return

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        const fcp = entry.startTime
        reportWebVitals({ fcp })

        // Validate against requirement 10.1 (< 1500ms)
        if (fcp > 1500) {
          console.warn(
            `[Performance] FCP (${fcp.toFixed(2)}ms) exceeds target of 1500ms`,
          )
        }
      }
    }
  })

  observer.observe({ entryTypes: ['paint'] })
}

/**
 * Measure and report Largest Contentful Paint
 */
export function measureLCP() {
  if (typeof window === 'undefined') return

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    const lcp = lastEntry.startTime

    reportWebVitals({ lcp })

    // Validate against requirement 10.2 (< 2500ms)
    if (lcp > 2500) {
      console.warn(
        `[Performance] LCP (${lcp.toFixed(2)}ms) exceeds target of 2500ms`,
      )
    }
  })

  observer.observe({ entryTypes: ['largest-contentful-paint'] })
}

/**
 * Measure Time to First Byte
 */
export function measureTTFB() {
  if (typeof window === 'undefined') return

  const navigationEntry = performance.getEntriesByType(
    'navigation',
  )[0] as PerformanceNavigationTiming

  if (navigationEntry) {
    const ttfb = navigationEntry.responseStart - navigationEntry.requestStart
    reportWebVitals({ ttfb })

    // Validate against requirement 10.3 (< 500ms for API)
    if (ttfb > 500) {
      console.warn(
        `[Performance] TTFB (${ttfb.toFixed(2)}ms) exceeds target of 500ms`,
      )
    }
  }
}

/**
 * Initialize all performance monitoring
 * Call this in the root layout or page component
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  measureFCP()
  measureLCP()
  measureTTFB()
}
