import { CartPage } from '@/components/Cart/CartPage'
import { SkipLink } from '@/components/Shared/SkipLink'
import { getAuthenticatedUser } from '@/utils/user'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Shopping Cart',
  description: 'Review and manage items in your shopping cart',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function Page() {
  // Server-side authentication check
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/login?return_to=/cart')
  }

  return (
    <>
      <SkipLink />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <CartPage />
      </main>
    </>
  )
}
