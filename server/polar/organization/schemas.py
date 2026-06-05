from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any, Literal
from urllib.parse import urlparse

from pydantic import (
    UUID4,
    AfterValidator,
    AliasChoices,
    BeforeValidator,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)
from pydantic.json_schema import SkipJsonSchema
from pydantic.networks import HttpUrl

from polar.config import settings
from polar.enums import SubscriptionProrationBehavior
from polar.kit.currency import PresentmentCurrency
from polar.kit.email import EmailStrDNS
from polar.kit.schemas import (
    ORGANIZATION_ID_EXAMPLE,
    HttpUrlToStr,
    IDSchema,
    MergeJSONSchema,
    Schema,
    SelectorWidget,
    SlugValidator,
    TimestampedSchema,
)
from polar.models.organization import (
    OrganizationCustomerEmailSettings,
    OrganizationCustomerPortalSettings,
    OrganizationNotificationSettings,
    OrganizationStatus,
    OrganizationSubscriptionSettings,
    PayoutMethod,
    SubaccountStatus,
)
from polar.models.organization_review import OrganizationReview

OrganizationID = Annotated[
    UUID4,
    MergeJSONSchema({"description": "The organization ID."}),
    SelectorWidget("/v1/organizations", "Organization", "name"),
    Field(examples=[ORGANIZATION_ID_EXAMPLE]),
]

NameInput = Annotated[str, StringConstraints(min_length=3)]


def validate_reserved_keywords(value: str) -> str:
    if value in settings.ORGANIZATION_SLUG_RESERVED_KEYWORDS:
        raise ValueError("This slug is reserved.")
    return value


SlugInput = Annotated[
    str,
    StringConstraints(to_lower=True, min_length=3),
    SlugValidator,
    AfterValidator(validate_reserved_keywords),
]


def _discard_logo_dev_url(url: HttpUrl) -> HttpUrl | None:
    if url.host and url.host.endswith("logo.dev"):
        return None
    return url


AvatarUrl = Annotated[HttpUrlToStr, AfterValidator(_discard_logo_dev_url)]


class OrganizationFeatureSettings(Schema):
    issue_funding_enabled: bool = Field(
        False, description="If this organization has issue funding enabled"
    )
    seat_based_pricing_enabled: bool = Field(
        False, description="If this organization has seat-based pricing enabled"
    )
    revops_enabled: bool = Field(
        False, description="If this organization has RevOps enabled"
    )
    wallets_enabled: bool = Field(
        False, description="If this organization has Wallets enabled"
    )
    member_model_enabled: bool = Field(
        False, description="If this organization has the Member model enabled"
    )
    tinybird_read: bool = Field(
        False, description="If this organization reads from Tinybird"
    )
    tinybird_compare: bool = Field(
        False,
        description="If this organization compares Tinybird results with database",
    )
    checkout_localization_enabled: bool = Field(
        False,
        description="If this organization has checkout localization enabled",
    )
    overview_metrics: list[str] | None = Field(
        None,
        description="Ordered list of metric slugs shown on the dashboard overview.",
    )

    @field_validator("overview_metrics", mode="before")
    @classmethod
    def _coerce_overview_metrics(cls, v: Any) -> list[str] | None:
        if isinstance(v, bool):
            return None
        return v


class OrganizationDetails(Schema):
    about: str = Field(
        ..., description="Brief information about you and your business."
    )
    product_description: str = Field(
        ..., description="Description of digital products being sold."
    )
    intended_use: str = Field(
        ..., description="How the organization will integrate and use Polar."
    )
    customer_acquisition: list[str] = Field(
        ..., description="Main customer acquisition channels."
    )
    future_annual_revenue: int = Field(
        ..., ge=0, description="Estimated revenue in the next 12 months"
    )
    switching: bool = Field(True, description="Switching from another platform?")
    switching_from: (
        Literal["paddle", "lemon_squeezy", "gumroad", "stripe", "other"] | None
    ) = Field(None, description="Which platform the organization is migrating from.")
    previous_annual_revenue: int = Field(
        0, ge=0, description="Revenue from last year if applicable."
    )


