"""Marketplace policy context used by creator-account review."""

FALLBACK_POLICY = """
Blyss is a marketplace where independent creators offer digital products and
subscriptions. This review guidance supports the public Blyss Acceptable Use
Policy and is not a separate merchant-of-record or payment-processor policy.

Creators may list digital downloads, software, educational materials, and
subscription content they are authorized to sell. Listings must describe the
product and delivery accurately and comply with applicable law and the rules
of payment providers used for the transaction.

Do not approve listings that offer illegal goods or services, stolen or
unauthorized content, malware, fraud, deceptive financial schemes, harassment,
privacy violations, or content involving the exploitation of minors. Blyss also
does not support physical goods that require shipping. Review restricted or
ambiguous products individually and ask for clarification when needed.

Do not reject a creator merely because the creator sells through a marketplace:
Blyss itself is a marketplace. Do not infer that Blyss is the merchant of
record, provides legal or tax advice, or guarantees the identity, quality, or
legality of a creator's products. Escalate legal, tax, or payment-provider
questions for human review.

The public policy is available at https://blyss.co.ke/acceptable-use.
"""


async def fetch_policy_content() -> str:
    """Return Blyss's review guidance without depending on legacy docs hosting."""
    return FALLBACK_POLICY
