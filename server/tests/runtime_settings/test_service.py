import time
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet

from polar.kit.secrets import encrypt
from polar.runtime_settings.model import RuntimeSetting, RuntimeSettingStatus
from polar.runtime_settings.service import (
    CACHE_TTL_SECONDS,
    RuntimeSettingsDisabled,
    RuntimeSettingsService,
)
from polar.runtime_settings.verifiers import VerifierResult


@pytest.fixture
def master_key() -> str:
    return Fernet.generate_key().decode()


@pytest.fixture
def svc() -> RuntimeSettingsService:
    return RuntimeSettingsService()


def _make_row(key: str, plaintext: str, status: str, fernet_key: str) -> MagicMock:
    row = MagicMock(spec=RuntimeSetting)
    row.key = key
    row.encrypted_value = encrypt(plaintext, fernet_key.encode())
    row.status = status
    row.last_error = None
    row.last_verified_at = None
    return row


@pytest.mark.asyncio
class TestGet:
    async def test_active_row_returns_db_value(
        self, svc: RuntimeSettingsService, master_key: str
    ) -> None:
        row = _make_row("PAYSTACK_SECRET_KEY", "db_secret", RuntimeSettingStatus.active, master_key)
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = master_key
            mock_settings.PAYSTACK_SECRET_KEY = "env_secret"
            with patch(
                "polar.runtime_settings.service.RuntimeSettingsRepository"
            ) as mock_repo_cls:
                repo = AsyncMock()
                repo.get_by_key.return_value = row
                mock_repo_cls.return_value = repo
                result = await svc.get(AsyncMock(), "PAYSTACK_SECRET_KEY")
        assert result == "db_secret"

    async def test_pending_row_falls_through_to_env(
        self, svc: RuntimeSettingsService, master_key: str
    ) -> None:
        row = _make_row("PAYSTACK_SECRET_KEY", "pending_val", RuntimeSettingStatus.pending, master_key)
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = master_key
            mock_settings.PAYSTACK_SECRET_KEY = "env_val"
            with patch(
                "polar.runtime_settings.service.RuntimeSettingsRepository"
            ) as mock_repo_cls:
                repo = AsyncMock()
                repo.get_by_key.return_value = row
                mock_repo_cls.return_value = repo
                result = await svc.get(AsyncMock(), "PAYSTACK_SECRET_KEY")
        assert result == "env_val"

    async def test_failed_row_falls_through_to_env(
        self, svc: RuntimeSettingsService, master_key: str
    ) -> None:
        row = _make_row("RESEND_API_KEY", "bad_key", RuntimeSettingStatus.failed, master_key)
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = master_key
            mock_settings.RESEND_API_KEY = "env_resend"
            with patch(
                "polar.runtime_settings.service.RuntimeSettingsRepository"
            ) as mock_repo_cls:
                repo = AsyncMock()
                repo.get_by_key.return_value = row
                mock_repo_cls.return_value = repo
                result = await svc.get(AsyncMock(), "RESEND_API_KEY")
        assert result == "env_resend"

    async def test_cache_ttl_respected(
        self, svc: RuntimeSettingsService, master_key: str
    ) -> None:
        # Seed cache with old entry
        svc._cache["MY_KEY"] = ("cached_val", time.time() - CACHE_TTL_SECONDS - 1)
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = master_key
            mock_settings.MY_KEY = "env_fallback"
            with patch(
                "polar.runtime_settings.service.RuntimeSettingsRepository"
            ) as mock_repo_cls:
                repo = AsyncMock()
                repo.get_by_key.return_value = None
                mock_repo_cls.return_value = repo
                result = await svc.get(AsyncMock(), "MY_KEY")
        assert result == "env_fallback"

    async def test_missing_master_key_falls_through(
        self, svc: RuntimeSettingsService
    ) -> None:
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = None
            mock_settings.PLAIN_TOKEN = "env_plain"
            result = await svc.get(AsyncMock(), "PLAIN_TOKEN")
        assert result == "env_plain"


