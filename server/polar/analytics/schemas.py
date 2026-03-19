from pydantic import BaseModel


class ProductViewCount(BaseModel):
    product_id: str
    product_name: str
    view_count: int


class ProductCartCount(BaseModel):
    product_id: str
    product_name: str
    cart_count: int


class DonationSummary(BaseModel):
    donation_count: int
    total_amount: int


class NewsletterGrowth(BaseModel):
    date: str
    new_subscribers: int


class ProductRatingTrend(BaseModel):
    product_id: str
    product_name: str
    average_rating: float
    review_count: int


class AnalyticsDashboard(BaseModel):
    product_views: list[ProductViewCount]
    add_to_cart_clicks: list[ProductCartCount]
    donations: DonationSummary
    newsletter_growth: list[NewsletterGrowth]
    rating_trends: list[ProductRatingTrend]
