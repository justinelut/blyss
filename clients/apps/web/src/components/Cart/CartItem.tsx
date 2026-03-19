import { useRemoveFromCart } from '@/hooks/queries/cart'
import { schemas } from '@polar-sh/client'
import { formatCurrency } from '@polar-sh/currency'
import { Button } from '@polar-sh/ui/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface CartItemProps {
  item: {
    id: string
    product: schemas['Product']
    quantity: number
    subtotal: number
  }
}

export const CartItem = ({ item }: CartItemProps) => {
  const { mutate: removeItem, isPending } = useRemoveFromCart()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRemove = () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }
    removeItem({ itemId: item.id })
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  const price = item.product.prices?.[0]
  const priceAmount = price?.price_amount ?? 0
  const currency = price?.price_currency ?? 'usd'

  return (
    <div className="dark:border-polar-700 flex items-start gap-4 border-b border-gray-200 py-4">
      <div className="flex-1">
        <h3 className="dark:text-polar-50 text-base font-medium text-gray-900">
          {item.product.name}
        </h3>
        {item.product.description && (
          <p className="dark:text-polar-500 mt-1 line-clamp-2 text-sm text-gray-500">
            {item.product.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className="dark:text-polar-300 text-gray-700">
            {formatCurrency(priceAmount, currency)}
          </span>
          <span className="dark:text-polar-500 text-gray-500">
            Quantity: {item.quantity}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="dark:text-polar-50 text-base font-medium text-gray-900">
          {formatCurrency(item.subtotal, currency)}
        </div>
        {showConfirm ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              disabled={isPending}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            disabled={isPending}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
