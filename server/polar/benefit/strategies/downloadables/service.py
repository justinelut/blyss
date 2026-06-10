from __future__ import annotations

from typing import Any, cast
from uuid import UUID

import structlog

from polar.auth.models import AuthSubject
from polar.customer_portal.service.downloadables import (
    downloadable as downloadable_service,
)
from polar.logging import Logger
from polar.models import Benefit, Customer, Member, Organization, User

from ..base.service import BenefitServiceProtocol
from . import schemas
from .properties import (
    BenefitDownloadablesProperties,
    BenefitGrantDownloadablesProperties,
)

log: Logger = structlog.get_logger()


def get_active_file_ids(properties: BenefitDownloadablesProperties) -> list[UUID]:
    schema = schemas.BenefitDownloadablesProperties(**properties)
    return schemas.get_active_file_ids(schema)


class BenefitDownloadablesService(
    BenefitServiceProtocol[
        BenefitDownloadablesProperties, BenefitGrantDownloadablesProperties
    ]
):
    async def grant(
        self,
        benefit: Benefit,
        customer: Customer,
        grant_properties: BenefitGrantDownloadablesProperties,
        *,
        update: bool = False,
        attempt: int = 1,
        member: Member | None = None,
    ) -> BenefitGrantDownloadablesProperties:
        properties = self._get_properties(benefit)
        file_ids = get_active_file_ids(properties)

        # Safety net: a paying customer must never receive an EMPTY
        # downloadables benefit. If the creator archived every file (often
        # unintentionally — e.g. a single-file benefit whose only file got
        # toggled off), get_active_file_ids() returns [] and the buyer would
        # get a benefit with nothing to download. In that case, fall back to
        # granting ALL of the benefit's files. The customer portal already
        # labels non-active files as "Legacy" but keeps them downloadable, so
        # this only affects entitlement, not the active/legacy display. When
        # there's a healthy mix of active + archived files, normal semantics
        # apply (only active files are granted).
        all_file_ids = list(properties.get("files", []) or [])
        if not file_ids and all_file_ids:
            log.warning(
                "downloadables.grant.no_active_files_fallback",
                benefit_id=benefit.id,
                customer_id=customer.id,
                total_files=len(all_file_ids),
            )
            file_ids = all_file_ids

        if not file_ids:
            return {}

        granted = []
        for file_id in file_ids:
            downloadable = await downloadable_service.grant_for_benefit_file(
                self.session,
                customer=customer,
                benefit_id=benefit.id,
                file_id=file_id,
                member_id=member.id if member else None,
            )
            if downloadable:
                granted.append(str(downloadable.file_id))

        return {
            "files": granted,
        }

    async def cycle(
        self,
        benefit: Benefit,
        customer: Customer,
        grant_properties: BenefitGrantDownloadablesProperties,
        *,
        attempt: int = 1,
        member: Member | None = None,
    ) -> BenefitGrantDownloadablesProperties:
        return grant_properties

    async def revoke(
        self,
        benefit: Benefit,
        customer: Customer,
        grant_properties: BenefitGrantDownloadablesProperties,
        *,
        attempt: int = 1,
        member: Member | None = None,
    ) -> BenefitGrantDownloadablesProperties:
        await downloadable_service.revoke_for_benefit(
            self.session,
            customer=customer,
            benefit_id=benefit.id,
        )
        return {}

    async def requires_update(
        self, benefit: Benefit, previous_properties: BenefitDownloadablesProperties
    ) -> bool:
        properties = self._get_properties(benefit)
        new_file_ids = set(get_active_file_ids(properties))
        previous_file_ids = set(get_active_file_ids(previous_properties))
        return new_file_ids != previous_file_ids

    async def validate_properties(
        self, auth_subject: AuthSubject[User | Organization], properties: dict[str, Any]
    ) -> BenefitDownloadablesProperties:
        return cast(BenefitDownloadablesProperties, properties)
