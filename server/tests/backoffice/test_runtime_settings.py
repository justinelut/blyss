"""Tests for the backoffice runtime settings management page."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from cryptography.fernet import Fernet

from polar.backoffice import app as backoffice_app
from polar.backoffice.dependencies import get_admin
from polar.models import User
from polar.models.user_session import UserSession
from polar.postgres import AsyncSession, get_db_session
from polar.runtime_settings.model import RuntimeSettingStatus
from polar.runtime_settings.repository import RuntimeSettingsRepository
from polar.runtime_settings.service import runtime_settings
from polar.runtime_settings.verifiers import VerifierResult

FERNET_KEY = Fernet.generate_key().decode()


def _make_admin_session(user: User) -> MagicMock:
    session = MagicMock(spec=UserSession)
    session.user = user
    return session


@pytest.fixture
def admin_session(user: User) -> MagicMock:
    return _make_admin_session(user)


@pytest.fixture(autouse=True)
def _override_deps(session: AsyncSession, admin_session: MagicMock):
    backoffice_app.dependency_overrides[get_admin] = lambda: admin_session
    backoffice_app.dependency_overrides[get_db_session] = lambda: session
    yield
    backoffice_app.dependency_overrides.pop(get_admin, None)
    backoffice_app.dependency_overrides.pop(get_db_session, None)


@pytest.fixture
def _patch_settings():
    with patch("polar.runtime_settings.service.settings") as mock_settings:
        mock_settings.RUNTIME_SETTINGS_KEY = FERNET_KEY
        yield mock_settings


async def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=backoffice_app),
        base_url="http://test",
    )


@pytest.mark.asyncio
class TestRuntimeSettingsIndex:
    async def test_renders_all_categories(self) -> None:
        async with await _client() as client:
            resp = await client.get("/runtime-settings/")
        assert resp.status_code == 200
        body = resp.text
        assert "Payments" in body
        assert "Email" in body
        assert "AI" in body
        assert "Auth" in body
        # "Other" only renders if registry has keys in that category
        assert "Paystack Secret Key" in body
        assert "Resend API Key" in body

    async def test_shows_env_fallback_badge(self) -> None:
        with patch.dict(os.environ, {"PAYSTACK_SECRET_KEY": "sk_test_xxx"}):
            async with await _client() as client:
                resp = await client.get("/runtime-settings/")
        assert resp.status_code == 200
        assert "Env fallback" in resp.text

    async def test_shows_not_configured_badge(self) -> None:
        env = {k: v for k, v in os.environ.items() if k != "PLAIN_TOKEN"}
        with patch.dict(os.environ, env, clear=True):
            async with await _client() as client:
                resp = await client.get("/runtime-settings/")
        assert resp.status_code == 200
        assert "Not configured" in resp.text

    async def test_shows_active_badge(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        await runtime_settings.set(
            session, "PAYSTACK_PUBLIC_KEY", "pk_test_123", None
        )
        await session.commit()
        try:
            async with await _client() as client:
                resp = await client.get("/runtime-settings/")
            assert resp.status_code == 200
            assert "Active" in resp.text
        finally:
            repo = RuntimeSettingsRepository(session)
            row = await repo.get_by_key("PAYSTACK_PUBLIC_KEY")
            if row:
                await repo.delete(row)
                await session.commit()

    async def test_shows_pending_badge(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        await runtime_settings.set(
            session, "PAYSTACK_SECRET_KEY", "sk_test_123", None
        )
        await session.commit()
        try:
            async with await _client() as client:
                resp = await client.get("/runtime-settings/")
            assert resp.status_code == 200
            assert "Pending verification" in resp.text
        finally:
            repo = RuntimeSettingsRepository(session)
            row = await repo.get_by_key("PAYSTACK_SECRET_KEY")
            if row:
                await repo.delete(row)
                await session.commit()

    async def test_shows_failed_badge(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        await runtime_settings.set(
            session, "PAYSTACK_SECRET_KEY", "sk_bad", None
        )
        await session.commit()
        repo = RuntimeSettingsRepository(session)
        row = await repo.get_by_key("PAYSTACK_SECRET_KEY")
        await repo.mark_verified(row, ok=False, error="HTTP 401 Unauthorized")
        await session.commit()
        try:
            async with await _client() as client:
                resp = await client.get("/runtime-settings/")
            assert resp.status_code == 200
            assert "Verification failed" in resp.text
            assert "HTTP 401 Unauthorized" in resp.text
        finally:
            row = await repo.get_by_key("PAYSTACK_SECRET_KEY")
            if row:
                await repo.delete(row)
                await session.commit()


@pytest.mark.asyncio
class TestSave:
    async def test_empty_value_returns_error(self) -> None:
        async with await _client() as client:
            resp = await client.post(
                "/runtime-settings/PAYSTACK_PUBLIC_KEY",
                data={"value": ""},
                follow_redirects=False,
            )
        # Redirect with error toast (HX-Redirect or 307)
        assert resp.status_code in (200, 307)

    async def test_non_verifiable_key_activates_immediately(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        async with await _client() as client:
            resp = await client.post(
                "/runtime-settings/PAYSTACK_PUBLIC_KEY",
                data={"value": "pk_test_new_value"},
                follow_redirects=False,
            )
        repo = RuntimeSettingsRepository(session)
        row = await repo.get_by_key("PAYSTACK_PUBLIC_KEY")
        assert row is not None
        assert row.status == RuntimeSettingStatus.active
        # Cleanup
        await repo.delete(row)
        await session.commit()

    async def test_save_without_master_key_does_not_500(
        self, session: AsyncSession
    ) -> None:
        """Regression: saving when POLAR_RUNTIME_SETTINGS_KEY is unset must NOT
        bubble up as a raw 500. It should degrade to a friendly toast/redirect
        and persist nothing.

        This reproduces the production incident where the backoffice returned a
        bare 21-byte "Internal Server Error" because RuntimeSettingsService.set
        raised RuntimeSettingsDisabled and the backoffice app had no PolarError
        handler.
        """
        with patch("polar.runtime_settings.service.settings") as mock_settings:
            mock_settings.RUNTIME_SETTINGS_KEY = None
            async with await _client() as client:
                resp = await client.post(
                    "/runtime-settings/PAYSTACK_PUBLIC_KEY",
                    data={"value": "pk_test_should_not_persist"},
                    headers={"HX-Request": "true"},
                    follow_redirects=False,
                )

        # Graceful: HX redirect (200) — never a 500.
        assert resp.status_code != 500
        assert resp.status_code in (200, 307)

        # Nothing should have been written.
        repo = RuntimeSettingsRepository(session)
        row = await repo.get_by_key("PAYSTACK_PUBLIC_KEY")
        assert row is None

    async def test_verifiable_key_stays_pending(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        async with await _client() as client:
            resp = await client.post(
                "/runtime-settings/PAYSTACK_SECRET_KEY",
                data={"value": "sk_test_new_value"},
                follow_redirects=False,
            )
        repo = RuntimeSettingsRepository(session)
        row = await repo.get_by_key("PAYSTACK_SECRET_KEY")
        assert row is not None
        assert row.status == RuntimeSettingStatus.pending
        # Cleanup
        await repo.delete(row)
        await session.commit()


@pytest.mark.asyncio
class TestTestConnection:
    async def test_verify_success_activates(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        await runtime_settings.set(
            session, "PAYSTACK_SECRET_KEY", "sk_live_abc", None
        )
        await session.commit()

        with patch(
            "polar.runtime_settings.service.REGISTRY_MAP",
            {
                "PAYSTACK_SECRET_KEY": MagicMock(
                    verifier=AsyncMock(
                        return_value=VerifierResult(ok=True, message="ok")
                    ),
                    requires_verification=True,
                )
            },
        ):
            async with await _client() as client:
                await client.post(
                    "/runtime-settings/PAYSTACK_SECRET_KEY/test",
                    follow_redirects=False,
                )

        repo = RuntimeSettingsRepository(session)
        row = await repo.get_by_key("PAYSTACK_SECRET_KEY")
        assert row is not None
        assert row.status == RuntimeSettingStatus.active
        await repo.delete(row)
        await session.commit()

    async def test_verify_failure_marks_failed(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        await runtime_settings.set(
            session, "PAYSTACK_SECRET_KEY", "sk_bad_key", None
        )
        await session.commit()

        with patch(
            "polar.runtime_settings.service.REGISTRY_MAP",
            {
                "PAYSTACK_SECRET_KEY": MagicMock(
                    verifier=AsyncMock(
                        return_value=VerifierResult(ok=False, message="HTTP 401")
                    ),
                    requires_verification=True,
                )
            },
        ):
            async with await _client() as client:
                await client.post(
                    "/runtime-settings/PAYSTACK_SECRET_KEY/test",
                    follow_redirects=False,
                )

        repo = RuntimeSettingsRepository(session)
        row = await repo.get_by_key("PAYSTACK_SECRET_KEY")
        assert row is not None
        assert row.status == RuntimeSettingStatus.failed
        assert row.last_error == "HTTP 401"
        await repo.delete(row)
        await session.commit()


@pytest.mark.asyncio
class TestDelete:
    async def test_delete_removes_row(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        await runtime_settings.set(
            session, "PAYSTACK_PUBLIC_KEY", "pk_test_del", None
        )
        await session.commit()

        async with await _client() as client:
            await client.post(
                "/runtime-settings/PAYSTACK_PUBLIC_KEY/delete",
                follow_redirects=False,
            )

        repo = RuntimeSettingsRepository(session)
        row = await repo.get_by_key("PAYSTACK_PUBLIC_KEY")
        assert row is None

    async def test_after_delete_shows_env_fallback(
        self, session: AsyncSession, _patch_settings
    ) -> None:
        await runtime_settings.set(
            session, "PAYSTACK_PUBLIC_KEY", "pk_test_del2", None
        )
        await session.commit()

        async with await _client() as client:
            await client.post(
                "/runtime-settings/PAYSTACK_PUBLIC_KEY/delete",
                follow_redirects=False,
            )

        with patch.dict(os.environ, {"PAYSTACK_PUBLIC_KEY": "pk_env_val"}):
            async with await _client() as client:
                resp = await client.get("/runtime-settings/")
        assert "Env fallback" in resp.text


@pytest.mark.asyncio
class TestNonAdminBlocked:
    async def test_non_admin_gets_403(self, session: AsyncSession) -> None:
        from fastapi import HTTPException

        async def _raise_forbidden():
            raise HTTPException(status_code=403, detail="Forbidden")

        backoffice_app.dependency_overrides[get_admin] = _raise_forbidden

        async with await _client() as client:
            resp = await client.get("/runtime-settings/")
        assert resp.status_code == 403
