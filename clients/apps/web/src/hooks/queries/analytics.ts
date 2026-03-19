import { api } from '@/utils/client/api'
import { useQuery } from '@tanstack/react-query'

export interface ProductViewCount {
  product_id: string
  product_name: string
  view_count: number
}

export interface ProductCartCount {
  product_id: string
  product_name: string
  cart_count: number
}

export interface DonationSummary {
  donation_count: number
  total_amount: number
}

export interface NewsletterGrowth {
  date: string
  new_subscribers: number
}

export interface ProductRatingTrend {
  product_id: string
  product_name: string
  average_rating: number
  review_count: number
}

export interface AnalyticsDashboard {
  product_views: ProductViewCount[]
  add_to_cart_clicks: ProductCartCount[]
  donations: DonationSummary
  newsletter_growth: NewsletterGrowth[]
  rating_trends: ProductRatingTrend[]
}

export const useMarketplaceAnalytics = (
  organizationId: string,
  days: number = 30,
) => {
  return useQuery({
    queryKey: ['analytics', 'marketplace', organizationId, days],
    queryFn: async () => {
      const response = await api.get<AnalyticsDashboard>(
        `/v1/analytics/organization/${organizationId}?days=${days}`,
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
