import { render, screen } from '@testing-library/react'
import { usePathname, useRouter } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StorefrontTabs } from '../StorefrontTabs'

vi.mock('next/navigation')

describe('StorefrontTabs', () => {
  const mockPush = vi.fn()
  const mockPathname = '/creator/test-creator'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
    ;(usePathname as any).mockReturnValue(mockPathname)
  })

  it('should render three tabs', () => {
    render(<StorefrontTabs activeTab="overview" />)

    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('Subscriptions')).toBeInTheDocument()
  })

  it('should highlight the active tab', () => {
    render(<StorefrontTabs activeTab="products" />)

    const productsTab = screen.getByText('Products')
    expect(productsTab).toHaveClass('border-blue-500')
    expect(productsTab).toHaveClass('text-blue-600')
  })

  it('should not highlight inactive tabs', () => {
    render(<StorefrontTabs activeTab="products" />)

    const overviewTab = screen.getByText('Overview')
    const subscriptionsTab = screen.getByText('Subscriptions')

    expect(overviewTab).toHaveClass('border-transparent')
    expect(overviewTab).toHaveClass('text-gray-600')
    expect(subscriptionsTab).toHaveClass('border-transparent')
    expect(subscriptionsTab).toHaveClass('text-gray-600')
  })

  it('should update URL when clicking a tab', () => {
    render(<StorefrontTabs activeTab="overview" />)

    const productsTab = screen.getByText('Products')
    productsTab.click()

    expect(mockPush).toHaveBeenCalledWith('/creator/test-creator?tab=products')
  })

  it('should remove tab parameter when clicking overview tab', () => {
    render(<StorefrontTabs activeTab="products" />)

    const overviewTab = screen.getByText('Overview')
    overviewTab.click()

    expect(mockPush).toHaveBeenCalledWith('/creator/test-creator')
  })

  it('should add tab parameter for subscriptions tab', () => {
    render(<StorefrontTabs activeTab="overview" />)

    const subscriptionsTab = screen.getByText('Subscriptions')
    subscriptionsTab.click()

    expect(mockPush).toHaveBeenCalledWith(
      '/creator/test-creator?tab=subscriptions',
    )
  })

  it('should have correct styling classes', () => {
    render(<StorefrontTabs activeTab="overview" />)

    const container = screen.getByText('Overview').closest('div')
    expect(container).toHaveClass('border-b')
    expect(container).toHaveClass('border-gray-200')
  })

  it('should render tabs as buttons', () => {
    render(<StorefrontTabs activeTab="overview" />)

    const overviewTab = screen.getByText('Overview')
    expect(overviewTab.tagName).toBe('BUTTON')
  })
})