class OrganizationSocialPlatforms(StrEnum):
    x = "x"
    github = "github"
    facebook = "facebook"
    instagram = "instagram"
    youtube = "youtube"
    tiktok = "tiktok"
    linkedin = "linkedin"
    threads = "threads"
    discord = "discord"
    other = "other"


PLATFORM_DOMAINS = {
    "x": ["twitter.com", "x.com"],
    "github": ["github.com"],
    "facebook": ["facebook.com", "fb.com"],
    "instagram": ["instagram.com"],
    "youtube": ["youtube.com", "youtu.be"],
    "tiktok": ["tiktok.com"],
    "linkedin": ["linkedin.com"],
    "threads": ["threads.net"],
    "discord": ["discord.gg", "discord.com"],
}

# Reverse mapping: domain -> platform for auto-detection
DOMAIN_TO_PLATFORM: dict[str, str] = {}
for _platform, _domains in PLATFORM_DOMAINS.items():
    for _domain in _domains:
        DOMAIN_TO_PLATFORM[_domain] = _platform


def detect_platform_from_url(url: str) -> str | None:
    """Detect the social platform from a URL's hostname."""
    try:
        parsed = urlparse(url.lower())
        hostname = parsed.hostname or ""
        # Strip www. prefix
        if hostname.startswith("www."):
            hostname = hostname[4:]
        return DOMAIN_TO_PLATFORM.get(hostname)
    except Exception:
        return None


class OrganizationSocialLink(Schema):
    platform: OrganizationSocialPlatforms = Field(
        ..., description="The social platform of the URL"
    )
    url: HttpUrlToStr = Field(..., description="The URL to the organization profile")

    @model_validator(mode="before")
    @classmethod
    def validate_url(cls, data: dict[str, Any]) -> dict[str, Any]:
        url = data.get("url", "").lower()
        if not url:
            return data

        # Auto-detect platform from URL domain, fallback to "other"
        detected = detect_platform_from_url(url)
        data["platform"] = detected or "other"

        return data


class OrganizationBase(IDSchema, TimestampedSchema):
    name: str = Field(
        description="Organization name shown in checkout, customer portal, emails etc.",
    )
    slug: str = Field(
        description="Unique organization slug in checkout, customer portal and credit card statements.",
    )
    avatar_url: str | None = Field(
        description="Avatar URL shown in checkout, customer portal, emails etc."
    )
    proration_behavior: SubscriptionProrationBehavior = Field(
        description="Proration behavior applied when customer updates their subscription from the portal.",
    )
    allow_customer_updates: bool = Field(
        description="Whether customers can update their subscriptions from the customer portal.",
    )

    # Deprecated attributes
    bio: SkipJsonSchema[str | None] = Field(..., deprecated="")
    company: SkipJsonSchema[str | None] = Field(
        ...,
        deprecated="Legacy attribute no longer in use.",
    )
    blog: SkipJsonSchema[str | None] = Field(
        ...,
        deprecated="Legacy attribute no longer in use. See `socials` instead.",
    )
    location: SkipJsonSchema[str | None] = Field(
        ...,
        deprecated="Legacy attribute no longer in use.",
    )
    twitter_username: SkipJsonSchema[str | None] = Field(
        ...,
        deprecated="Legacy attribute no longer in use. See `socials` instead.",
    )

    pledge_minimum_amount: SkipJsonSchema[int] = Field(0, deprecated=True)
    pledge_badge_show_amount: SkipJsonSchema[bool] = Field(False, deprecated=True)
    default_upfront_split_to_contributors: SkipJsonSchema[int | None] = Field(
        None, deprecated=True
    )


