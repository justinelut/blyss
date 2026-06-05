from unittest.mock import AsyncMock, patch

import httpx
import pytest

from polar.runtime_settings.verifiers import (
    verify_cerebras,
    verify_groq,
    verify_loops,
    verify_openai,
    verify_openrouter,
    verify_paystack,
    verify_resend,
)


def _mock_response(status_code: int) -> httpx.Response:
    return httpx.Response(status_code=status_code, request=httpx.Request("GET", "http://x"))


@pytest.mark.asyncio
class TestVerifyPaystack:
    async def test_success(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(200)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_paystack("sk_test_123")
        assert result.ok is True

    async def test_unauthorized(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(401)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_paystack("bad_key")
        assert result.ok is False

    async def test_network_error(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.side_effect = httpx.ConnectError("connection refused")
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_paystack("key")
        assert result.ok is False


@pytest.mark.asyncio
class TestVerifyResend:
    async def test_success(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(200)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_resend("re_123")
        assert result.ok is True

    async def test_failure(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(403)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_resend("bad")
        assert result.ok is False


@pytest.mark.asyncio
class TestVerifyLoops:
    async def test_success(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(200)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_loops("loops_key")
        assert result.ok is True

    async def test_server_error(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(500)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_loops("key")
        assert result.ok is False


@pytest.mark.asyncio
class TestVerifyGroq:
    async def test_success(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(200)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_groq("gsk_123")
        assert result.ok is True

    async def test_failure(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(401)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_groq("bad")
        assert result.ok is False


@pytest.mark.asyncio
class TestVerifyOpenRouter:
    async def test_success(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(200)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_openrouter("or_key")
        assert result.ok is True

    async def test_timeout(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.side_effect = httpx.TimeoutException("timed out")
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_openrouter("key")
        assert result.ok is False
        assert "timed out" in result.message


@pytest.mark.asyncio
class TestVerifyOpenAI:
    async def test_success(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(200)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_openai("sk-123")
        assert result.ok is True

    async def test_failure(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(401)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_openai("bad")
        assert result.ok is False


@pytest.mark.asyncio
class TestVerifyCerebras:
    async def test_success(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(200)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_cerebras("csk_123")
        assert result.ok is True

    async def test_failure(self) -> None:
        with patch("polar.runtime_settings.verifiers.httpx.AsyncClient") as mock_cls:
            client = AsyncMock()
            client.get.return_value = _mock_response(500)
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = client
            result = await verify_cerebras("bad")
        assert result.ok is False
