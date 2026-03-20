'use client'

import { EditProductPage } from '@/components/Products/EditProductPage'
import { schemas } from '@/lib/api'

export default function Page({
  organization,
  product,
}: {
  organization: schemas['Organization']
  product: schemas['Product']
}) {
  return <EditProductPage product={product} organization={organization} />
}
