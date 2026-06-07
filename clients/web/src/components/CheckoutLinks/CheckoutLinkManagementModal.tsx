import { schemas } from '@/lib/api'
import { CheckoutLinkForm } from './CheckoutLinkForm'

interface CheckoutLinkManagementModalProps {
  organization: schemas['Organization']
  onClose: (checkoutLink: schemas['CheckoutLink']) => void
  productIds: string[]
}

export const CheckoutLinkManagementModal = ({
  organization,
  onClose,
  productIds,
}: CheckoutLinkManagementModalProps) => {
  return (
    // Mobile: tighter padding (px-5 py-6 instead of px-8 py-12) so the
    // 320-360px viewport doesn't lose 64px to padding alone, and
    // bottom padding leaves room for the form's sticky Create button
    // safe-area inset.
    <div
      className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-6 md:gap-8 md:px-8 md:py-12"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
    >
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-lg md:text-xl">Create Checkout Link</h1>
      </div>
      <CheckoutLinkForm
        organization={organization}
        onClose={onClose}
        productIds={productIds}
      />
    </div>
  )
}