class LegacyOrganizationStatus(StrEnum):
    """
    Legacy organization status values kept for backward compatibility in schemas
    using OrganizationPublicBase.
    """

    CREATED = "created"
    ONBOARDING_STARTED = "onboarding_started"
    UNDER_REVIEW = "under_review"
    DENIED = "denied"
    ACTIVE = "active"

    @classmethod
    def from_status(cls, status: OrganizationStatus) -> "LegacyOrganizationStatus":
        mapping = {
            OrganizationStatus.CREATED: LegacyOrganizationStatus.CREATED,
            OrganizationStatus.ONBOARDING_STARTED: (
                LegacyOrganizationStatus.ONBOARDING_STARTED
            ),
            OrganizationStatus.INITIAL_REVIEW: LegacyOrganizationStatus.UNDER_REVIEW,
            OrganizationStatus.ONGOING_REVIEW: LegacyOrganizationStatus.UNDER_REVIEW,
            OrganizationStatus.DENIED: LegacyOrganizationStatus.DENIED,
            OrganizationStatus.ACTIVE: LegacyOrganizationStatus.ACTIVE,
        }
        try:
            return mapping[status]
        except KeyError as e:
            raise ValueError("Unknown OrganizationStatus") from e


class OrganizationPublicBase(OrganizationBase):
    # Attributes that we used to have publicly, but now want to hide from
    # the public schema.
    # Keep it for now for backward compatibility in the SDK
    email: SkipJsonSchema[str | None]
    website: SkipJsonSchema[str | None]
    socials: SkipJsonSchema[list[OrganizationSocialLink]]
    status: Annotated[
        SkipJsonSchema[LegacyOrganizationStatus],
        BeforeValidator(LegacyOrganizationStatus.from_status),
    ]
    details_submitted_at: SkipJsonSchema[datetime | None]

    feature_settings: SkipJsonSchema[OrganizationFeatureSettings | None]
    subscription_settings: SkipJsonSchema[OrganizationSubscriptionSettings]
    notification_settings: SkipJsonSchema[OrganizationNotificationSettings]
    customer_email_settings: SkipJsonSchema[OrganizationCustomerEmailSettings]


class OrganizationProfileSettingsUpdate(Schema):
    """Public-facing profile fields stored in the JSON profile_settings column.

    Used for both reading (Organization.profile_settings) and writing
    (OrganizationUpdate.profile_settings).
    """

    cover_image_url: HttpUrlToStr | None = Field(
        None,
        description="Public banner / cover image URL for the creator storefront.",
    )


