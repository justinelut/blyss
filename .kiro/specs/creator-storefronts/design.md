# Creator Storefronts Design Document

## Overview

This design document describes the implementation of Creator Storefronts, a public-facing feature that enables anyone to discover creators and view their products on the Blyss marketplace. The feature consists of a creators directory page (`/creators`), individual creator storefront pages (`/creator/[slug]`), and creator profile management capabilities.

Unlike the existing private customer portal at `/[organization]/portal/`, these pages are publicly accessible without authentication, making them ideal for SEO and creator discovery. The implementation follows Blyss's Next.js App Router architecture with server-side rendering for optimal performance and search engine indexing.

### Key Design Decisions

1. **Public Access**: All storefront pages are publicly accessible without authentication, enabling search engine indexing and social media sharing.

2. **SEO-First Approach**: Pages use server-side rendering with proper meta tags, Open Graph tags, and canonical URLs for maximum discoverability.

3. **Database Extension**: The existing Organization model is extended with `bio` and `social_links` fields rather than creating a separate profile table, maintaining data locality.

4. **Reuse Existing Components**: The storefront reuses existing Product display components from the customer portal to maintain visual consistency.

5. **Tab-Based Navigation**: The storefront uses URL parameters for tab state to enable deep linking and browser history support.

6. **JSON Social Links**: Social links are stored as JSON to allow flexible addition of new platforms without schema changes.

## Architecture

### Frontend Architecture

The frontend follows Next.js 14 App Router patterns with server components for initial rendering:

```
clients/apps/web/src/app/(main)/
├── creators/
│   ├── page.tsx                    # Directory page (server component)
│   ├── CreatorsDirectory.tsx       # Client component for search/filter
│   └── CreatorCard.tsx             # Individual creator card
└── creator/
    └── [slug]/
        ├── page.tsx                # Storefront page (server component)
        ├── StorefrontLayout.tsx    # Layout with sidebar
        ├── StorefrontTabs.tsx      # Tab navigation (client component)
        └── StorefrontSidebar.tsx   # Creator profile sidebar
```

### Backend Architecture

The backend extends the existing Organization module:

```
server/polar/organization/
├── endpoints.py       # Add public creator endpoints
├── service.py         # Add creator profile methods
├── repository.py      # Add creator query methods
└── schemas.py         # Add public creator schemas
```

### Database Schema

Extension to existing `organizations` table:

```sql
ALTER TABLE organizations
ADD COLUMN bio TEXT,
ADD COLUMN social_links JSONB;

-- Index for JSON queries
CREATE INDEX idx_organizations_social_links ON organizations USING GIN (social_links);
```

The `social_links` JSONB structure:

```json
{
  "twitter": "https://twitter.com/username",
  "instagram": "https://instagram.com/username",
  "website": "https://example.com"
}
```

## Components and Interfaces

### Backend Components

#### Organization Repository Extensions

Add methods to the existing `OrganizationRepository`:

```python
class OrganizationRepository(RepositoryBase[Organization]):
    async def get_creators_with_products(
        self,
        session: AsyncSession,
        *,
        limit: int = 100,
        offset: int = 0
    ) -> Sequence[Organization]:
        """Get all organizations that have at least one product."""

    async def get_by_slug_public(
        self,
        session: AsyncSession,
        slug: str
    ) -> Organization | None:
        """Get organization by slug for public display."""

    async def update_profile(
        self,
        organization: Organization,
        *,
        bio: str | None = None,
        social_links: dict | None = None,
        flush: bool = False
    ) -> Organization:
        """Update organization profile fields."""
```

#### Organization Service Extensions

Add methods to the existing `OrganizationService`:

