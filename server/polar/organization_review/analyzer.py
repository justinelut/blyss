import asyncio

import structlog
from pydantic_ai import Agent
from pydantic_ai.models import Model
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.models.groq import GroqModel
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.providers.groq import GroqProvider
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.providers.openrouter import OpenRouterProvider

from polar.config import settings

from .known_domains import known_domains_for_prompt, match_known_domain
from .policy import fetch_policy_content
from .schemas import DataSnapshot, ReviewAgentReport, ReviewContext, UsageInfo
from .thresholds import thresholds_for_prompt

log = structlog.get_logger(__name__)

SYSTEM_PROMPT = f"""\
You are an expert compliance and risk analyst for Blyss, a marketplace for \
Kenyan creators selling digital products and creator subscriptions \
(templates, beats, ebooks, courses, presets, fonts, Notion docs, Figma kits, \
photography, design assets, recurring access tiers). Payments are processed \
through Paystack (cards + M-Pesa) with payouts to the creator's M-Pesa or \
Kenyan bank account, typically within 24 hours.

You are reviewing a creator's application to sell on Blyss. Your job is to \
produce a structured, multi-dimensional risk assessment, biased toward \
approving legitimate Kenyan creators who are selling digital products.

## What Blyss IS — and what to NOT flag as risky

- A multi-creator marketplace IS the Blyss product. Do NOT mark "marketplace \
business model" as a red flag. Every Blyss creator is, by definition, a seller \
in our marketplace.
- Selling digital products (templates, beats, courses, ebooks, presets, \
fonts, Figma/Notion files, photography packs, recurring access tiers) is the \
core supported use case.
- Bundling AI tools, generated images, or AI-assisted content into a digital \
product is fine. AI-as-tool is not prohibited.
- Local-Kenyan businesses with Swahili copy, Nairobi addresses, M-Pesa-first \
payment language, and country-code +254 phone numbers are NORMAL and should \
not be flagged as suspicious. Country-of-Kenya is not a yellow flag.
- KSh-denominated pricing is the default. USD pricing is allowed but not the \
norm. Mismatches between currency hints in the website and the platform are \
NOT a risk signal.
- New creators with no payment history are NOT risky by default. Most Blyss \
creators ARE new — that's the platform's purpose.

## What IS prohibited (clearly deny)

These categories are not allowed regardless of how they are framed. They are \
banned by Paystack's acceptable use policy AND by Blyss's marketplace policy:

- Financial trading signals, investment advisory, crypto futures advice, \
forex/forex-mentor "courses" that promise returns
- Pyramid schemes, MLM recruitment funnels, "guaranteed income" pitches
- Adult content, escort services, sex work, dating-platform subscriptions
- Gambling, sports betting tips, casino-themed sales
- Pirated software, leaked courses (e.g. resold Coursera/Udemy content), \
cracked plugins, copyright infringement
- Weapons, ammunition, drugs, regulated pharmaceuticals
- Hate speech, harassment toolkits, doxxing services
- Counterfeit goods, fake KYC documents, ID forgery

If the creator's stated business OR observed listings hit one of these \
categories, deny.

## Review Dimensions

Assess each independently:

### 1. Policy Compliance
Does the stated business and the actual products comply with the prohibited \
list above? Focus on what they SELL on Blyss, not their broader business. A \
creative agency selling Figma templates is fine. A photographer selling Lightroom \
presets is fine. A music producer selling beat packs is fine.

Common false positives to AVOID:
- "Marketplace" mentioned in the business description — Blyss IS a marketplace, \
not all marketplaces are prohibited
- Template / asset / preset sellers flagged as "human services" — they ship \
digital files
- Local Kenyan business signals (Swahili, Nairobi, M-Pesa) flagged as \
"suspicious geography"
- Education platforms flagged as "for minors" — evaluate the actual audience
- AI-tool sellers flagged as "automation that could be misused"

### 2. Product Legitimacy
Cross-reference the products listed on Blyss with the creator's stated business \
and pricing. Look for mismatches that suggest a disguised prohibited business. \
A "design agency" listing crypto signals is a red flag; a design agency listing \
Figma templates is fine.

### 3. Identity & Trust
Identity is provided via the creator's profile + organization details. Social \
links should match the creator's own handles, not generic stock accounts. \
Country of operation is Kenya for almost all sellers — that is normal and not \
a yellow flag.

### 4. Financial Risk
Assess Paystack risk signals if present (subaccount status, refund rate, \
chargeback rate, dispute history). No payment history is neutral — most \
creators are new.

The following thresholds need human review:
{thresholds_for_prompt()}

If there are any monthly products above KSh 100,000 (~$700 USD) AND the \
creator is new with no prior payment history, mark as MEDIUM risk.

### 5. Prior History
Check if the user has other organizations on Blyss, especially denied or \
blocked ones. Re-creating an organization after denial is grounds for \
automatic denial.

## Verdict Guidelines

- **APPROVE**: All dimensions LOW risk, no policy violations, legitimate \
products. Most creators should be approved.
- **DENY**: Clear policy violations from the prohibited list, prior denials \
with re-creation, or confirmed fraud signals. Be confident before denying.

You MUST return only APPROVE or DENY. Never return any other verdict.

## Few-Shot Examples

Examples calibrated for the Blyss / Kenyan creator-economy context.

### Example 1: Notion Templates for Kenyan Freelancers → APPROVE
**Business**: Solo creator in Nairobi selling 5 Notion productivity templates \
for freelancers. Prices KSh 800–KSh 2,400. Subscription tier "Templates Pro" at \
KSh 1,200/month gives access to all + monthly drops.
**Agent concern**: Marketplace model with subscription-bundled access.
**Correct verdict**: APPROVE. This is the canonical Blyss seller — digital \
products, instant download, M-Pesa payouts. Kenyan creators bundling templates \
under a subscription is the exact use case Blyss was built for.
**Lesson**: A creator selling their own digital templates at KSh prices is the \
core supported case; "marketplace" or "subscription" framing is not a risk \
signal — they are platform features.

### Example 2: Lagos Drum Kit Vol. 1 (beat pack) → APPROVE
**Business**: Music producer based in Nairobi selling drum kits, sample packs, \
and beat presets. KSh 1,500 per kit. WAV / MIDI files delivered as ZIP.
**Agent concern**: Audio-files-for-resale could overlap with copyright issues.
**Correct verdict**: APPROVE. Original samples + producer-made kits are \
standard creator-economy goods. Only deny if there is concrete evidence of \
sampling unlicensed copyrighted material.
**Lesson**: "Could-be-pirated" is not "is-pirated". Approve original creator \
work; only flag concrete copyright signals (e.g. listing tracks with major-label \
artist names in titles).

### Example 3: Forex Trading Signals Subscription → DENY
**Business**: "Premium forex signals" Telegram channel sold as a recurring \
subscription. KSh 3,500/month for "daily signals + entries + targets".
**Agent concern**: Trading-signal subscription.
**Correct verdict**: DENY. Trading signals, forex/crypto advice, and \
investment tips are explicitly prohibited regardless of framing.
**Lesson**: Financial-advice products are always denied, even when framed as \
"educational" or "research".

### Example 4: Lightroom Presets Studio → APPROVE
**Business**: Wedding photographer in Mombasa selling 12 Lightroom preset \
packs at KSh 950 each. Optional "VIP" tier at KSh 2,500/month bundles new \
packs monthly.
**Agent concern**: None obvious.
**Correct verdict**: APPROVE. Lightroom presets are a textbook digital good. \
Subscription bundling is a feature, not a risk.
**Lesson**: Recurring tiers from individual creators are the explicit Blyss \
business model; do not flag.

### Example 5: "Make KSh 50,000 a week reselling our course" → DENY
**Business**: A "course" priced at KSh 12,000 that promises buyers can \
"make KSh 50,000/week reselling the same course to others".
**Agent concern**: Recruitment-funnel framing.
**Correct verdict**: DENY. Pyramid / MLM / guaranteed-income schemes are \
prohibited. The product's value proposition IS the recruitment, which is the \
defining red flag.
**Lesson**: Products whose primary value is selling more access to themselves \
(recruitment-as-the-product) are pyramid schemes regardless of how they self-describe.

## Overall Risk Level

After assessing each dimension, provide an overall_risk_level:
- LOW: All dimensions are low risk
- MEDIUM: Some concerns but no clear violations
- HIGH: Serious risk signals or clear violations


## Response
Keep responses concise and to the point. For example:

### Example: Approve of digital framing business
- verdict: APPROVE
- summary: sells digital framing products, payment metrics looks healthy, and website appears legimitate for what they have been selling.
- recommended_action: none


## Important Notes

- Blyss supports DIGITAL products and creator subscription tiers only. Physical \
shipping and pure human services (e.g. consulting, freelance dev hours) are \
not supported.
- Be fair and give benefit of the doubt for borderline cases. Approve rather \
than denying — denied cases are always reviewed by a human.
- Your assessment directly impacts real Kenyan creators trying to earn a \
living. False denials hurt sellers and the platform's reputation. False \
approvals expose Blyss + Paystack to risk. Balance both, leaning toward \
approval.
- Provide specific, actionable findings — not vague concerns.
"""

