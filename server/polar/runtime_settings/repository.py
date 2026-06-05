from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from polar.kit.repository import RepositoryBase
from polar.kit.utils import utc_now
from polar.runtime_settings.model import RuntimeSetting, RuntimeSettingStatus


class RuntimeSettingsRepository(RepositoryBase[RuntimeSetting]):
    model = RuntimeSetting

    async def get_by_key(self, key: str) -> RuntimeSetting | None:
        stmt = select(RuntimeSetting).where(RuntimeSetting.key == key)
        return await self.get_one_or_none(stmt)

    async def upsert(
        self,
        key: str,
        encrypted_value: bytes,
        value_hash: str,
        updated_by_user_id: UUID | None,
    ) -> RuntimeSetting:
        now = utc_now()
        stmt = (
            insert(RuntimeSetting)
            .values(
                key=key,
                encrypted_value=encrypted_value,
                status=RuntimeSettingStatus.pending,
                value_hash=value_hash,
                updated_at=now,
                updated_by_user_id=updated_by_user_id,
                last_verified_at=None,
                last_error=None,
            )
            .on_conflict_do_update(
                index_elements=[RuntimeSetting.key],
                set_=dict(
                    encrypted_value=encrypted_value,
                    status=RuntimeSettingStatus.pending,
                    value_hash=value_hash,
                    updated_at=now,
                    updated_by_user_id=updated_by_user_id,
                    last_verified_at=None,
                    last_error=None,
                ),
            )
            .returning(RuntimeSetting)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.scalar_one()

    async def mark_verified(
        self, setting: RuntimeSetting, ok: bool, error: str | None = None
    ) -> None:
        setting.status = (
            RuntimeSettingStatus.active if ok else RuntimeSettingStatus.failed
        )
        setting.last_verified_at = utc_now()
        setting.last_error = error if not ok else None
        self.session.add(setting)
        await self.session.flush()

    async def list_all(self) -> Sequence[RuntimeSetting]:
        stmt = select(RuntimeSetting)
        return await self.get_all(stmt)

    async def delete(self, setting: RuntimeSetting) -> None:
        await self.session.delete(setting)
        await self.session.flush()
