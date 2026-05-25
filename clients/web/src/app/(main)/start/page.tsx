import { Metadata } from 'next'
import { StartLanding } from './StartLanding'

export const metadata: Metadata = {
  title: 'Start selling · Blyss',
  description:
    'Set up your storefront in 10 minutes. Sell digital products to Kenyan buyers via M-Pesa or card. 24-hour payouts.',
  alternates: { canonical: 'https://blyss.co.ke/start' },
}

export default function Page() {
  return <StartLanding />
}