@pytest.mark.asyncio
class TestSet:
    async def test_set_resets_status_to_pending(
        self, svc: RuntimeSettingsService, master_key: str
    ) -> None:
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = master_key
            with patch(
                "polar.runtime_settings.service.RuntimeSettingsRepository"
            ) as mock_repo_cls:
                repo = AsyncMock()
                row = MagicMock(spec=RuntimeSetting)
                row.status = RuntimeSettingStatus.pending
                repo.upsert.return_value = row
                mock_repo_cls.return_value = repo
                with patch(
                    "polar.runtime_settings.service.REGISTRY_MAP", {}
                ):
                    result = await svc.set(AsyncMock(), "SOME_KEY", "val", uuid4())
        assert result.status == RuntimeSettingStatus.pending

    async def test_set_invalidates_cache(
        self, svc: RuntimeSettingsService, master_key: str
    ) -> None:
        svc._cache["MY_KEY"] = ("old", time.time())
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = master_key
            with patch(
                "polar.runtime_settings.service.RuntimeSettingsRepository"
            ) as mock_repo_cls:
                repo = AsyncMock()
                row = MagicMock(spec=RuntimeSetting)
                row.status = RuntimeSettingStatus.pending
                repo.upsert.return_value = row
                mock_repo_cls.return_value = repo
                with patch("polar.runtime_settings.service.REGISTRY_MAP", {}):
                    await svc.set(AsyncMock(), "MY_KEY", "new_val", uuid4())
        assert "MY_KEY" not in svc._cache

    async def test_set_raises_when_no_master_key(
        self, svc: RuntimeSettingsService
    ) -> None:
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = None
            with pytest.raises(RuntimeSettingsDisabled):
                await svc.set(AsyncMock(), "K", "v", uuid4())


@pytest.mark.asyncio
class TestVerify:
    async def test_verify_success_sets_active(
        self, svc: RuntimeSettingsService, master_key: str
    ) -> None:
        row = _make_row("PAYSTACK_SECRET_KEY", "sk_test", RuntimeSettingStatus.pending, master_key)
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = master_key
            with patch(
                "polar.runtime_settings.service.RuntimeSettingsRepository"
            ) as mock_repo_cls:
                repo = AsyncMock()
                repo.get_by_key.return_value = row
                mock_repo_cls.return_value = repo
                with patch(
                    "polar.runtime_settings.service.REGISTRY_MAP",
                    {
                        "PAYSTACK_SECRET_KEY": MagicMock(
                            verifier=AsyncMock(
                                return_value=VerifierResult(ok=True, message="ok")
                            )
                        )
                    },
                ):
                    await svc.verify(AsyncMock(), "PAYSTACK_SECRET_KEY")
        repo.mark_verified.assert_called_once_with(row, ok=True, error=None)

    async def test_verify_failure_sets_failed(
        self, svc: RuntimeSettingsService, master_key: str
    ) -> None:
        row = _make_row("RESEND_API_KEY", "bad", RuntimeSettingStatus.pending, master_key)
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = master_key
            with patch(
                "polar.runtime_settings.service.RuntimeSettingsRepository"
            ) as mock_repo_cls:
                repo = AsyncMock()
                repo.get_by_key.return_value = row
                mock_repo_cls.return_value = repo
                with patch(
                    "polar.runtime_settings.service.REGISTRY_MAP",
                    {
                        "RESEND_API_KEY": MagicMock(
                            verifier=AsyncMock(
                                return_value=VerifierResult(ok=False, message="HTTP 401")
                            )
                        )
                    },
                ):
                    await svc.verify(AsyncMock(), "RESEND_API_KEY")
        repo.mark_verified.assert_called_once_with(row, ok=False, error="HTTP 401")

    async def test_verify_raises_when_no_master_key(
        self, svc: RuntimeSettingsService
    ) -> None:
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = None
            with pytest.raises(RuntimeSettingsDisabled):
                await svc.verify(AsyncMock(), "K")
