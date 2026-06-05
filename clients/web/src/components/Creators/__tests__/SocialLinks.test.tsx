import { schemas } from '@/lib/api'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SocialLinks } from '../SocialLinks'

vi.mock('react-icons/fi', () => ({
  FiGlobe: ({ size }: any) => <div data-testid="globe-icon" data-size={size} />,
  FiInstagram: ({ size }: any) => (
    <div data-testid="instagram-icon" data-size={size} />
  ),
}))

vi.mock('react-icons/fa6', () => ({
  FaXTwitter: ({ size }: any) => (
    <div data-testid="twitter-icon" data-size={size} />
  ),
}))

describe('SocialLinks', () => {
  it('should render icons for configured platforms', () => {
    const links: schemas['SocialLinks'] = {
      twitter: 'https://twitter.com/test',
      instagram: 'https://instagram.com/test',
    }

    render(<SocialLinks links={links} />)

    expect(screen.getByTestId('twitter-icon')).toBeInTheDocument()
    expect(screen.getByTestId('instagram-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('globe-icon')).not.toBeInTheDocument()
  })

  it('should render all icons when all platforms are configured', () => {
    const links: schemas['SocialLinks'] = {
      twitter: 'https://twitter.com/test',
      instagram: 'https://instagram.com/test',
      website: 'https://example.com',
    }

    render(<SocialLinks links={links} />)

    expect(screen.getByTestId('twitter-icon')).toBeInTheDocument()
    expect(screen.getByTestId('instagram-icon')).toBeInTheDocument()
    expect(screen.getByTestId('globe-icon')).toBeInTheDocument()
  })

  it('should display icons in correct order: twitter, instagram, website', () => {
    const links: schemas['SocialLinks'] = {
      website: 'https://example.com',
      twitter: 'https://twitter.com/test',
      instagram: 'https://instagram.com/test',
    }

    render(<SocialLinks links={links} />)

    const linkElements = screen.getAllByRole('link')
    expect(linkElements).toHaveLength(3)

    expect(linkElements[0]).toHaveAttribute('aria-label', 'Twitter')
    expect(linkElements[1]).toHaveAttribute('aria-label', 'Instagram')
    expect(linkElements[2]).toHaveAttribute('aria-label', 'Website')
  })

  it('should return null when no links are configured', () => {
    const links: schemas['SocialLinks'] = {}

    const { container } = render(<SocialLinks links={links} />)

    expect(container.firstChild).toBeNull()
  })

  it('should return null when all links are undefined', () => {
    const links: schemas['SocialLinks'] = {
      twitter: undefined,
      instagram: undefined,
      website: undefined,
    }

    const { container } = render(<SocialLinks links={links} />)

    expect(container.firstChild).toBeNull()
  })

  it('should open links in new tab with proper rel attributes', () => {
    const links: schemas['SocialLinks'] = {
      twitter: 'https://twitter.com/test',
    }

    render(<SocialLinks links={links} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should have correct href for each platform', () => {
    const links: schemas['SocialLinks'] = {
      twitter: 'https://twitter.com/test',
      instagram: 'https://instagram.com/test',
      website: 'https://example.com',
    }

    render(<SocialLinks links={links} />)

    const linkElements = screen.getAllByRole('link')

    expect(linkElements[0]).toHaveAttribute('href', 'https://twitter.com/test')
    expect(linkElements[1]).toHaveAttribute(
      'href',
      'https://instagram.com/test',
    )
    expect(linkElements[2]).toHaveAttribute('href', 'https://example.com')
  })

  it('should have correct aria-label for accessibility', () => {
    const links: schemas['SocialLinks'] = {
      twitter: 'https://twitter.com/test',
      instagram: 'https://instagram.com/test',
      website: 'https://example.com',
    }

    render(<SocialLinks links={links} />)

    expect(screen.getByLabelText('Twitter')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument()
    expect(screen.getByLabelText('Website')).toBeInTheDocument()
  })

  it('should render only website when only website is configured', () => {
    const links: schemas['SocialLinks'] = {
      website: 'https://example.com',
    }

    render(<SocialLinks links={links} />)

    expect(screen.queryByTestId('twitter-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('instagram-icon')).not.toBeInTheDocument()
    expect(screen.getByTestId('globe-icon')).toBeInTheDocument()
  })
})