SUBMISSION_PREAMBLE = """\
This is a SUBMISSION review. The creator just created their organization and \
submitted their details. No Paystack subaccount, payments, or products exist \
yet. \
Assess only: POLICY_COMPLIANCE, PRODUCT_LEGITIMACY, PRIOR_HISTORY. \
Skip IDENTITY_TRUST and FINANCIAL_RISK — set those to LOW risk with confidence 0. \
Identity verification is NOT expected at this stage — unverified identity is \
normal and should NOT be flagged.

Website leniency: If the website is inaccessible, returns errors, or has minor \
discrepancies with the stated business, do NOT treat this as a red flag. Many \
legitimate Kenyan creators are still building their site, are between domains, \
or operate primarily on Instagram / TikTok / X. Only flag website issues if \
there is a clear and obvious sign of a prohibited business.

Return only APPROVE or DENY, don't return NEEDS_HUMAN_REVIEW. This is only the \
first step in the review process.


## Merchant-Facing Summary (merchant_summary)

In addition to the internal summary, you MUST produce a short merchant_summary \
(1-2 sentences max). This text is shown directly to the creator, so it must:
- Be helpful and warm, not bureaucratic
- NEVER mention: website scraping, prior organizations/denials, internal risk \
scores, Paystack-specific verification errors, or specific fraud signals
- Focus on what the creator provided or what general category the issue falls \
into
- Use plain English; avoid the words "merchant", "MoR", "Stripe", "Paystack \
subaccount" — speak as Blyss to a creator

Examples for DENY:
- "Your products fall under financial advice or trading signals, which Blyss \
can't support. If you think this is a mistake, please appeal with more detail."
- "We can't list products that resell or distribute copyrighted material. \
Please appeal if your store sells your own original work."
- "We need a bit more information before we can verify your account. Please \
appeal or reach out to support."
- "Your account couldn't be verified at this time. Please appeal or contact \
support and we'll take another look."

Examples for APPROVE:
- "Welcome to Blyss — your store is approved and ready to sell."
- "You're set. Connect your M-Pesa or bank account in Finance and start \
listing products."
"""

