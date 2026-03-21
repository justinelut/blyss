import { useCreators } from '@/hooks/queries/creators'
import { schemas } from '@/lib/api'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreatorsDirectory } from '../CreatorsDirectory'

vi.mock('@/hooks/queries/creators')

vi.mock('../CreatorCard', () => ({
  CreatorCard: ({ creator }: any) => (
    <div data-testid="creator-card" data-creator-id={creator.id}>
      {creator.name}
    </div>
  ),
}))

vi.mock('@/components/atoms/Input', () => ({
  default: ({ value, onChange, ...props }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={onChange}
      {...props}
    />
  ),
}))

describe('CreatorsDirectory', () => {
  const mockCreators: schemas['CreatorSummarySchema'][] = [
    {
      id: 'creator-1',
      name: 'Alice Creator',
      slug: 'alice-creator',
      avatar_url: 'https://example.com/alice.jpg',
      product_count: 3,
    },
    {
      id: 'creator-2',
      name: 'Bob Creator',
      slug: 'bob-creator',
      avatar_url: null,
      product_count: 7,
    },
    {
      id: 'creator-3',
      name: 'Charlie Creator',
      slug: 'charlie-creator',
      avatar_url: 'https://example.com/charlie.jpg',
      product_count: 1,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all creators from initial data', () => {
    ;(useCreators as any).mockReturnValue({
      data: mockCreators,
      error: null,
    })

    render(<CreatorsDirectory initialCreators={mockCreators} />)

    expect(screen.getByText('Alice Creator')).toBeInTheDocument()
    expect(screen.getByText('Bob Creator')).toBeInTheDocument()
    expect(screen.getByText('Charlie Creator')).toBeInTheDocument()
  })

  it('should render search input', () => {
    ;(useCreators as any).mockReturnValue({
      data: mockCreators,
      error: null,
    })

    render(<CreatorsDirectory initialCreators={mockCreators} />)

    const searchInput = screen.getByTestId('search-input')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('type', 'search')
    expect(searchInput).toHaveAttribute('placeholder', 'Search creators...')
  })

  it('should update search value on input change', async () => {
    ;(useCreators as any).mockReturnValue({
      data: mockCreators,
      error: null,
    })

    render(<CreatorsDirectory initialCreators={mockCreators} />)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'Alice' } })

    await waitFor(() => {
      expect(searchInput).toHaveValue('Alice')
    })
  })

  it('should call useCreators with search parameter', async () => {
    const mockUseCreators = vi.fn().mockReturnValue({
      data: mockCreators,
      error: null,
    })
    ;(useCreators as any).mockImplementation(mockUseCreators)

    render(<CreatorsDirectory initialCreators={mockCreators} />)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'Alice' } })

    await waitFor(() => {
      expect(mockUseCreators).toHaveBeenCalledWith(
        { search: 'Alice' },
        expect.objectContaining({
          initialData: mockCreators,
          keepPreviousData: true,
        }),
      )
    })
  })

  it('should display empty state when no creators found', () => {
    ;(useCreators as any).mockReturnValue({
      data: [],
      error: null,
    })

    render(<CreatorsDirectory initialCreators={[]} />)

    expect(
      screen.getByText('No creators found matching your search.'),
    ).toBeInTheDocument()
  })

  it('should display error state when API call fails', () => {
    ;(useCreators as any).mockReturnValue({
      data: null,
      error: new Error('API Error'),
    })

    render(<CreatorsDirectory initialCreators={mockCreators} />)

    expect(
      screen.getByText('Failed to load creators. Please try again.'),
    ).toBeInTheDocument()
  })

  it('should render creators in a grid layout', () => {
    ;(useCreators as any).mockReturnValue({
      data: mockCreators,
      error: null,
    })

    render(<CreatorsDirectory initialCreators={mockCreators} />)

    const creatorCards = screen.getAllByTestId('creator-card')
    expect(creatorCards).toHaveLength(3)
  })

  it('should render page title and description', () => {
    ;(useCreators as any).mockReturnValue({
      data: mockCreators,
      error: null,
    })

    render(<CreatorsDirectory initialCreators={mockCreators} />)

    expect(screen.getByText('Discover Creators')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Browse creators and their products on the Blyss marketplace',
      ),
    ).toBeInTheDocument()
  })

  it('should pass keepPreviousData option to useCreators', () => {
    const mockUseCreators = vi.fn().mockReturnValue({
      data: mockCreators,
      error: null,
    })
    ;(useCreators as any).mockImplementation(mockUseCreators)

    render(<CreatorsDirectory initialCreators={mockCreators} />)

    expect(mockUseCreators).toHaveBeenCalledWith(
      { search: undefined },
      expect.objectContaining({
        keepPreviousData: true,
      }),
    )
  })
})
