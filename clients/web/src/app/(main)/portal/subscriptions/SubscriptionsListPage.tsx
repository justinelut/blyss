'use client'

import { ActiveSubscriptionsOverview } from '@/components/CustomerPortal/CustomerPortalSubscriptions'
import { createClientSideAPI } from '@/utils/client'
import { schemas } from '@/lib/api'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

interface Section {
  organization: schemas['CustomerOrganization']
  subscriptions: schemas['CustomerSubscription'][]
}

const ClientPage = ({ sections }: { sections: Section[] }) => {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col gap-y-4">
        <h3 className="text-xl">Subscriptions</h3>
        <p className="dark:text-polar-500 text-gray-500">
          No active subscriptions.
        </p>
      </div>
    )
  }

  return (
    <NuqsAdapter>
      <div className="flex flex-col gap-y-12">
        {sections.map((s) => {
          // Each section uses the WebUser-auth client. Cancel /
          // change-plan actions on the embedded
          // <CustomerSubscriptionDetails> hit
          // /v1/customer-portal/subscriptions/{id} which still
          // requires the token; from within the section the user
          // can drill into /portal/subscriptions/{id} where a
          // token is minted.
          const api = createClientSideAPI()
          return (
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
                <h2 className="text-base font-medium">
                  {s.organization.name}
                </h2>
              </div>
              <ActiveSubscriptionsOverview
                organization={s.organization}
                subscriptions={s.subscriptions}
                products={[]}
                api={api}
                customerSessionToken=""
              />
            </div>
          )
        })}
      </div>
    </NuqsAdapter>
  )
}

export default ClientPage