SETUP_COMPLETE_PREAMBLE = """\
This is a SETUP_COMPLETE review. The creator has finished all setup steps \
(at least one product created, organization details submitted, payout account \
connected, identity provided) but has NOT yet received any payments. You \
have access to products, organization info, identity status, and Paystack \
subaccount metadata.

Focus on:
- **Product price anomalies**: Flag one-time products priced above KSh 100,000 \
or recurring products above KSh 50,000/month for new creators. These prices \
are unusual for the Kenyan creator-economy and warrant a closer look.
- **Product-business mismatch**: Cross-reference products listed on Blyss \
against the creator's stated business. A "design studio" listing forex signals \
is the kind of mismatch to flag.
- **Identity & payout signals**:
  - The Paystack subaccount status reflects whether payouts can be made. A \
status of "active" is good. "pending" or "rejected" warrants attention but \
is not automatic denial — Paystack onboarding takes time.
  - Compare the country reported on the Paystack subaccount with the \
organization's country. For Blyss, this is almost always Kenya — mismatches \
are yellow flags.
  - Identity verification is provided via national ID / business reg number / \
tax PIN. Missing identity at this stage is a yellow flag.
  - Significant mismatches between the legal name on the Paystack subaccount \
and the Blyss organization name are yellow flags.
- **Prior history**: Check for prior denials or blocked organizations.

Set FINANCIAL_RISK to LOW risk with confidence 0 — no payments have occurred yet.

Website leniency: If the website is inaccessible, returns errors, or has minor \
discrepancies with the stated business, do NOT treat this as a red flag. Many \
legitimate creators run their store entirely from Blyss and link only to \
social profiles. Only flag website issues if there is a clear and obvious \
sign of a prohibited business.

Return only APPROVE or DENY.
"""


THRESHOLD_PREAMBLE = f"""\
This is a THRESHOLD review triggered when a payment volume threshold is hit. \
Perform a comprehensive analysis across ALL five dimensions. \
If website content is not available, that alone is NOT a red flag for Blyss \
creators — many run their entire store on Blyss and link only to socials.

Important information to check:
- **Checkout URL consistency**: Success URLs (from checkout links) and return \
URLs should point to domains matching the creator's stated website or to \
blyss.co.ke itself. Mismatched or suspicious domains (especially short-lived \
.xyz / .top / random redirect domains) are yellow flags.
- **Checkout links without benefits**: Checkout links selling products with \
zero deliverables mean the customer pays but receives nothing — a red flag.
- **API & Webhook integration**: Having API keys or webhook endpoints is a \
positive signal of a real product integration. Webhook domains should match \
the creator's website or a known integration platform. Domains marked \
'(known service)' are legitimate third-party platforms and should NOT be \
flagged as suspicious mismatches.

Known integration platform domains:
{known_domains_for_prompt()}

Return only APPROVE or DENY.
"""


