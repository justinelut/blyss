import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileEditor } from './ProfileEditor'

const mockMutateAsync = vi.fn()
const mockUseUpdateProfile = vi.fn()

vi.mock('@/hooks/queries/creators', () => ({
  useUpdateProfile: (organizationId: string) =>
    mockUseUpdateProfile(organizationId),
}))

vi.mock('../Toast/use-toast', () => ({
  toast: vi.fn(),
}))

vi.mock('@/utils/api/errors', () => ({
  setValidationErrors: vi.fn(),
}))

const mockOrganization = {
  id: 'org-123',
  name: 'Test Creator',
  slug: 'test-creator',
  bio: 'Test bio',
  social_links: {
    twitter: 'https://twitter.com/testcreator',
    instagram: 'https://instagram.com/testcreator',
    website: 'https://example.com',
  },
}

describe('ProfileEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUpdateProfile.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })
  })

  it('renders form with bio and social link inputs', () => {
    render(<ProfileEditor organization={mockOrganization as any} />)

    expect(screen.getByLabelText('Bio')).toBeInTheDocument()
    expect(screen.getByLabelText('Twitter / X URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Website URL')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /save profile/i }),
    ).toBeInTheDocument()
  })

  it('populates form with existing organization data', () => {
    render(<ProfileEditor organization={mockOrganization as any} />)

    expect(screen.getByLabelText('Bio')).toHaveValue('Test bio')
    expect(screen.getByLabelText('Twitter / X URL')).toHaveValue(
      'https://twitter.com/testcreator',
    )
    expect(screen.getByLabelText('Instagram URL')).toHaveValue(
      'https://instagram.com/testcreator',
    )
    expect(screen.getByLabelText('Website URL')).toHaveValue(
      'https://example.com',
    )
  })

  it('displays character count for bio field', () => {
    render(<ProfileEditor organization={mockOrganization as any} />)

    expect(screen.getByText('8/500 characters')).toBeInTheDocument()
  })

  it('validates bio max length', async () => {
    const user = userEvent.setup()
    render(
      <ProfileEditor organization={{ ...mockOrganization, bio: '' } as any} />,
    )

    const bioInput = screen.getByLabelText('Bio')
    const longBio = 'a'.repeat(501)

    await user.clear(bioInput)
    await user.type(bioInput, longBio)

    await waitFor(() => {
      expect(
        screen.getByText(/bio must be 500 characters or less/i),
      ).toBeInTheDocument()
    })
  })

  it('validates Twitter URL format', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ data: {}, error: null })

    render(
      <ProfileEditor
        organization={{ ...mockOrganization, social_links: {} } as any}
      />,
    )

    const twitterInput = screen.getByLabelText('Twitter / X URL')
    await user.clear(twitterInput)
    await user.type(twitterInput, 'invalid-url')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/twitter url must start with/i),
      ).toBeInTheDocument()
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('validates Instagram URL format', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ data: {}, error: null })

    render(
      <ProfileEditor
        organization={{ ...mockOrganization, social_links: {} } as any}
      />,
    )

    const instagramInput = screen.getByLabelText('Instagram URL')
    await user.clear(instagramInput)
    await user.type(instagramInput, 'https://facebook.com/test')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/instagram url must start with/i),
      ).toBeInTheDocument()
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('validates Website URL format', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ data: {}, error: null })

    render(
      <ProfileEditor
        organization={{ ...mockOrganization, social_links: {} } as any}
      />,
    )

    const websiteInput = screen.getByLabelText('Website URL')
    await user.clear(websiteInput)
    await user.type(websiteInput, 'not-a-url')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/website url must start with/i),
      ).toBeInTheDocument()
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({
      data: { slug: 'test-creator' },
      error: null,
    })

    render(<ProfileEditor organization={mockOrganization as any} />)

    const bioInput = screen.getByLabelText('Bio')
    await user.clear(bioInput)
    await user.type(bioInput, 'Updated bio')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        bio: 'Updated bio',
        social_links: {
          twitter: 'https://twitter.com/testcreator',
          instagram: 'https://instagram.com/testcreator',
          website: 'https://example.com',
        },
      })
    })
  })

  it('displays success toast on successful update', async () => {
    const user = userEvent.setup()
    const { toast } = await import('../Toast/use-toast')
    mockMutateAsync.mockResolvedValue({
      data: { slug: 'test-creator' },
      error: null,
    })

    render(<ProfileEditor organization={mockOrganization as any} />)

    const bioInput = screen.getByLabelText('Bio')
    await user.clear(bioInput)
    await user.type(bioInput, 'Updated bio')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Profile Updated',
        description: 'Your creator profile has been updated successfully',
      })
    })
  })

  it('displays error toast on failed update', async () => {
    const user = userEvent.setup()
    const { toast } = await import('../Toast/use-toast')
    mockMutateAsync.mockResolvedValue({
      data: null,
      error: { detail: 'Update failed' },
    })

    render(<ProfileEditor organization={mockOrganization as any} />)

    const bioInput = screen.getByLabelText('Bio')
    await user.clear(bioInput)
    await user.type(bioInput, 'Updated bio')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Profile Update Failed',
        description: 'Update failed',
        variant: 'destructive',
      })
    })
  })

  it('disables submit button when form is pristine', () => {
    render(<ProfileEditor organization={mockOrganization as any} />)

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when form is dirty', async () => {
    const user = userEvent.setup()
    render(<ProfileEditor organization={mockOrganization as any} />)

    const bioInput = screen.getByLabelText('Bio')
    await user.type(bioInput, ' updated')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockUseUpdateProfile.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    })

    render(<ProfileEditor organization={mockOrganization as any} />)

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    expect(submitButton).toBeDisabled()
  })

  it('omits empty social links from submission', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({
      data: { slug: 'test-creator' },
      error: null,
    })

    render(
      <ProfileEditor
        organization={{ ...mockOrganization, social_links: {} } as any}
      />,
    )

    const bioInput = screen.getByLabelText('Bio')
    await user.clear(bioInput)
    await user.type(bioInput, 'Updated bio')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        bio: 'Updated bio',
        social_links: undefined,
      })
    })
  })
})
