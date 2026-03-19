import { MarketplaceAnalyticsDashboard } from '@/components/Analytics/MarketplaceAnalyticsDashboard'
import { getServerSideAPI } from '@/utils/client/serverside'
import { getOrganizationBySlugOrNotFound } from '@/utils/organization'

export default async function MarketplaceAnalyticsPage(props: {
  params: Promise<{ organization: string }>
  searchParams: Promise<{ days?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const api = await getServerSideAPI()
  const organization = await getOrganizationBySlugOrNotFound(
    api,
    params.organization,
  )

  const days = searchParams.days ? parseInt(searchParams.days) : 30

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Marketplace Analytics</h1>
        <p className="text-muted-foreground">
          Track your product performance, donations, and customer engagement
        </p>
      </div>
      <MarketplaceAnalyticsDashboard
        organizationId={organization.id}
        days={days}
      />
    </div>
  )
}