MANUAL_PREAMBLE = f"""\
This is a MANUAL review triggered by a human reviewer from the backoffice. \
Perform a comprehensive analysis across ALL five dimensions with full detail.

You have access to ALL available data: products, organization info, identity \
verification, payment metrics (if any exist), prior history, and website \
content.

Key areas to cover thoroughly:

- **Policy compliance & product legitimacy**: Cross-reference products listed \
on Blyss against the creator's stated business and (if available) website. \
Look for mismatches suggesting a disguised prohibited business. Flag \
unusually high-priced items (one-time > KSh 100,000, recurring > \
KSh 50,000/month). If the website is unavailable, do NOT auto-flag — many \
Kenyan creators are Blyss-native and don't have a separate site.
- **Identity & payout signals**:
  - Missing or unverified identity is a yellow flag at this stage.
  - Compare the country reported on the Paystack subaccount with the \
organization's stated country. Significant mismatches (e.g. KE-registered \
business with a Paystack subaccount in another country) are yellow flags.
  - A Paystack subaccount status of "rejected" or repeated failed verification \
attempts are red flags.
  - Compare the legal name on the Paystack subaccount with the Blyss \
organization name. Significant mismatches are yellow flags.
- **Financial risk** (if payment data exists):
  - Evaluate refund rates, chargeback rates, and dispute history from Paystack.
  - Thresholds:
{thresholds_for_prompt()}
    - any dispute created
  - No payment history is neutral (new creator), not negative.
- **Prior history**: Check for prior denials or blocked organizations. \
Re-creating an organization after denial is grounds for automatic denial.

Setup & integration signals to check:
- **Checkout URL consistency**: Success URLs and return URLs should point to \
the creator's site or to blyss.co.ke. Suspicious / short-lived redirect \
domains are yellow flags.
- **Checkout links without benefits**: Checkout links selling products with \
zero deliverables — a red flag.
- **API & Webhook integration**: Having API keys or webhook endpoints is a \
positive signal. Webhook domains should match the creator's website or known \
services. Domains marked '(known service)' are legitimate platforms and \
should NOT be flagged.

Known integration platform domains:
{known_domains_for_prompt()}

Return only APPROVE or DENY.
"""


def _annotate_domains(domains: list[str]) -> str:
    """Join domain names, tagging known service domains for the AI agent."""
    parts = []
    for d in domains:
        if match_known_domain(d) is not None:
            parts.append(f"{d} (known service)")
        else:
            parts.append(d)
    return ", ".join(parts)


def _build_provider_chain() -> tuple[Model, list[str]]:
    """Build a list of pydantic-ai Model instances from whichever provider
    keys are present in settings, then wrap them in a FallbackModel so the
    analyzer auto-switches when one fails (4xx from Google quota, 429 from
    Groq, network blip, etc.).

    Order is free-tier-first, paid-last:
        1. Groq        — fast, generous free tier
        2. Cerebras    — fastest inference, generous free tier (OpenAI-compat)
        3. OpenRouter  — gateway with free Llama/Gemma models
        4. Google Gemini — 1500 req/day free
        5. OpenAI      — paid, last resort

    Returns the model (single Model if one provider is configured, FallbackModel
    if 2+) and the list of provider names in order — used for the init log.

    Raises ValueError if no provider keys are configured.
    """
    candidates: list[Model] = []
    names: list[str] = []

    # 1. Groq
    if settings.GROQ_API_KEY:
        candidates.append(
            GroqModel(
                settings.GROQ_MODEL,
                provider=GroqProvider(api_key=settings.GROQ_API_KEY),
            )
        )
        names.append(f"groq:{settings.GROQ_MODEL}")

    # 2. Cerebras (OpenAI-compatible API)
    if settings.CEREBRAS_API_KEY:
        candidates.append(
            OpenAIChatModel(
                settings.CEREBRAS_MODEL,
                provider=OpenAIProvider(
                    api_key=settings.CEREBRAS_API_KEY,
                    base_url=settings.CEREBRAS_BASE_URL,
                ),
            )
        )
        names.append(f"cerebras:{settings.CEREBRAS_MODEL}")

    # 3. OpenRouter
    if settings.OPENROUTER_API_KEY:
        candidates.append(
            OpenAIChatModel(
                settings.OPENROUTER_MODEL,
                provider=OpenRouterProvider(api_key=settings.OPENROUTER_API_KEY),
            )
        )
        names.append(f"openrouter:{settings.OPENROUTER_MODEL}")

    # 4. Gemini
    if settings.GOOGLE_AI_API_KEY:
        candidates.append(
            GoogleModel(
                settings.GOOGLE_AI_MODEL,
                provider=GoogleProvider(api_key=settings.GOOGLE_AI_API_KEY),
            )
        )
        names.append(f"gemini:{settings.GOOGLE_AI_MODEL}")

    # 5. OpenAI (paid, last)
    if settings.OPENAI_API_KEY:
        candidates.append(
            OpenAIChatModel(
                settings.OPENAI_MODEL,
                provider=OpenAIProvider(api_key=settings.OPENAI_API_KEY),
            )
        )
        names.append(f"openai:{settings.OPENAI_MODEL}")

    if not candidates:
        raise ValueError(
            "No AI provider configured. Set at least one of: "
            "POLAR_GROQ_API_KEY (free, https://console.groq.com), "
            "POLAR_CEREBRAS_API_KEY (free, https://cloud.cerebras.ai), "
            "POLAR_OPENROUTER_API_KEY (free models, https://openrouter.ai), "
            "POLAR_GOOGLE_AI_API_KEY (free, https://aistudio.google.com), "
            "or POLAR_OPENAI_API_KEY (paid)."
        )

    if len(candidates) == 1:
        return candidates[0], names

    # 2+ providers — wrap in FallbackModel. Default fallback_on triggers on
    # ModelAPIError (4xx/5xx), which covers 429 quota-exhausted, 401 invalid
    # key, 503 unavailable, etc.
    return FallbackModel(*candidates), names


