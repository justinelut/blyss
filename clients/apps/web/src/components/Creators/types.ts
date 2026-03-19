import { schemas } from '@polar-sh/client'

export interface SocialLinks {
  twitter?: string
  instagram?: string
  website?: string
}

export interface CreatorSummary {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  product_count: number
}

export interface CreatorStorefront {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  bio: string | null
  social_links: SocialLinks | null
  products: schemas['ProductPublic'][]
}
