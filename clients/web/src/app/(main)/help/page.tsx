import { Metadata } from 'next'
import HelpPageClient from './HelpPageClient'

export const metadata: Metadata = {
  title: 'Help Center | Blyss',
  description:
    'Find answers to common questions, learn about our community guidelines, and get support for the Blyss marketplace.',
  alternates: {
    canonical: '/help',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function HelpPage() {
  return <HelpPageClient />
}
