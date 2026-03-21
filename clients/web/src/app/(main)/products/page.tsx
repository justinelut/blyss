import { Metadata } from 'next'
import { BrowseProductsPage } from './BrowseProductsPage'

export const metadata: Metadata = {
  title: 'Browse Products | Blyss Marketplace',
  description:
    'Discover and browse digital products from Kenyan creators. Find digital art, templates, e-books, music, and more.',
  openGraph: {
    title: 'Browse Products | Blyss Marketplace',
    description:
      'Discover and browse digital products from Kenyan creators. Find digital art, templates, e-books, music, and more.',
    type: 'website',
  },
  alternates: {
    canonical: '/products',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  return <BrowseProductsPage />
}