class ReviewAnalyzer:
    def __init__(self) -> None:
        # Set per-call by analyze() to the resolved provider chain string.
        self.last_model_name: str = "unknown"

    async def _build_model(self, session: AsyncSession | None = None) -> tuple[Model, list[str]]:
        """Build the AI model chain per-call, reading keys from runtime_settings."""
        from polar.runtime_settings import runtime_settings

        async def _get_key(registry_key: str, settings_attr: str) -> str | None:
            if session is not None:
                return await runtime_settings.get(session, registry_key)
            return getattr(settings, settings_attr, None) or None

        provider_override = settings.AI_PROVIDER.lower().strip()

        if provider_override == "gemini":
            key = await _get_key("POLAR_GOOGLE_AI_API_KEY", "GOOGLE_AI_API_KEY")
            if not key:
                raise ValueError(
                    "GOOGLE_AI_API_KEY is required when AI_PROVIDER is set to 'gemini'. "
                    "Get your API key from https://aistudio.google.com"
                )
            return GoogleModel(
                settings.GOOGLE_AI_MODEL,
                provider=GoogleProvider(api_key=key),
            ), [f"gemini:{settings.GOOGLE_AI_MODEL}"]

        if provider_override == "openai":
            key = await _get_key("POLAR_OPENAI_API_KEY", "OPENAI_API_KEY")
            if not key:
                raise ValueError(
                    "OPENAI_API_KEY is required when AI_PROVIDER is set to 'openai'"
                )
            return OpenAIChatModel(
                settings.OPENAI_MODEL,
                provider=OpenAIProvider(api_key=key),
            ), [f"openai:{settings.OPENAI_MODEL}"]

        # auto / chain mode
        candidates: list[Model] = []
        names: list[str] = []

        groq_key = await _get_key("POLAR_GROQ_API_KEY", "GROQ_API_KEY")
        if groq_key:
            candidates.append(GroqModel(settings.GROQ_MODEL, provider=GroqProvider(api_key=groq_key)))
            names.append(f"groq:{settings.GROQ_MODEL}")

        cerebras_key = await _get_key("POLAR_CEREBRAS_API_KEY", "CEREBRAS_API_KEY")
        if cerebras_key:
            candidates.append(OpenAIChatModel(
                settings.CEREBRAS_MODEL,
                provider=OpenAIProvider(api_key=cerebras_key, base_url=settings.CEREBRAS_BASE_URL),
            ))
            names.append(f"cerebras:{settings.CEREBRAS_MODEL}")

        openrouter_key = await _get_key("POLAR_OPENROUTER_API_KEY", "OPENROUTER_API_KEY")
        if openrouter_key:
            candidates.append(OpenAIChatModel(
                settings.OPENROUTER_MODEL,
                provider=OpenRouterProvider(api_key=openrouter_key),
            ))
            names.append(f"openrouter:{settings.OPENROUTER_MODEL}")

        google_key = await _get_key("POLAR_GOOGLE_AI_API_KEY", "GOOGLE_AI_API_KEY")
        if google_key:
            candidates.append(GoogleModel(
                settings.GOOGLE_AI_MODEL,
                provider=GoogleProvider(api_key=google_key),
            ))
            names.append(f"gemini:{settings.GOOGLE_AI_MODEL}")

        openai_key = await _get_key("POLAR_OPENAI_API_KEY", "OPENAI_API_KEY")
        if openai_key:
            candidates.append(OpenAIChatModel(
                settings.OPENAI_MODEL,
                provider=OpenAIProvider(api_key=openai_key),
            ))
            names.append(f"openai:{settings.OPENAI_MODEL}")

        if not candidates:
            raise ValueError(
                "No AI provider configured. Set at least one of: "
                "POLAR_GROQ_API_KEY (free, https://console.groq.com), "
                "POLAR_CEREBRAS_API_KEY (free, https://cloud.cerebras.ai), "
                "POLAR_OPENROUTER_API_KEY (free models, https://openrouter.ai), "
                "POLAR_GOOGLE_AI_API_KEY (free, https://aistudio.google.com), "
                "or POLAR_OPENAI_API_KEY (paid)."
            )

        if len(candidates) == 1:
            return candidates[0], names
        return FallbackModel(*candidates), names

    async def analyze(
        self,
        snapshot: DataSnapshot,
        context: ReviewContext = ReviewContext.THRESHOLD,
        timeout_seconds: int = 60,
        session: AsyncSession | None = None,
    ) -> tuple[ReviewAgentReport, UsageInfo]:
        model, chain_names = await self._build_model(session)
        # Record the resolved chain so callers (agent.run_organization_review)
        # can report which model(s) were used without reaching into pydantic-ai
        # internals. The analyzer has no persistent `.model` — it's built
        # per-call from runtime_settings — so this is the source of truth.
        self.last_model_name = ",".join(chain_names) if chain_names else "unknown"
        log.info("review_analyzer.model_built", providers=chain_names)

        agent = Agent(
            model,
            output_type=ReviewAgentReport,
            system_prompt=SYSTEM_PROMPT,
        )

        policy_content = await fetch_policy_content()

        prompt = self._build_prompt(snapshot, policy_content)

        instructions = {
            ReviewContext.SUBMISSION: SUBMISSION_PREAMBLE,
            ReviewContext.SETUP_COMPLETE: SETUP_COMPLETE_PREAMBLE,
            ReviewContext.THRESHOLD: THRESHOLD_PREAMBLE,
            ReviewContext.MANUAL: MANUAL_PREAMBLE,
        }.get(context)

        try:
            result = await asyncio.wait_for(
                agent.run(prompt, instructions=instructions),
                timeout=timeout_seconds,
            )
            # Get model name for usage tracking
            model_name = getattr(model, "model_name", settings.AI_PROVIDER)
            usage = UsageInfo.from_agent_usage(result.usage(), model_name)
            return result.output, usage
        except TimeoutError:
            log.warning(
                "review_analyzer.timeout",
                organization=snapshot.organization.slug,
                timeout_seconds=timeout_seconds,
            )
            return _timeout_report(), UsageInfo()
        except Exception as e:
            log.error(
                "review_analyzer.error",
                organization=snapshot.organization.slug,
                error=str(e),
            )
            return _error_report(str(e)), UsageInfo()

    def _build_prompt(self, snapshot: DataSnapshot, policy_content: str) -> str:
        org = snapshot.organization
        products = snapshot.products
        identity = snapshot.identity
        account = snapshot.account
        metrics = snapshot.metrics
        history = snapshot.history

        parts = []

        # Organization details
        parts.append("## Organization Details")
        parts.append(f"Name: {org.name}")
        parts.append(f"Slug: {org.slug}")
        if org.website:
            parts.append(f"Website: {org.website}")
        if org.email:
            parts.append(f"Org Support Email: {org.email}")
        if org.about:
            parts.append(f"About: {org.about}")
        if org.product_description:
            parts.append(f"Product Description: {org.product_description}")
        if org.intended_use:
            parts.append(f"Intended Use: {org.intended_use}")
        if org.customer_acquisition:
            parts.append(f"Customer Acquisition: {', '.join(org.customer_acquisition)}")
        if org.switching_from:
            parts.append(f"Switching From: {org.switching_from}")
        if org.socials:
            socials_str = ", ".join(f"{s['platform']}: {s['url']}" for s in org.socials)
            parts.append(f"Social Links: {socials_str}")

        # Products
        parts.append("\n## Products on Blyss")
        if products.total_count == 0:
            parts.append("No products created yet.")
        else:
            parts.append(f"Total products: {products.total_count}")
            for p in products.products[:20]:  # Cap at 20
                status = "archived" if p.is_archived else (p.visibility or "unknown")
                parts.append(f"- {p.name} ({p.billing_type}, {status})")
                if p.description:
                    parts.append(f"  Description: {p.description[:300]}")
                if p.prices:
                    price_strs = []
                    for pr in p.prices:
                        if pr.get("amount_cents") is not None:
                            price_strs.append(
                                f"${pr['amount_cents'] / 100:.2f} {pr.get('currency', 'usd')}"
                            )
                        else:
                            price_strs.append(str(pr.get("amount_type", "unknown")))
                    parts.append(f"  Prices: {', '.join(price_strs)}")

        # Setup & Integration Signals (only for threshold/manual reviews)
        setup = snapshot.setup
        if snapshot.context in (ReviewContext.THRESHOLD, ReviewContext.MANUAL):
            parts.append("\n## Setup & Integration Signals")

            if setup.checkout_success_urls.unique_urls:
                parts.append(
                    f"Checkout Success URLs ({len(setup.checkout_success_urls.unique_urls)}):"
                )
                for url in setup.checkout_success_urls.unique_urls:
                    parts.append(f"  - {url}")
                parts.append(
                    f"Success URL Domains: {', '.join(setup.checkout_success_urls.domains)}"
                )
            else:
                parts.append("No custom checkout success URLs configured.")

            if setup.checkout_return_urls.unique_urls:
                parts.append(
                    f"Checkout Return URLs ({len(setup.checkout_return_urls.unique_urls)}):"
                )
                for url in setup.checkout_return_urls.unique_urls:
                    parts.append(f"  - {url}")
                parts.append(
                    f"Return URL Domains: {', '.join(setup.checkout_return_urls.domains)}"
                )
            else:
                parts.append("No custom checkout return URLs configured.")

            if setup.checkout_links.total_links > 0:
                parts.append(
                    f"Checkout Links: {setup.checkout_links.total_links} total, "
                    f"{setup.checkout_links.links_without_benefits} without benefits"
                )
                for link in setup.checkout_links.links[:20]:
                    products_str = (
                        ", ".join(link.product_names)
                        if link.product_names
                        else "no products"
                    )
                    benefits_flag = (
                        "has benefits" if link.has_benefits else "NO benefits"
                    )
                    label_str = f" [{link.label}]" if link.label else ""
                    parts.append(f"  - {products_str}{label_str} ({benefits_flag})")
            else:
                parts.append("No checkout links created.")

            parts.append(f"API Keys: {setup.integration.api_key_count}")
            if setup.integration.webhook_urls:
                parts.append(f"Webhooks ({len(setup.integration.webhook_urls)}):")
                for url in setup.integration.webhook_urls:
                    parts.append(f"  - {url}")
                parts.append(
                    f"Webhook Domains: {_annotate_domains(setup.integration.webhook_domains)}"
                )
            else:
                parts.append("No webhook endpoints configured.")

        # Website Content
        if snapshot.website:
            parts.append("\n## Website Content")
            parts.append(
                f"Source: {snapshot.website.base_url} "
                f"({snapshot.website.total_pages_succeeded} page(s) scraped)"
            )
            if snapshot.website.scrape_error:
                parts.append(f"Scrape error: {snapshot.website.scrape_error}")
            if snapshot.website.summary:
                parts.append(snapshot.website.summary)
            elif not snapshot.website.pages and not snapshot.website.scrape_error:
                parts.append("No content could be extracted from the website.")

        # User Identity (from Paystack KYC / national ID + business reg)
        parts.append("\n## User Identity")
        parts.append(
            f"Verification Status: {identity.verification_status or 'unknown'}"
        )
        if identity.verification_error_code:
            parts.append(f"Verification Last Error: {identity.verification_error_code}")
        if identity.verified_first_name or identity.verified_last_name:
            parts.append(
                f"Verified Name: {identity.verified_first_name or ''} {identity.verified_last_name or ''}".strip()
            )
        if identity.verified_address_country:
            parts.append(
                f"Verified Address Country: {identity.verified_address_country}"
            )
        if identity.verified_dob:
            parts.append(f"Verified Date of Birth: {identity.verified_dob}")

        # Payout Account (Paystack subaccount)
        parts.append("\n## Payout Account (Paystack subaccount)")
        if account.country:
            parts.append(f"Account Country: {account.country}")
        if account.business_type:
            parts.append(f"Business Type: {account.business_type}")
        parts.append(f"Details Submitted: {account.is_details_submitted}")
        parts.append(f"Charges Enabled: {account.is_charges_enabled}")
        parts.append(f"Payouts Enabled: {account.is_payouts_enabled}")
        if account.business_name:
            parts.append(f"Business Name: {account.business_name}")
        if account.business_url:
            parts.append(f"Business URL: {account.business_url}")
        if account.business_support_address_country:
            parts.append(
                f"Support Address Country: {account.business_support_address_country}"
            )
        if account.capabilities:
            cap_strs = [f"{k}={v}" for k, v in account.capabilities.items()]
            parts.append(f"Capabilities: {', '.join(cap_strs)}")
        if account.requirements_disabled_reason:
            parts.append(
                f"WARNING — Disabled Reason: {account.requirements_disabled_reason}"
            )
        if account.requirements_errors:
            error_strs = [
                f"{e['code']}: {e['reason']}" for e in account.requirements_errors
            ]
            parts.append(f"WARNING — Verification Errors: {'; '.join(error_strs)}")
        if account.requirements_past_due:
            parts.append(
                f"Requirements Past Due: {', '.join(account.requirements_past_due)}"
            )
        if account.requirements_currently_due:
            parts.append(
                f"Requirements Currently Due: {', '.join(account.requirements_currently_due)}"
            )
        if account.requirements_pending_verification:
            parts.append(
                f"Requirements Pending Verification: {', '.join(account.requirements_pending_verification)}"
            )

        # Payment Metrics
        parts.append("\n## Payment Metrics")
        if metrics.total_payments == 0:
            parts.append("No payment history yet (new organization).")
        else:
            parts.append(f"Total Payments: {metrics.total_payments}")
            parts.append(f"Succeeded Payments: {metrics.succeeded_payments}")
            parts.append(f"Total Amount: ${metrics.total_amount_cents / 100:,.2f}")
            if metrics.p50_risk_score is not None:
                parts.append(f"P50 Risk Score: {metrics.p50_risk_score}")
            if metrics.p90_risk_score is not None:
                parts.append(f"P90 Risk Score: {metrics.p90_risk_score}")
            parts.append(
                f"Refunds: {metrics.refund_count} (${metrics.refund_amount_cents / 100:,.2f})"
            )
            if metrics.succeeded_payments > 0:
                refund_rate = metrics.refund_count / metrics.succeeded_payments * 100
                parts.append(f"Refund Rate: {refund_rate:.1f}%")
            parts.append(
                f"Disputes: {metrics.dispute_count} (${metrics.dispute_amount_cents / 100:,.2f})"
            )

        # Prior History
        parts.append("\n## User History")
        if history.user_blocked_at:
            parts.append("WARNING: User account is BLOCKED")
        if history.has_prior_denials:
            parts.append("WARNING: User has DENIED organizations")
        if history.has_blocked_orgs:
            parts.append("WARNING: User has BLOCKED organizations")
        if history.prior_organizations:
            parts.append(f"Other organizations ({len(history.prior_organizations)}):")
            for po in history.prior_organizations:
                flags = []
                if po.review_verdict:
                    flags.append(f"verdict={po.review_verdict}")
                if po.appeal_decision:
                    flags.append(f"appeal={po.appeal_decision}")
                if po.blocked_at:
                    flags.append("BLOCKED")
                flag_str = f" [{', '.join(flags)}]" if flags else ""
                parts.append(f"- {po.slug} (status={po.status}){flag_str}")
        else:
            parts.append("No other organizations for this user.")

        # Prior Review Decisions
        prior_feedback = snapshot.prior_feedback
        if prior_feedback.entries:
            parts.append("\n## Prior Review Decisions")
            parts.append(
                "The following previous review decisions exist for this organization. "
                "If a human reviewer has already evaluated and approved the organization, "
                "do NOT re-raise the same concerns unless you have new, concrete evidence "
                "that was not available during the prior review. Focus your analysis on "
                "what has CHANGED since the last review."
            )
            for entry in prior_feedback.entries:
                date_str = (
                    entry.created_at.strftime("%Y-%m-%d")
                    if entry.created_at
                    else "unknown date"
                )
                parts.append(
                    f"\n### {entry.review_context.upper()} review ({date_str})"
                )
                parts.append(f"- Actor: {entry.actor_type}")
                parts.append(f"- Decision: {entry.decision}")
                if entry.agent_verdict:
                    parts.append(f"- Agent Verdict: {entry.agent_verdict}")
                if entry.agent_risk_level is not None:
                    parts.append(f"- Agent Risk Level: {entry.agent_risk_level}")
                if entry.agent_report_summary:
                    parts.append(f"- Agent Summary: {entry.agent_report_summary}")
                if entry.violated_sections:
                    parts.append(
                        f"- Violated Sections: {', '.join(entry.violated_sections)}"
                    )
                if entry.dimensions:
                    parts.append("- Dimension Assessments:")
                    for dim in entry.dimensions:
                        findings_str = (
                            f" — {'; '.join(dim.findings)}" if dim.findings else ""
                        )
                        parts.append(
                            f"  - {dim.dimension}: {dim.risk_level}{findings_str}"
                        )
                if entry.reason:
                    parts.append(f"- Reviewer Reason: {entry.reason}")

        # Policy
        parts.append("\n## Acceptable Use Policy")
        parts.append(policy_content)

        parts.append(
            "\n## Instructions"
            "\nBased on ALL the data above, provide your structured multi-dimensional "
            "risk assessment. Assess each dimension independently, then provide an "
            "overall verdict and recommendation."
        )

        return "\n".join(parts)


def _fallback_report(summary: str, finding: str, action: str) -> ReviewAgentReport:
    from .schemas import DimensionAssessment, ReviewDimension, ReviewVerdict, RiskLevel

    return ReviewAgentReport(
        verdict=ReviewVerdict.DENY,
        summary=summary,
        merchant_summary="Error occurred during analysis. Please contact support for assistance.",
        violated_sections=[],
        dimensions=[
            DimensionAssessment(
                dimension=ReviewDimension.POLICY_COMPLIANCE,
                risk_level=RiskLevel.MEDIUM,
                confidence=0.0,
                findings=[finding],
                recommendation="Human review required",
            )
        ],
        overall_risk_level=RiskLevel.MEDIUM,
        recommended_action=action,
    )


def _timeout_report() -> ReviewAgentReport:
    return _fallback_report(
        "Analysis timed out. Denied for human review.",
        "Analysis timed out",
        "Human review required due to timeout.",
    )


def _error_report(error: str) -> ReviewAgentReport:
    msg = error[:200]
    return _fallback_report(
        f"Analysis failed with error: {msg}. Denied for human review.",
        f"Analysis error: {msg}",
        "Human review required due to analysis error.",
    )


# Module-level singleton
review_analyzer = ReviewAnalyzer()
