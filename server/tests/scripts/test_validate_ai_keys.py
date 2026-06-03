"""Tests for `scripts/validate_ai_keys.py` — the multi-provider validator.

Every HTTP call is monkeypatched. We cover one happy + one rejection +
one rate-limit case per provider, plus the cross-cutting argv handling
and never-leak gates.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

import httpx
import pytest

SCRIPT_PATH = (
    Path(__file__).resolve().parents[2] / "scripts" / "validate_ai_keys.py"
)


def _load():
    spec = importlib.util.spec_from_file_location("validate_ai_keys", SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def mod():
    return _load()


class _FakeResponse:
    def __init__(self, status_code: int, body: dict[str, Any]):
        self.status_code = status_code
        self._body = body

    def json(self) -> dict[str, Any]:
        return self._body


def _patch_post(monkeypatch, mod, *, status_code: int, body: dict[str, Any]):
    calls: list[dict[str, Any]] = []

    def fake_post(url, *, params=None, json=None, headers=None, timeout=None):
        calls.append(
            {"url": url, "params": params, "json": json, "headers": headers}
        )
        return _FakeResponse(status_code, body)

    monkeypatch.setattr(mod.httpx, "post", fake_post)
    return calls


# ---------------------------------------------------------------------------
# Argv handling
# ---------------------------------------------------------------------------


class TestArgvHandling:
    def test_missing_args_exits_2(self, mod, capsys):
        rc = mod.main([])
        assert rc == 2
        assert "usage" in capsys.readouterr().err.lower()

    def test_missing_key_exits_2(self, mod, capsys):
        rc = mod.main(["groq"])
        assert rc == 2
        assert "usage" in capsys.readouterr().err.lower()

    def test_unknown_provider_exits_2(self, mod, capsys):
        rc = mod.main(["bogus-provider", "some-key"])
        assert rc == 2
        captured = capsys.readouterr()
        assert "unknown provider" in captured.err.lower()
        assert "groq" in captured.err  # lists supported providers


# ---------------------------------------------------------------------------
# Per-provider happy + reject paths
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "provider, body, expected_completion",
    [
        (
            "gemini",
            {
                "candidates": [
                    {"content": {"parts": [{"text": "ok"}]}, "finishReason": "STOP"}
                ]
            },
            "ok",
        ),
        (
            "groq",
            {"choices": [{"message": {"content": "ok"}}]},
            "ok",
        ),
        (
            "openrouter",
            {"choices": [{"message": {"content": "ok"}}]},
            "ok",
        ),
        (
            "cerebras",
            {"choices": [{"message": {"content": "ok"}}]},
            "ok",
        ),
        (
            "openai",
            {"choices": [{"message": {"content": "ok"}}]},
            "ok",
        ),
    ],
)
class TestPerProviderHappyPath:
    def test_valid_key_exits_zero(
        self, mod, monkeypatch, capsys, provider, body, expected_completion
    ):
        _patch_post(monkeypatch, mod, status_code=200, body=body)
        rc = mod.main([provider, "test-key"])
        captured = capsys.readouterr()
        assert rc == 0, captured.err
        assert provider in captured.out
        assert "valid" in captured.out

    def test_request_url_targets_correct_endpoint(
        self, mod, monkeypatch, provider, body, expected_completion
    ):
        calls = _patch_post(monkeypatch, mod, status_code=200, body=body)
        mod.main([provider, "test-key"])
        url = calls[0]["url"]
        # Each provider must hit its own host — proves we're not collapsing
        # branches by mistake.
        host_check = {
            "gemini": "generativelanguage.googleapis.com",
            "groq": "api.groq.com",
            "openrouter": "openrouter.ai",
            "cerebras": "api.cerebras.ai",
            "openai": "api.openai.com",
        }[provider]
        assert host_check in url


# ---------------------------------------------------------------------------
# Error branches (one provider is enough — they share the response handler)
# ---------------------------------------------------------------------------


class TestErrorBranches:
    def test_invalid_key_400_exits_1(self, mod, monkeypatch, capsys):
        _patch_post(
            monkeypatch,
            mod,
            status_code=400,
            body={
                "error": {
                    "code": 400,
                    "message": "API key not valid",
                    "status": "INVALID_ARGUMENT",
                }
            },
        )
        rc = mod.main(["gemini", "bad"])
        captured = capsys.readouterr()
        assert rc == 1
        assert "code=400" in captured.err
        assert "INVALID_ARGUMENT" in captured.err

    def test_unauthorized_401_exits_1(self, mod, monkeypatch, capsys):
        _patch_post(
            monkeypatch,
            mod,
            status_code=401,
            body={"error": {"message": "Invalid API key", "type": "invalid_request_error"}},
        )
        rc = mod.main(["openai", "sk-bad"])
        captured = capsys.readouterr()
        assert rc == 1
        assert "code=401" in captured.err

    def test_rate_limited_429_exits_5(self, mod, monkeypatch, capsys):
        _patch_post(
            monkeypatch,
            mod,
            status_code=429,
            body={
                "error": {
                    "status": "RESOURCE_EXHAUSTED",
                    "message": "quota exceeded",
                }
            },
        )
        rc = mod.main(["gemini", "valid-but-rate-limited"])
        captured = capsys.readouterr()
        assert rc == 5
        assert "WARN" in captured.err
        assert "code=429" in captured.err
        assert "key authenticated" in captured.err

    def test_network_error_exits_3(self, mod, monkeypatch, capsys):
        def boom(*a, **kw):
            raise httpx.ConnectError("name resolution failed")

        monkeypatch.setattr(mod.httpx, "post", boom)
        rc = mod.main(["groq", "any"])
        captured = capsys.readouterr()
        assert rc == 3
        assert "code=network" in captured.err

    def test_malformed_200_no_completion_exits_4(self, mod, monkeypatch, capsys):
        _patch_post(
            monkeypatch,
            mod,
            status_code=200,
            body={"choices": [{"message": {"content": ""}}]},
        )
        rc = mod.main(["groq", "abc"])
        captured = capsys.readouterr()
        assert rc == 4
        assert "empty completion text" in captured.err


# ---------------------------------------------------------------------------
# No-leak gate — applies to every provider
# ---------------------------------------------------------------------------


class TestNoLeakGate:
    SECRET = "DUMMY-LEAK-SENTINEL-XYZ123-987654-FOOBAR-789"

    @pytest.mark.parametrize(
        "provider,body",
        [
            (
                "gemini",
                {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]},
            ),
            ("groq", {"choices": [{"message": {"content": "ok"}}]}),
            ("openrouter", {"choices": [{"message": {"content": "ok"}}]}),
            ("cerebras", {"choices": [{"message": {"content": "ok"}}]}),
            ("openai", {"choices": [{"message": {"content": "ok"}}]}),
        ],
    )
    def test_no_leak_on_happy_path(
        self, mod, monkeypatch, capsys, provider, body
    ):
        _patch_post(monkeypatch, mod, status_code=200, body=body)
        mod.main([provider, self.SECRET])
        captured = capsys.readouterr()
        assert self.SECRET not in captured.out
        assert self.SECRET not in captured.err

    def test_no_leak_on_rejection(self, mod, monkeypatch, capsys):
        _patch_post(
            monkeypatch,
            mod,
            status_code=400,
            body={"error": {"status": "INVALID_ARGUMENT", "message": "bad key"}},
        )
        mod.main(["gemini", self.SECRET])
        captured = capsys.readouterr()
        assert self.SECRET not in captured.out
        assert self.SECRET not in captured.err
