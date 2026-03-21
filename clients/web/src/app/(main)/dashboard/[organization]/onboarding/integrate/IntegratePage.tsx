'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ClientPage() {
  const router = useRouter()
  const params = useParams()
  const organization = params.organization as string

  // For Blyss (creator marketplace), skip developer integrations
  // and go straight to the dashboard
  useEffect(() => {
    router.push(`/dashboard/${organization}`)
  }, [router, organization])

  return null
}
