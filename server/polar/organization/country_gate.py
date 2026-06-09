"""Creator country gate.

Blyss signup + org creation are open worldwide — anyone can register
and create an organization regardless of country. The gate lives in
the AI review step: the analyzer hard-denies a creator whose detected
country is not in the backoffice-tunable allowlist, and the dashboard
then shows that creator a waitlist form (never an appeal). Buyers are
never gated — the marketplace is global.

The detected country is captured silently at org-create time from the
`cf-ipcountry` request header (the user never types it) and stored on
`organization.details.creator_country`. This module resolves the live
allowlist that both the analyzer prompt and downstream tooling read.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from polar.kit.countries import is_valid_country_code
from polar.runtime_settings.registry import REGISTRY_MAP
from polar.runtime_settings.service import (
    RuntimeSettingsDisabled,
    runtime_settings,
)

ALLOWED_CREATOR_COUNTRIES_KEY = "ALLOWED_CREATOR_COUNTRIES"

# Hard fallback if the runtime setting is unset AND the registry has no
# default for some reason. Kenya-only launch posture.
_FALLBACK = frozenset({"ke"})


def parse_allowlist(raw: str | None) -> set[str]:
    """Parse a comma-separated allowlist string into a set of valid codes.

    Lowercases, strips, drops blanks and any token that isn't a real
    ISO alpha-2 code. Returns the Kenya-only fallback if nothing valid
    remains, so a fat-fingered backoffice edit can never accidentally
    open the gate to everyone or close it to no one.
    """
    if not raw:
        return set(_FALLBACK)
    codes = {
        token.strip().lower()
        for token in raw.split(",")
        if token.strip()
    }
    valid = {c for c in codes if is_valid_country_code(c)}
    return valid or set(_FALLBACK)


async def get_allowed_creator_countries(session: AsyncSession) -> set[str]:
    """Resolve the live creator-country allowlist.

    Precedence: runtime_settings DB/env value → registry default_value
    → Kenya-only fallback. Always returns a non-empty set of valid
    lowercase ISO alpha-2 codes.
    """
    raw: str | None = None
    try:
        raw = await runtime_settings.get(session, ALLOWED_CREATOR_COUNTRIES_KEY)
    except RuntimeSettingsDisabled:
        raw = None

    if not raw:
        reg = REGISTRY_MAP.get(ALLOWED_CREATOR_COUNTRIES_KEY)
        raw = reg.default_value if reg else None

    return parse_allowlist(raw)


async def is_creator_country_allowed(
    session: AsyncSession, country: str | None
) -> bool:
    """True if `country` (ISO alpha-2) is in the live allowlist.

    A missing/unknown country returns False here, but callers decide
    how to treat that — the analyzer treats a *missing* country as a
    soft signal (manual review) rather than an auto-deny, while a
    *known but disallowed* country is a hard deny.
    """
    if not country:
        return False
    return country.strip().lower() in await get_allowed_creator_countries(session)
