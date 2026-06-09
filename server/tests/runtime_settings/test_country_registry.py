"""Registry test for the ALLOWED_CREATOR_COUNTRIES runtime setting."""

from polar.organization.country_gate import ALLOWED_CREATOR_COUNTRIES_KEY
from polar.runtime_settings.registry import REGISTRY_MAP


def test_allowed_creator_countries_registered() -> None:
    reg = REGISTRY_MAP.get(ALLOWED_CREATOR_COUNTRIES_KEY)
    assert reg is not None
    assert reg.default_value == "ke"
    # Non-secret so the value renders in the backoffice list, and no
    # verification step (it's not an API key).
    assert reg.sensitive is False
    assert reg.requires_verification is False