```python
class OrganizationService:
    async def get_creators_directory(
        self,
        session: AsyncSession,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0
    ) -> list[CreatorSummary]:
        """Get creators for directory page with product counts."""

    async def get_creator_storefront(
        self,
        session: AsyncSession,
        slug: str
    ) -> CreatorStorefront | None:
        """Get complete creator profile with products for storefront."""

    async def update_creator_profile(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Organization],
        organization_id: UUID,
        bio: str | None,
        social_links: dict | None
    ) -> Organization:
        """Update creator profile information."""
```

#### Public Creator Endpoints

New public endpoints in `server/polar/organization/endpoints.py`:

```python
@router.get("/v1/creators", response_model=list[CreatorSummarySchema])
async def list_creators(
    search: str | None = None,
    limit: int = Query(default=100, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session)
) -> list[CreatorSummarySchema]:
    """Public endpoint: List all creators with products."""

@router.get("/v1/creators/{slug}", response_model=CreatorStorefrontSchema)
async def get_creator(
    slug: str,
    session: AsyncSession = Depends(get_db_session)
) -> CreatorStorefrontSchema:
    """Public endpoint: Get creator storefront data."""
```

#### Profile Management Endpoint

Authenticated endpoint for profile editing:

```python
@router.patch(
    "/v1/organizations/{id}/profile",
    response_model=OrganizationSchema
)
async def update_organization_profile(
    id: UUID,
    profile: ProfileUpdateSchema,
    auth_subject: WebUser,
    session: AsyncSession = Depends(get_db_session)
) -> Organization:
    """Update organization profile (bio and social links)."""
```

### Frontend Components

#### Creators Directory Page

Server component for initial render with SEO:

```typescript
// app/(main)/creators/page.tsx
export const metadata: Metadata = {
  title: 'Discover Creators | Blyss',
  description: 'Browse creators and their products on the Blyss marketplace',
  openGraph: {
    title: 'Discover Creators | Blyss',
    description: 'Browse creators and their products on the Blyss marketplace',
  },
}

export default async function CreatorsPage() {
  const creators = await api.creators.list()

  return <CreatorsDirectory initialCreators={creators} />
}
```

Client component for interactivity:

```typescript
// components/Creators/CreatorsDirectory.tsx
interface CreatorsDirectoryProps {
  initialCreators: CreatorSummary[]
}

export const CreatorsDirectory = ({ initialCreators }: CreatorsDirectoryProps) => {
  const [search, setSearch] = useState('')
  const { data: creators } = useCreators({ search }, { initialData: initialCreators })

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creators.map(creator => (
          <CreatorCard key={creator.id} creator={creator} />
        ))}
      </div>
    </div>
  )
}
```

#### Creator Card Component

```typescript
// components/Creators/CreatorCard.tsx
interface CreatorCardProps {
  creator: CreatorSummary
}

export const CreatorCard = ({ creator }: CreatorCardProps) => {
  return (
    <Link href={`/creator/${creator.slug}`}>
      <div className="rounded-lg border p-6 hover:shadow-lg transition">
        <Avatar src={creator.avatar_url} size="lg" />
        <h3 className="text-xl font-semibold mt-4">{creator.name}</h3>
        <p className="text-gray-500 mt-2">
          {creator.product_count} {creator.product_count === 1 ? 'product' : 'products'}
        </p>
      </div>
    </Link>
  )
}
```

#### Creator Storefront Page

Server component with dynamic metadata:

```typescript
// app/(main)/creator/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const creator = await api.creators.get(params.slug)

  if (!creator) {
    return { title: 'Creator Not Found' }
  }

  return {
    title: `${creator.name} | Blyss`,
    description: creator.bio || `View products from ${creator.name}`,
    openGraph: {
      title: `${creator.name} | Blyss`,
      description: creator.bio || `View products from ${creator.name}`,
      images: creator.avatar_url ? [creator.avatar_url] : [],
    },
  }
}

export default async function CreatorStorefrontPage({ params, searchParams }: Props) {
  const creator = await api.creators.get(params.slug)

  if (!creator) {
    notFound()
  }

  const activeTab = searchParams.tab || 'overview'

  return (
    <StorefrontLayout creator={creator} activeTab={activeTab} />
  )
}
```

