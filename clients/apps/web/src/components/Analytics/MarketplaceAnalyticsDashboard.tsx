'use client'

import { useMarketplaceAnalytics } from '@/hooks/queries/analytics'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@polar-sh/ui/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@polar-sh/ui/components/ui/select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface MarketplaceAnalyticsDashboardProps {
  organizationId: string
  days: number
}

export function MarketplaceAnalyticsDashboard({
  organizationId,
  days: initialDays,
}: MarketplaceAnalyticsDashboardProps) {
  const router = useRouter()
  const [days, setDays] = useState(initialDays)
  const { data: analytics, isLoading } = useMarketplaceAnalytics(
    organizationId,
    days,
  )

  const handleDaysChange = (value: string) => {
    const newDays = parseInt(value)
    setDays(newDays)
    router.push(`?days=${newDays}`)
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-muted-foreground text-center">
        No analytics data available
      </div>
    )
  }

  const totalViews = analytics.product_views.reduce(
    (sum, pv) => sum + pv.view_count,
    0,
  )
  const totalCartClicks = analytics.add_to_cart_clicks.reduce(
    (sum, ac) => sum + ac.cart_count,
    0,
  )
  const conversionRate =
    totalViews > 0 ? ((totalCartClicks / totalViews) * 100).toFixed(2) : '0.00'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Select value={days.toString()} onValueChange={handleDaysChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Product Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalViews.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Add to Cart Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCartClicks.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.donations.donation_count.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              KES {(analytics.donations.total_amount / 100).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Views */}
      <Card>
        <CardHeader>
          <CardTitle>Product Views</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.product_views.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No product views in this period
            </p>
          ) : (
            <div className="space-y-4">
              {analytics.product_views.map((pv) => (
                <div
                  key={pv.product_id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{pv.product_name}</p>
                  </div>
                  <div className="text-sm font-bold">
                    {pv.view_count.toLocaleString()} views
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Cart Clicks */}
      <Card>
        <CardHeader>
          <CardTitle>Add to Cart Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.add_to_cart_clicks.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No add to cart clicks in this period
            </p>
          ) : (
            <div className="space-y-4">
              {analytics.add_to_cart_clicks.map((ac) => (
                <div
                  key={ac.product_id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{ac.product_name}</p>
                  </div>
                  <div className="text-sm font-bold">
                    {ac.cart_count.toLocaleString()} clicks
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Newsletter Growth */}
      <Card>
        <CardHeader>
          <CardTitle>Newsletter Subscriber Growth</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.newsletter_growth.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No new subscribers in this period
            </p>
          ) : (
            <div className="space-y-2">
              {analytics.newsletter_growth.map((ng) => (
                <div
                  key={ng.date}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{ng.date}</span>
                  <span className="font-medium">
                    +{ng.new_subscribers} subscribers
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Product Rating Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.rating_trends.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No reviews in this period
            </p>
          ) : (
            <div className="space-y-4">
              {analytics.rating_trends.map((rt) => (
                <div
                  key={rt.product_id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rt.product_name}</p>
                    <p className="text-muted-foreground text-xs">
                      {rt.review_count} reviews
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold">
                      {rt.average_rating.toFixed(1)}
                    </span>
                    <span className="text-yellow-500">★</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
