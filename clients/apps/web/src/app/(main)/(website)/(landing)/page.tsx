import { Metadata } from 'next'
import LandingPage from '../../../../components/Landing/LandingPage'
export const metadata: Metadata = {
  title: 'Blyss — Sell Digital Products in Kenya',
  description:
    'Sell digital products in Kenya with ease. Create your online store, accept M-Pesa payments, and reach customers across Kenya.',
  keywords:
    'sell digital products kenya, online marketplace kenya, mpesa payments, digital downloads, sell courses online kenya, kenyan creators, digital products platform, online store kenya, e-commerce kenya, sell ebooks kenya',
  openGraph: {
    siteName: 'Blyss',
    type: 'website',
    images: [
      {
        url: 'https://blyss.co.ke/assets/brand/blyss_og.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://blyss.co.ke/assets/brand/blyss_og.jpg',
        width: 1200,
        height: 630,
        alt: 'Blyss',
      },
    ],
  },
}

export default function Page() {
  return <LandingPage />
}
