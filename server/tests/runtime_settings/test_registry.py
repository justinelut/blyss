from polar.runtime_settings.registry import ALLOWED_CATEGORIES, REGISTRY


class TestRegistry:
    def test_unique_keys(self) -> None:
        keys = [r.key for r in REGISTRY]
        assert len(keys) == len(set(keys))

    def test_valid_categories(self) -> None:
        for r in REGISTRY:
            assert r.category in ALLOWED_CATEGORIES, f"{r.key} has invalid category {r.category}"

    def test_verifier_callable_when_present(self) -> None:
        for r in REGISTRY:
            if r.verifier is not None:
                assert callable(r.verifier), f"{r.key} verifier not callable"

    def test_requires_verification_has_verifier(self) -> None:
        for r in REGISTRY:
            if r.requires_verification:
                assert r.verifier is not None, f"{r.key} requires verification but has no verifier"
