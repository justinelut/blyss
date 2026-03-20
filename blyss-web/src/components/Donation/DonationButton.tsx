'use client'

import Button from '@polar-sh/ui/components/atoms/Button'
import { HeartIcon } from 'lucide-react'

interface DonationButtonProps {
  onClick: () => void
  className?: string
}

export const DonationButton = ({ onClick, className }: DonationButtonProps) => {
  return (
    <Button variant="outline" onClick={onClick} className={className}>
      <HeartIcon className="mr-2 h-4 w-4" />
      Donate
    </Button>
  )
}
