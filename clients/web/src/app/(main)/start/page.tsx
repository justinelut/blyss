import { Metadata } from 'next'
import { StartLanding } from './StartLanding'

export const metadata: Metadata = {
  title: 'Start Selling Digital Products in Kenya · Blyss',
  description:
    'Set up your Blyss storefront in 10 minutes. Sell templates, ebooks, beats, presets, or courses to Kenyan buyers via M-Pesa or card. 24-hour payouts to your M-Pesa or bank account.',
  keywords:
    'sell digital products Kenya, sell ebooks Kenya, sell beats Kenya, sell presets Kenya, M-Pesa creator payouts, become a creator Kenya, Blyss storefront, online business Kenya',
  alternates: { canonical: 'https://blyss.co.ke/start' },
  openGraph: {
    title: 'Start Selling Digital Products in Kenya',
    description:
      'Set up your Blyss storefront in 10 minutes. M-Pesa or card payments. 24-hour payouts.',
    type: 'website',
    locale: 'en_KE',
    url: 'https://blyss.co.ke/start',
    images: [
      {
        url: 'https://cdn.blyss.co.ke/brand/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Start selling on Blyss',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Start Selling on Blyss',
    description:
      'Sell digital products to Kenyan buyers. M-Pesa or card. 24-hour payouts.',
    images: ['https://cdn.blyss.co.ke/brand/og-default.png'],
  },
}

export default function Page() {
  return <StartLanding />
}
