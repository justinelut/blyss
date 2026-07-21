import { PolarThemeProvider } from '@/app/providers'
import type { schemas } from '@/lib/api'
import CheckoutEmbedLayout from './Embed/CheckoutEmbedLayout'

const CheckoutLayout = ({
  children,
  checkout,
  embed,
  theme,
}: React.PropsWithChildren<{
  checkout: schemas['CheckoutPublic']
  embed: boolean
  theme?: 'light' | 'dark'
}>) => {
  if (embed) {
    return (
      <CheckoutEmbedLayout checkout={checkout} theme={theme}>
        {children}
      </CheckoutEmbedLayout>
    )
  }

  return (
    <PolarThemeProvider forceTheme={theme ?? 'light'}>
      <div
        data-checkout-shell
        className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]"
      >
        {children}
      </div>
    </PolarThemeProvider>
  )
}

export default CheckoutLayout
