'use client'

import { CustomerPortalOrders } from '@/components/CustomerPortal/CustomerPortalOrders'
import { schemas } from '@/lib/api'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

interface Section {
  organization: schemas['CustomerOrganization']
  orders: schemas['CustomerOrder'][]
  customerSessionToken: string
}

const ClientPage = ({ sections }: { sections: Section[] }) => {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col gap-y-4">
        <h3 className="text-xl">Order History</h3>
        <p className="dark:text-polar-500 text-gray-500">
          You haven&apos;t bought anything on Blyss yet.
        </p>
      </div>
    )
  }
  return (
    <NuqsAdapter>
      <div className="flex flex-col gap-y-12">
        {sections.map((s) => (
          <div key={s.organization.id} className="flex flex-col gap-y-4">
            <div className="flex items-center gap-x-3">
              {s.organization.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.organization.avatar_url}
                  alt={s.organization.name}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <h2 className="text-base font-medium">{s.organization.name}</h2>
            </div>
            <CustomerPortalOrders
              organization={s.organization}
              orders={s.orders}
              customerSessionToken={s.customerSessionToken}
              marketplaceMode
            />
          </div>
        ))}
      </div>
    </NuqsAdapter>
  )
}

export default ClientPage