#### Storefront Layout Component

```typescript
// components/Creators/StorefrontLayout.tsx
interface StorefrontLayoutProps {
  creator: CreatorStorefront
  activeTab: string
}

export const StorefrontLayout = ({ creator, activeTab }: StorefrontLayoutProps) => {
  return (
    <div className="flex gap-8">
      <StorefrontSidebar creator={creator} />
      <div className="flex-1">
        <StorefrontTabs activeTab={activeTab} />
        <TabContent creator={creator} activeTab={activeTab} />
      </div>
    </div>
  )
}
```

#### Storefront Sidebar Component

```typescript
// components/Creators/StorefrontSidebar.tsx
interface StorefrontSidebarProps {
  creator: CreatorStorefront
}

export const StorefrontSidebar = ({ creator }: StorefrontSidebarProps) => {
  return (
    <aside className="w-80 sticky top-4">
      <Avatar src={creator.avatar_url} size="xl" />
      <h1 className="text-2xl font-bold mt-4">{creator.name}</h1>

      {creator.bio && (
        <p className="text-gray-600 mt-4">{creator.bio}</p>
      )}

      {creator.social_links && (
        <SocialLinks links={creator.social_links} />
      )}

      <div className="mt-6 space-y-3">
        <Button variant="primary" fullWidth>Subscribe</Button>
        <Button variant="secondary" fullWidth>Donate</Button>
      </div>
    </aside>
  )
}
```

#### Social Links Component

```typescript
// components/Creators/SocialLinks.tsx
interface SocialLinksProps {
  links: {
    twitter?: string
    instagram?: string
    website?: string
  }
}

export const SocialLinks = ({ links }: SocialLinksProps) => {
  const platforms = [
    { key: 'twitter', icon: TwitterIcon, label: 'Twitter' },
    { key: 'instagram', icon: InstagramIcon, label: 'Instagram' },
    { key: 'website', icon: GlobeIcon, label: 'Website' },
  ]

  const availableLinks = platforms.filter(p => links[p.key])

  if (availableLinks.length === 0) return null

  return (
    <div className="flex gap-3 mt-4">
      {availableLinks.map(({ key, icon: Icon, label }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="text-gray-600 hover:text-gray-900"
        >
          <Icon size={24} />
        </a>
      ))}
    </div>
  )
}
```

#### Storefront Tabs Component

```typescript
// components/Creators/StorefrontTabs.tsx
'use client'

interface StorefrontTabsProps {
  activeTab: string
}

export const StorefrontTabs = ({ activeTab }: StorefrontTabsProps) => {
  const router = useRouter()
  const pathname = usePathname()

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Products' },
    { id: 'subscriptions', label: 'Subscriptions' },
  ]

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams()
    if (tabId !== 'overview') {
      params.set('tab', tabId)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="border-b">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={cn(
            'px-4 py-2 border-b-2',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

#### Profile Editor Component

```typescript
// components/Organization/ProfileEditor.tsx
interface ProfileEditorProps {
  organization: Organization
}

