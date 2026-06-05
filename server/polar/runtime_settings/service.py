"""Runtime settings service — read-through cache with Redis invalidation."""

from __future__ import annotations

import asyncio
import time
from uuid import UUID

import structlog

from polar.config import settings
from polar.exceptions import PolarError
from polar.kit.secrets import decrypt, encrypt, hash_value
from polar.kit.utils import utc_now
from polar.postgres import AsyncSession
from polar.redis import Redis
from polar.runtime_settings.model import RuntimeSetting, RuntimeSettingStatus
from polar.runtime_settings.registry import REGISTRY_MAP
from polar.runtime_settings.repository import RuntimeSettingsRepository

log = structlog.get_logger()

CACHE_TTL_SECONDS = 60
INVALIDATION_CHANNEL = "runtime_settings:invalidate"


class RuntimeSettingsDisabled(PolarError):
    def __init__(self) -> None:
        super().__init__(
            "Runtime settings disabled (POLAR_RUNTIME_SETTINGS_KEY not set)",
            status_code=503,
        )


class RuntimeSettingsService:
    def __init__(self) -> None:
        self._cache: dict[str, tuple[str, float]] = {}

    def _master_key(self) -> bytes:
        key = settings.RUNTIME_SETTINGS_KEY
        if not key:
            raise RuntimeSettingsDisabled()
        return key.encode()

    async def get(self, session: AsyncSession, key: str) -> str | None:
        # Check cache
        cached = self._cache.get(key)
        if cached:
            value, fetched_at = cached
            if time.time() - fetched_at < CACHE_TTL_SECONDS:
                return value

        # Try DB if master key available
        master_key = settings.RUNTIME_SETTINGS_KEY
        if master_key:
            repo = RuntimeSettingsRepository(session)
            row = await repo.get_by_key(key)
            if row and row.status == RuntimeSettingStatus.active:
                decrypted = decrypt(row.encrypted_value, master_key.encode())
                self._cache[key] = (decrypted, time.time())
                return decrypted

        # Fall through to env
        return getattr(settings, key, None) or None

    async def set(
        self,
        session: AsyncSession,
        key: str,
        plaintext: str,
        updated_by_user_id: UUID | None,
    ) -> RuntimeSetting:
        master_key = self._master_key()
        encrypted = encrypt(plaintext, master_key)
        vh = hash_value(plaintext)

        repo = RuntimeSettingsRepository(session)
        row = await repo.upsert(key, encrypted, vh, updated_by_user_id)

        # If key doesn't require verification, activate immediately
        registered = REGISTRY_MAP.get(key)
        if registered and not registered.requires_verification:
            await repo.mark_verified(row, ok=True)

        self._cache.pop(key, None)
        return row

    async def verify(self, session: AsyncSession, key: str) -> RuntimeSetting:
        master_key = self._master_key()
        repo = RuntimeSettingsRepository(session)
        row = await repo.get_by_key(key)
        if not row:
            raise PolarError(f"Runtime setting '{key}' not found", status_code=404)

        plaintext = decrypt(row.encrypted_value, master_key)

        registered = REGISTRY_MAP.get(key)
        if registered and registered.verifier:
            result = await registered.verifier(plaintext)
            await repo.mark_verified(row, ok=result.ok, error=result.message if not result.ok else None)
        else:
            # No verifier = auto-active
            await repo.mark_verified(row, ok=True)

        self._cache.pop(key, None)
        return row

    async def invalidate(self, key: str, redis: Redis | None = None) -> None:
        self._cache.pop(key, None)
        if redis:
            await redis.publish(INVALIDATION_CHANNEL, key)

    async def subscribe_invalidations(self, redis: Redis) -> None:
        """Start background listener for cross-pod cache invalidation."""

        async def _listener() -> None:
            pubsub = redis.pubsub()
            await pubsub.subscribe(INVALIDATION_CHANNEL)
            try:
                async for msg in pubsub.listen():
                    if msg["type"] == "message":
                        key = msg["data"]
                        if isinstance(key, bytes):
                            key = key.decode()
                        self._cache.pop(key, None)
            finally:
                await pubsub.unsubscribe(INVALIDATION_CHANNEL)

        asyncio.create_task(_listener())
        log.info("runtime_settings.invalidation_listener_started")


runtime_settings = RuntimeSettingsService()