class Organization(OrganizationBase):
    email: str | None = Field(description="Public support email.")
    website: str | None = Field(description="Official website of the organization.")
    socials: list[OrganizationSocialLink] = Field(
        description="Links to social profiles.",
    )
    status: OrganizationStatus = Field(description="Current organization status")
    details_submitted_at: datetime | None = Field(
        description="When the business details were submitted.",
    )

    default_presentment_currency: str = Field(
        description=(
            "Default presentment currency. "
            "Used as fallback in checkout and customer portal, "
            "if the customer's local currency is not available."
        )
    )

    tipping_enabled: bool = Field(
        default=False,
        description=(
            "Whether the creator accepts one-off tips / donations. Gates the "
            "Tip affordance on creator cards, the directory, marketplace and "
            "search."
        ),
    )

    creator_category: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "creator_category_slug", "creator_category"
        ),
        description=(
            "The creator's category slug (e.g. 'designers'), or null if unset. "
            "Used as the filter facet on the /creators directory."
        ),
    )

    feature_settings: OrganizationFeatureSettings | None = Field(
        description="Organization feature settings",
    )
    profile_settings: OrganizationProfileSettingsUpdate = Field(
        default_factory=OrganizationProfileSettingsUpdate,
        description=(
            "Public profile settings (banner / cover image, future "
            "extensions). Returned on every Organization read so the "
            "dashboard form retains values after autosave."
        ),
    )
    subscription_settings: OrganizationSubscriptionSettings = Field(
        description="Settings related to subscriptions management",
    )
    notification_settings: OrganizationNotificationSettings = Field(
        description="Settings related to notifications",
    )
    customer_email_settings: OrganizationCustomerEmailSettings = Field(
        description="Settings related to customer emails",
    )
    customer_portal_settings: OrganizationCustomerPortalSettings = Field(
        description="Settings related to the customer portal",
    )

    # ── Payout configuration ─────────────────────────────────────────
    # Exposed so the dashboard can drive the M-Pesa / Bank settings flows
    # without reaching for `(organization as any).field` casts. Most are
    # nullable: a fresh org has none of these set until a creator opens
    # Settings → Finance → Payouts.
    payout_method: PayoutMethod = Field(
        default=PayoutMethod.BANK,
        description="Payout method selected by the creator: bank | mpesa",
    )
    mpesa_number: str | None = Field(
        default=None,
        description=(
            "Configured M-Pesa phone number (Kenyan format, +254XXXXXXXXX). "
            "Set when the creator picks M-Pesa as their payout method."
        ),
    )
    mpesa_verified: bool = Field(
        default=False,
        description=(
            "Whether the creator's M-Pesa number was verified via the "
            "KSh 10 verification transaction."
        ),
    )
    subaccount_code: str | None = Field(
        default=None,
        description=(
            "Paystack subaccount code. Presence indicates payout setup has "
            "started; absence means the creator has not configured payouts."
        ),
    )
    subaccount_status: SubaccountStatus = Field(
        default=SubaccountStatus.PENDING,
        description="Paystack subaccount status: pending | active | failed",
    )
    bank_code: str | None = Field(
        default=None,
        description="Paystack-recognized KE bank code (when payout_method=bank).",
    )
    bank_account_number: str | None = Field(
        default=None,
        description="Settlement bank account number (when payout_method=bank).",
    )
    bank_account_name: str | None = Field(
        default=None,
        description="Settlement bank account holder name (when payout_method=bank).",
    )


class OrganizationCreate(Schema):
    name: NameInput
    slug: SlugInput
    avatar_url: AvatarUrl | None = None
    email: EmailStrDNS | None = Field(None, description="Public support email.")
    website: HttpUrlToStr | None = Field(
        None, description="Official website of the organization."
    )
    socials: list[OrganizationSocialLink] | None = Field(
        None,
        description="Link to social profiles.",
    )
    details: OrganizationDetails | None = Field(
        None,
        description="Additional, private, business details Polar needs about active organizations for compliance (KYC).",
    )
    feature_settings: OrganizationFeatureSettings | None = None
    subscription_settings: OrganizationSubscriptionSettings | None = None
    notification_settings: OrganizationNotificationSettings | None = None
    customer_email_settings: OrganizationCustomerEmailSettings | None = None
    customer_portal_settings: OrganizationCustomerPortalSettings | None = None
    default_presentment_currency: PresentmentCurrency = Field(
        PresentmentCurrency.usd,
        description="Default presentment currency for the organization",
    )



class OrganizationUpdate(Schema):
    name: NameInput | None = None
    avatar_url: AvatarUrl | None = None

    email: EmailStrDNS | None = Field(None, description="Public support email.")
    website: HttpUrlToStr | None = Field(
        None, description="Official website of the organization."
    )
    socials: list[OrganizationSocialLink] | None = Field(
        None, description="Links to social profiles."
    )
    details: OrganizationDetails | None = Field(
        None,
        description="Additional, private, business details Polar needs about active organizations for compliance (KYC).",
    )

    feature_settings: OrganizationFeatureSettings | None = None
    profile_settings: OrganizationProfileSettingsUpdate | None = None
    subscription_settings: OrganizationSubscriptionSettings | None = None
    notification_settings: OrganizationNotificationSettings | None = None
    customer_email_settings: OrganizationCustomerEmailSettings | None = None
    customer_portal_settings: OrganizationCustomerPortalSettings | None = None
    default_presentment_currency: PresentmentCurrency | None = Field(
        None, description="Default presentment currency for the organization"
    )