export const ProfileEditor = ({ organization }: ProfileEditorProps) => {
  const { mutate: updateProfile } = useUpdateProfile()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      bio: organization.bio || '',
      twitter: organization.social_links?.twitter || '',
      instagram: organization.social_links?.instagram || '',
      website: organization.social_links?.website || '',
    },
  })

  const onSubmit = (data) => {
    updateProfile({
      organizationId: organization.id,
      bio: data.bio,
      social_links: {
        twitter: data.twitter || undefined,
        instagram: data.instagram || undefined,
        website: data.website || undefined,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Textarea
        label="Bio"
        {...register('bio', { maxLength: 500 })}
        error={errors.bio?.message}
      />

      <Input
        label="Twitter URL"
        {...register('twitter', { pattern: /^https:\/\/(twitter|x)\.com\// })}
        error={errors.twitter?.message}
      />

      <Input
        label="Instagram URL"
        {...register('instagram', { pattern: /^https:\/\/instagram\.com\// })}
        error={errors.instagram?.message}
      />

      <Input
        label="Website URL"
        {...register('website', { pattern: /^https?:\/\// })}
        error={errors.website?.message}
      />

      <Button type="submit">Save Profile</Button>
    </form>
  )
}
```

## Data Models

### Backend Models

#### Organization Model Extension

```python
# server/polar/models/organization.py
class Organization(RecordModel):
    # ... existing fields ...

    bio: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    social_links: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )
```

### API Schemas

#### Public Creator Schemas

```python
# server/polar/organization/schemas.py

class SocialLinks(Schema):
    twitter: str | None = None
    instagram: str | None = None
    website: str | None = None

class CreatorSummarySchema(Schema):
    """Public creator information for directory listing."""
    id: UUID
    name: str
    slug: str
    avatar_url: str | None
    product_count: int

class CreatorStorefrontSchema(Schema):
    """Complete creator information for storefront page."""
    id: UUID
    name: str
    slug: str
    avatar_url: str | None
    bio: str | None
    social_links: SocialLinks | None
    products: list[ProductPublicSchema]

class ProfileUpdateSchema(Schema):
    """Schema for updating creator profile."""
    bio: str | None = Field(None, max_length=500)
    social_links: SocialLinks | None = None
```

### Frontend Types

```typescript
// types/creator.ts

interface SocialLinks {
  twitter?: string
  instagram?: string
  website?: string
}

interface CreatorSummary {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  product_count: number
}

interface CreatorStorefront {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  bio: string | null
  social_links: SocialLinks | null
  products: Product[]
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:

1. **Requirements 1.1, 6.1, and 6.7** all test the same behavior: the API should return only creators with products. These can be combined into a single property.

2. **Requirements 1.2, 3.1, 6.3, and 6.4** all test public access without authentication. These can be combined into a single property about public endpoint access.

3. **Requirements 1.4, 6.5, and 6.6** all test that API responses include required fields. These can be combined into two properties: one for the directory endpoint and one for the storefront endpoint.

4. **Requirements 3.2 and 3.6** both test that creator information is displayed/included. Property 3.6 is more specific (meta tags), so we keep both but ensure they're distinct.

5. **Requirements 3.3 and 9.1** are identical - both test that three tabs exist. Combine into one property.

6. **Requirements 4.3, 5.4** test serialization/persistence of social links. These can be combined into a single round-trip property.

7. **Requirements 7.1 and 7.4** both test social link rendering. Combine into a single property that tests both presence and order.

### Property 1: Creators with Products Filter

_For any_ set of organizations in the database, the creators directory API should return only those organizations that have at least one product, excluding organizations with zero products.

**Validates: Requirements 1.1, 6.1, 6.7**

### Property 2: Public Endpoint Access

_For any_ public creator endpoint (`/api/creators` or `/api/creators/[slug]`), requests without authentication credentials should succeed with a 200 status code.

**Validates: Requirements 1.2, 3.1, 6.3, 6.4**

### Property 3: Directory Response Completeness

_For any_ creator returned by the directory API, the response should include all required fields: id, name, slug,
.

**Validates: Requirements 2.2**

### Property 6: Product Display Completeness

_For any_ creator with N products, the storefront products tab should display all N products.

**Validates: Requirements 3.4**

### Property 7: SEO Meta Tag Inclusion

_For any_ creator storefront page, the HTML should include meta tags with the creator's name in the title and the creator's bio in the description.

**Validates: Requirements 3.6, 10.1, 10.2**

### Property 8: Social Links Serialization Round Trip

_For any_ valid social links object (with twitter, instagram, and/or website URLs), saving it to the database and then retrieving it should return an equivalent object with all URLs preserved.

**Validates: Requirements 4.3, 5.4**

### Property 9: URL Validation

_For any_ string input to social link fields, the validation should accept properly formatted URLs (starting with http:// or https://) and reject improperly formatted strings.

**Validates: Requirements 5.3**

### Property 10: Social Links Rendering with Order

_For any_ creator with configured social links, the storefront should render icons for each configured platform in the order: twitter, instagram, website.

**Validates: Requirements 7.1, 7.4**

### Property 11: Tab State URL Persistence

_For any_ tab selection (overview, products, or subscriptions), the URL parameter should reflect the selected tab, and loading the page with that URL parameter should activate the corresponding tab.

**Validates: Requirements 9.5**

## Error Handling

### Backend Error Handling

The creator storefront feature uses standard HTTP error responses:

#### 404 Not Found

When a creator slug doesn't exist:

```python
class CreatorNotFound(OrganizationError):
    def __init__(self, slug: str) -> None:
        self.slug = slug
        message = f"Creator with slug '{slug}' not found."
        super().__init__(message, 404)
```

#### 422 Validation Error

When profile update data is invalid:

```python
class InvalidSocialLinkURL(OrganizationError):
    def __init__(self, platform: str, url: str) -> None:
        self.platform = platform
        self.url = url
        message = f"Invalid URL for {platform}: {url}. URLs must start with http:// or https://"
        super().__init__(message, 422)

class BioTooLong(OrganizationError):
    def __init__(self, length: int) -> None:
        self.length = length
        message = f"Bio exceeds maximum length of 500 characters (received {length})."
        super().__init__(message, 422)
```

#### 403 Forbidden

When a user tries to update a profile they don't own:

```python
class UnauthorizedProfileUpdate(OrganizationError):
    def __init__(self, organization_id: UUID) -> None:
        self.organization_id = organization_id
        message = f"You do not have permission to update organization {organization_id}."
        super().__init__(message, 403)
```

### Frontend Error Handling

The frontend uses Next.js error boundaries and toast notifications:

#### Not Found Handling

```typescript
// app/(main)/creator/[slug]/page.tsx
export default async function CreatorStorefrontPage({ params }: Props) {
  const creator = await api.creators.get(params.slug)

  if (!creator) {
    notFound() // Triggers Next.js 404 page
  }

  return <StorefrontLayout creator={creator} />
}
```

#### Form Validation Errors

```typescript
// components/Organization/ProfileEditor.tsx
const { mutate: updateProfile } = useUpdateProfile({
  onError: (error) => {
    if (error.status === 422) {
      // Display validation errors
      toast.error(error.message || 'Invalid profile data')
    } else if (error.status === 403) {
      toast.error('You do not have permission to update this profile')
    } else {
      toast.error('Failed to update profile')
    }
  },
  onSuccess: () => {
    toast.success('Profile updated successfully')
  },
})
```

#### Search Error Handling

```typescript
// components/Creators/CreatorsDirectory.tsx
const { data: creators, error } = useCreators({ search })

if (error) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600">Failed to load creators. Please try again.</p>
    </div>
  )
}
```

### Edge Cases

#### Empty States

1. **No creators with products**: Display empty state message on directory page
2. **No products for creator**: Display "No products available" message on storefront
3. **No social links**: Hide social links section entirely
4. **No bio**: Display creator name and avatar only, without bio section

#### Null/Empty Field Handling

The system gracefully handles null or empty values for optional fields:

- `bio`: null or empty string → field not displayed
- `social_links`: null or empty object → social links section not displayed
- `avatar_ur

- Run a minimum of 100 iterations
- Reference its design document property in a comment
- Use the tag format: `# Feature: creator-storefronts, Property {number}: {property_text}`

#### Backend Property Test Examples

```python
# Feature: creator-storefronts, Property 1: Creators with Products Filter
@given(
    organizations=st.lists(
        st.builds(Organization),
        min_size=5,
        max_size=20
    ),
    product_counts=st.lists(st.integers(min_value=0, max_value=10))
)
@settings(max_examples=100)
async def test_creators_with_products_filter(organizations, product_counts):
    # Setup: Create organizations with varying product counts
    for org, count in zip(organizations, product_counts):
        for _ in range(count):
            await create_product(org.id)

    # Execute: Get creators directory
    creators = await organization_service.get_creators_directory(session)

    # Verify: Only organizations with products are returned
    expected_creators = [org for org, count in zip(organizations, product_counts) if count > 0]
    assert len(creators) == len(expected_creators)
    assert all(c.product_count > 0 for c in creators)
```

```python
# Feature: creator-storefronts, Property 8: Social Links Serialization Round Trip
@given(
    social_links=st.fixed_dictionaries({
        'twitter': st.one_of(st.none(), st.from_regex(r'https://twitter\.com/\w+')),
        'instagram': st.one_of(st.none(), st.from_regex(r'https://instagram\.com/\w+')),
        'website': st.one_of(st.none(), st.from_regex(r'https://[\w\-\.]+\.\w+')),
    })
)
@settings(max_examples=100)
async def test_social_links_round_trip(social_links):
    # Create organization with social links
    org = await organization_service.create(session, name="Test", social_links=social_links)

    # Retrieve organization
    retrieved = await organization_service.get_by_id(session, org.id)

    # Verify social links are preserved
    assert retrieved.social_links == social_links
```

#### Frontend Property Test Examples

```typescript
// Feature: creator-storefronts, Property 5: Search Filter Accuracy
import fc from 'fast-check'

test('search filter accuracy', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          slug: fc.string(),
          avatar_url: fc.option(fc.webUrl()),
          product_count: fc.integer({ min: 1, max: 100 }),
        }),
      ),
      fc.string(),
      (creators, searchTerm) => {
        const filtered = filterCreatorsBySearch(creators, searchTerm)

        // All filtered results should contain the search term
        filtered.forEach((creator) => {
          expect(
            creator.name.toLowerCase().includes(searchTerm.toLowerCase()),
          ).toBe(true)
        })

        // All creators containing the search term should be in results
        const expected = creators.filter((c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        expect(filtered.length).toBe(expected.length)
      },
    ),
    { numRuns: 100 },
  )
})
```

### Unit Testing

Unit tests should focus on:

1. **Specific examples**: Test concrete scenarios with known data
2. **Edge cases**: Empty states, null values, missing fields
3. **Error conditions**: 404 errors, validation failures, permission errors
4. **UI components**: Component rendering, user interactions
5. **Integration points**: API endpoint responses, database queries

#### Backend Unit Test Examples

```python
class TestCreatorEndpoints:
    async def test_get_creators_returns_only_with_products(self, session, save_fixture):
        """Test that creators endpoint excludes organizations without products."""
        # Create organizations
        org_with_products = await save_fixture(Organization(name="HasProducts"))
        org_without_products = await save_fixture(Organization(name="NoProducts"))

        # Create product for first org
        await save_fixture(Product(organization_id=org_with_products.id))

        # Call endpoint
        response = await client.get("/v1/creators")

        # Verify
        assert response.status_code == 200
        creators = response.json()
        assert len(creators) == 1
        assert creators[0]['id'] == str(org_with_products.id)

    async def test_get_creator_by_slug_not_found(self, session):
        """Test that non-existent slug returns 404."""
        response = await client.get("/v1/creators/nonexistent-slug")

        assert response.status_code == 404
        assert "not found" in response.json()['detail'].lower()

    async def test_update_profile_validates_url_format(self, session, user, organization):
        """Test that invalid URLs are rejected."""
        response = await client.patch(
            f"/v1/organizations/{organization.id}/profile",
            json={
                "social_links": {
                    "twitter": "not-a-valid-url"
                }
            },
            headers={"Authorization": f"Bearer {user.token}"}
        )

        assert response.status_code == 422
        assert "invalid url" in response.json()['detail'].lower()
```

#### Frontend Unit Test Examples

```typescript
describe('CreatorCard', () => {
  it('displays creator name and product count', () => {
    const creator = {
      id: '123',
      name: 'Test Creator',
      slug: 'test-creator',
      avatar_url: 'https://example.com/avatar.jpg',
      product_count: 5,
    }

    render(<CreatorCard creator={creator} />)

    expect(screen.getByText('Test Creator')).toBeInTheDocument()
    expect(screen.getByText('5 products')).toBeInTheDocument()
  })

  it('displays singular "product" for count of 1', () => {
    const creator = {
      id: '123',
      name: 'Test Creator',
      slug: 'test-creator',
      avatar_url: null,
      product_count: 1,
    }

    render(<CreatorCard creator={creator} />)

    expect(screen.getByText('1 product')).toBeInTheDocument()
  })
})

describe('SocialLinks', () => {
  it('renders icons for configured platforms', () => {
    const links = {
      twitter: 'https://twitter.com/test',
      instagram: 'https://instagram.com/test',
    }

    render(<SocialLinks links={links} />)

    expect(screen.getByLabelText('Twitter')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument()
    expect(screen.queryByLabelText('Website')).not.toBeInTheDocument()
  })

  it('renders nothing when no links are configured', () => {
    const { container } = render(<SocialLinks links={{}} />)

    expect(container.firstChild).toBeNull()
  })

  it('displays icons in correct order', () => {
    const links = {
      website: 'https://example.com',
      twitter: 'https://twitter.com/test',
      instagram: 'https://instagram.com/test',
    }

    render(<SocialLinks links={links} />)

    const icons = screen.getAllByRole('link')
    expect(icons[0]).toHaveAttribute('aria-label', 'Twitter')
    expect(icons[1]).toHaveAttribute('aria-label', 'Instagram')
    expect(icons[2]).toHaveAttribute('aria-label', 'Website')
  })
})
```

### Test Organization

#### Backend Tests

```
tests/organization/
├── test_creator_endpoints.py      # E2E API tests for public endpoints
├── test_creator_service.py        # Service layer unit tests
├── test_profile_update.py         # Profile management tests
└── test_creator_properties.py     # Property-based tests
```

#### Frontend Tests

```
clients/apps/web/src/
├── app/(main)/creators/__tests__/
│   └── CreatorsDirectory.test.tsx
├── app/(main)/creator/[slug]/__tests__/
│   └── StorefrontPage.test.tsx
├── components/Creators/__tests__/
│   ├── CreatorCard.test.tsx
│   ├── StorefrontSidebar.test.tsx
│   ├── StorefrontTabs.test.tsx
│   └── SocialLinks.test.tsx
└── components/Creators/__properties__/
    └── creator.properties.test.ts
```

### Test Coverage Goals

- Backend: Minimum 90% code coverage
- Frontend: Minimum 85% code coverage
- All correctness properties must have corresponding property tests
- All error conditions must have unit tests
- All public API endpoints must have E2E tests
- All UI components must have rendering tests

### Integration Testing

Integration tests should verify:

1. **Database migrations**: Verify that adding bio and social_links fields doesn't break existing data
2. **API integration**: Test that frontend can successfully call backend endpoints
3. **SEO rendering**: Verify that server-side rendering produces correct meta tags
4. **Navigation flow**: Test that clicking creator cards navigates to correct storefront pages
5. **Profile updates**: Test end-to-end profile editing flow

### Performance Testing

Performance considerations:

1. **Directory page**: Should load and render within 2 seconds for up to 100 creators
2. **Storefront page**: Should load and render within 1.5 seconds
3. **Search filtering**: Should filter results in under 100ms for up to 100 creators
4. **Database queries**: Should use indexes for efficient creator lookups
5. **Image loading**: Should use lazy loading for creator avatars and product images
