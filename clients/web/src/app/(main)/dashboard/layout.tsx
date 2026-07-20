import { Toaster } from '@/components/Toast/Toaster'
import { PolarNuqsProvider } from '@/providers/nuqs'
import { PropsWithChildren, Suspense } from 'react'

export default async function Layout({ children }: PropsWithChildren) {
  return (
    <PolarNuqsProvider>
      <div className="flex h-full flex-col md:h-screen">
        {children}
        <Suspense>
          <Toaster />
        </Suspense>
      </div>
    </PolarNuqsProvider>
  )
}
