from fastapi import APIRouter

from polar.account.endpoints import router as accounts_router
from polar.analytics.endpoints import router as analytics_router
from polar.auth.endpoints import router as auth_router
from polar.benefit.endpoints import router as benefits_router
from polar.benefit.grant.endpoints import router as benefit_grants_router
from polar.cart.endpoints import router as cart_router
from polar.category.endpoints import router as category_router
from polar.checkout.endpoints import router as checkout_router
from polar.checkout_link.endpoints import router as checkout_link_router
from polar.cli.endpoints import router as cli_router
from polar.custom_field.endpoints import router as custom_field_router
from polar.customer.endpoints import router as customer_router

# DISABLED in Blyss per plan §4.4 — kept as imports so the dependency graph stays
# whole, but routes are NOT mounted below. Restore in v1.1+ as needed.
# from polar.customer_meter.endpoints import router as customer_meter_router
from polar.customer_portal.endpoints import router as customer_portal_router

# from polar.customer_seat.endpoints import router as customer_seat_router
from polar.customer_session.endpoints import router as customer_session_router
from polar.discount.endpoints import router as discount_router
from polar.dispute.endpoints import router as dispute_router
from polar.donation.endpoints import router as donation_router
from polar.email_update.endpoints import router as email_update_router

# from polar.event.endpoints import router as event_router
# from polar.event_type.endpoints import router as event_type_router
from polar.eventstream.endpoints import router as stream_router
from polar.file.endpoints import router as files_router
from polar.integrations.apple.endpoints import router as apple_router
from polar.integrations.chargeback_stop.endpoints import (
    router as chargeback_stop_router,
)
from polar.integrations.discord.endpoints import router as discord_router

# from polar.integrations.github.endpoints import router as github_router
from polar.integrations.github_repository_benefit.endpoints import (
    router as github_repository_benefit_router,
)
from polar.integrations.google.endpoints import router as google_router
from polar.integrations.paystack.endpoints import router as paystack_router
from polar.integrations.plain.endpoints import router as plain_router

# Stripe routes stay unmounted on the marketplace surface; module imports stay for
# upstream code paths in checkout/payment/order/refund/etc that still reference them.
# from polar.integrations.stripe.endpoints import router as stripe_router
# from polar.license_key.endpoints import router as license_key_router
from polar.login_code.endpoints import router as login_code_router
from polar.member.endpoints import router as member_router

# from polar.meter.endpoints import router as meter_router
from polar.metrics.endpoints import router as metrics_router
from polar.newsletter.endpoints import router as newsletter_router
from polar.notifications.endpoints import router as notifications_router

# from polar.oauth2.endpoints.oauth2 import router as oauth2_router
from polar.order.endpoints import router as order_router
from polar.organization.endpoints import router as organization_router

# from polar.organization_access_token.endpoints import (
#     router as organization_access_token_router,
# )
from polar.payment.endpoints import router as payment_router
from polar.payout.endpoints import router as payout_router

# from polar.personal_access_token.endpoints import router as pat_router
from polar.product.endpoints import router as product_router
from polar.refund.endpoints import router as refund_router
from polar.review.endpoints import router as review_router
from polar.subscription.endpoints import router as subscription_router
from polar.transaction.endpoints import router as transaction_router
from polar.user.endpoints import router as user_router
from polar.wallet.endpoints import router as wallet_router
from polar.webhook.endpoints import router as webhook_router
from polar.wishlist.endpoints import router as wishlist_router

router = APIRouter(prefix="/v1")

# /users
router.include_router(user_router)

# DISABLED — GitHub OAuth signin is disabled (plan §4.4 step 1)
# router.include_router(github_router)
# GitHub Repository Access as a benefit type IS enabled (per user request).
router.include_router(github_repository_benefit_router)

# DISABLED — Stripe routes never expose to marketplace; Paystack is the only payment surface
# router.include_router(stripe_router)

# /integrations/discord (kept — used as benefit type via markdown links)
router.include_router(discord_router)
# /integrations/apple (kept — Apple Sign In)
router.include_router(apple_router)
# /login-code
router.include_router(login_code_router)
# /notifications
router.include_router(notifications_router)

# DISABLED — developer Personal Access Tokens not exposed to creators
# router.include_router(pat_router)

# /accounts
router.include_router(accounts_router)
# /analytics
router.include_router(analytics_router)
# /stream
router.include_router(stream_router)
# /organizations
router.include_router(organization_router)
# /subscriptions
router.include_router(subscription_router)
# /transactions
router.include_router(transaction_router)
# /auth
router.include_router(auth_router)

# DISABLED — OAuth2 app registration (developer feature)
# router.include_router(oauth2_router)

# /benefits
router.include_router(benefits_router)
# /benefit-grants
router.include_router(benefit_grants_router)
# /cart
router.include_router(cart_router)
# /categories
router.include_router(category_router)

# /webhooks  — outgoing-webhook subscription management. Creators on a consumer
# marketplace don't need to integrate webhooks; we keep the module + outgoing
# emission active inside the platform but hide the public CRUD surface.
# router.include_router(webhook_router)

# /products
router.include_router(product_router)
# /orders
router.include_router(order_router)
# /refunds
router.include_router(refund_router)
# /disputes
router.include_router(dispute_router)
# /checkouts
router.include_router(checkout_router)
# /cli
router.include_router(cli_router)
# /files
router.include_router(files_router)
# /metrics
router.include_router(metrics_router)
# /integrations/google (kept — Google OAuth)
router.include_router(google_router)
# /integrations/paystack
router.include_router(paystack_router)

# DISABLED — software license keys (developer benefit)
# router.include_router(license_key_router)

# /checkout-links (kept — powers buy.blyss.co.ke share-able links)
router.include_router(checkout_link_router)
# /custom-fields
router.include_router(custom_field_router)
# /discounts
router.include_router(discount_router)
# /donation
router.include_router(donation_router)
# /customers
router.include_router(customer_router)
# /members
router.include_router(member_router)
# /customer-portal
router.include_router(customer_portal_router)

# DISABLED — B2B seat-based pricing
# router.include_router(customer_seat_router)

# /update-email
router.include_router(email_update_router)
# /customer-sessions
router.include_router(customer_session_router)
# /integrations/plain (kept — customer support)
router.include_router(plain_router)

# DISABLED — usage-based billing (events, event-types, meters, customer-meters)
# router.include_router(event_router)
# router.include_router(event_type_router)
# router.include_router(meter_router)
# router.include_router(customer_meter_router)

# /newsletter (kept — creator-to-fan emails)
router.include_router(newsletter_router)

# DISABLED — Organization Access Tokens (developer feature)
# router.include_router(organization_access_token_router)

# /payments
router.include_router(payment_router)
# /payouts
router.include_router(payout_router)
# /wallets
router.include_router(wallet_router)
# /integrations/chargeback-stop
router.include_router(chargeback_stop_router)
# /reviews
router.include_router(review_router)
# /wishlist
router.include_router(wishlist_router)
