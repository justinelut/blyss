// Feature: creator-storefronts, Property 11: Tab State URL Persistence
// For any tab selection (overview, products, or subscriptions), the URL parameter should reflect
// the selected tab, and loading the page with that URL parameter should activate the corresponding tab.

import { render, screen } from '@testing-library/react'
import { usePathname, useRouter } from 'next/navigation'
import { describe, expect, it, vi } from 'vitest'
import { StorefrontTabs } from '../StorefrontTabs'

vi.mock('next/navigation')

describe('Property 11: Tab State URL Persistence', () => {
  const mockPush = vi.fn()
  const mockPathname = '/creator/test-creator'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
    ;(usePathname as any).mockReturnValue(mockPathname)
  })

  // Property-based test: For any tab selection, URL should reflect tab state
  const tabs = [
    { id: 'overview', expectedUrl: '/creator/test-creator' },
    { id: 'products', expectedUrl: '/creator/test-creator?tab=products' },
    {
      id: 'subscriptions',
      expectedUrl: '/creator/test-creator?tab=subscriptions',
    },
  ]

  it('should persist tab state in URL for all tab selections', () => {
    tabs.forEach(({ id, expectedUrl }) => {
      vi.clearAllMocks()

      const { rerender } = render(<StorefrontTabs activeTab={id} />)

      // Verify the correct tab is highlighted
      const tabButton = screen.getByText(
        id.charAt(0).toUpperCase() + id.slice(1),
      )
      expect(tabButton).toHaveClass('border-blue-500')
      expect(tabButton).toHaveClass('text-blue-600')

      // Simulate clicking the tab
      tabButton.click()

      // Verify URL was updated correctly
      expect(mockPush).toHaveBeenCalledWith(expectedUrl)

      // Simulate loading the page with the URL parameter
      rerender(<StorefrontTabs activeTab={id} />)

      // Verify the tab is still active after reload
      expect(tabButton).toHaveClass('border-blue-500')
      expect(tabButton).toHaveClass('text-blue-600')
    })
  })

  it('should handle overview tab without URL parameter', () => {
    render(<StorefrontTabs activeTab="overview" />)

    const overviewButton = screen.getByText('Overview')
    overviewButton.click()

    // Overview tab should not have a query parameter
    expect(mockPush).toHaveBeenCalledWith('/creator/test-creator')
  })

  it('should add tab parameter for non-default tabs', () => {
    render(<StorefrontTabs activeTab="overview" />)

    const productsButton = screen.getByText('Products')
    productsButton.click()

    expect(mockPush).toHaveBeenCalledWith(
      '/creator/test-creator?tab=products',
    )

    vi.clearAllMocks()

    const subscriptionsButton = screen.getByText('Subscriptions')
    subscriptionsButton.click()

    expect(mockPush).toHaveBeenCalledWith(
      '/creator/test-creator?tab=subscriptions',
    )
  })

  it('should maintain tab state across multiple interactions', () => {
    const { rerender } = render(<StorefrontTabs activeTab="overview" />)

    // Click Products tab
    screen.getByText('Products').click()
    expect(mockPush).toHaveBeenCalledWith(
      '/creator/test-creator?tab=products',
    )

    // Simulate URL change and rerender
    rerender(<StorefrontTabs activeTab="products" />)
    expect(screen.getByText('Products')).toHaveClass('border-blue-500')

    // Click Subscriptions tab
    screen.getByText('Subscriptions').click()
    expect(mockPush).toHaveBeenCalledWith(
      '/creator/test-creator?tab=subscriptions',
    )

    // Simulate URL change and rerender
    rerender(<StorefrontTabs activeTab="subscriptions" />)
    expect(screen.getByText('Subscriptions')).toHaveClass('border-blue-500')

    // Click Overview tab
    screen.getByText('Overview').click()
    expect(mockPush).toHaveBeenCalledWith('/creator/test-creator')

    // Simulate URL change and rerender
    rerender(<StorefrontTabs activeTab="overview" />)
    expect(screen.getByText('Overview')).toHaveClass('border-blue-500')
  })

  // Simulate property-based testing with multiple iterations
  it('should handle 100 random tab selections correctly', () => {
    const tabIds = ['overview', 'products', 'subscriptions']
    const iterations = 100

    for (let i = 0; i < iterations; i++) {
      vi.clearAllMocks()

      // Randomly select a tab
      const randomTab = tabIds[Math.floor(Math.random() * tabIds.length)]

      const { rerender } = render(<StorefrontTabs activeTab={randomTab} />)

      // Verify the correct tab is highlighted
      const tabLabel =
        randomTab.charAt(0).toUpperCase() + randomTab.slice(1)
      const tabButton = screen.getByText(tabLabel)
      expect(tabButton).toHaveClass('border-blue-500')

      // Click the tab
      tabButton.click()

      // Verify URL is correct
      const expectedUrl =
        randomTab === 'overview'
          ? '/creator/test-creator'
          : `/creator/test-creator?tab=${randomTab}`
      expect(mockPush).toHaveBeenCalledWith(expectedUrl)

      // Simulate reload with the same tab
      rerender(<StorefrontTabs activeTab={randomTab} />)

      // Verify tab is still active
      expect(tabButton).toHaveClass('border-blue-500')
    }
  })
})