class OrganizationPaymentStep(Schema):
    id: str = Field(description="Step identifier")
    title: str = Field(description="Step title")
    description: str = Field(description="Step description")
    completed: bool = Field(description="Whether the step is completed")


class OrganizationPaymentStatus(Schema):
    payment_ready: bool = Field(
        description="Whether the organization is ready to accept payments"
    )
    steps: list[OrganizationPaymentStep] = Field(description="List of onboarding steps")
    organization_status: OrganizationStatus = Field(
        description="Current organization status"
    )


class OrganizationAppealRequest(Schema):
    reason: Annotated[
        str,
        StringConstraints(min_length=50, max_length=5000),
        Field(
            description="Detailed explanation of why this organization should be approved. Minimum 50 characters."
        ),
    ]


class OrganizationAppealResponse(Schema):
    success: bool = Field(description="Whether the appeal was successfully submitted")
    message: str = Field(description="Success or error message")
    appeal_submitted_at: datetime = Field(description="When the appeal was submitted")


class OrganizationReviewStatus(Schema):
    verdict: Literal["PASS", "FAIL", "UNCERTAIN"] | None = Field(
        default=None, description="AI validation verdict"
    )
    reason: str | None = Field(default=None, description="Reason for the verdict")
    appeal_submitted_at: datetime | None = Field(
        default=None, description="When appeal was submitted"
    )
    appeal_reason: str | None = Field(default=None, description="Reason for the appeal")
    appeal_decision: OrganizationReview.AppealDecision | None = Field(
        default=None, description="Decision on the appeal (approved/rejected)"
    )
    appeal_reviewed_at: datetime | None = Field(
        default=None, description="When appeal was reviewed"
    )


class OrganizationDeletionBlockedReason(StrEnum):
    """Reasons why an organization cannot be immediately deleted."""

    HAS_ORDERS = "has_orders"
    HAS_ACTIVE_SUBSCRIPTIONS = "has_active_subscriptions"
    STRIPE_ACCOUNT_DELETION_FAILED = "stripe_account_deletion_failed"


class OrganizationDeletionResponse(Schema):
    """Response for organization deletion request."""

    deleted: bool = Field(
        description="Whether the organization was immediately deleted"
    )
    requires_support: bool = Field(
        description="Whether a support ticket was created for manual handling"
    )
    blocked_reasons: list[OrganizationDeletionBlockedReason] = Field(
        default_factory=list,
        description="Reasons why immediate deletion is blocked",
    )


# Public Creator Schemas for Storefront Feature


class SocialLinks(Schema):
    """Social media links for creator profiles."""

    twitter: str | None = None
    instagram: str | None = None
    website: str | None = None


class CreatorSummarySchema(Schema):
    """Public creator information for directory listing."""

    id: UUID4
    name: str
    slug: str
    avatar_url: str | None
    product_count: int


class CreatorStorefrontSchema(Schema):
    """Complete creator information for storefront page."""

    id: UUID4
    name: str
    slug: str
    avatar_url: str | None
    cover_image_url: str | None = None
    bio: str | None
    email: str | None
    social_links: SocialLinks | None
    tipping_enabled: bool = False
    # Typed loosely as list[Any] because importing the public Product schema
    # would create a circular import (product.schemas imports from
    # organization.schemas). The endpoint converts SQLAlchemy products to
    # ProductSchema dicts before constructing this object.
    products: list[Any]


class ProfileUpdateSchema(Schema):
    """Schema for updating creator profile."""

    bio: Annotated[str | None, StringConstraints(max_length=500)] = None
    social_links: SocialLinks | None = None
    # Category slug (e.g. "designers"). Pass "" or null to leave unchanged;
    # the service resolves the slug to a CreatorCategory row.
    creator_category: Annotated[str | None, StringConstraints(max_length=100)] = None
