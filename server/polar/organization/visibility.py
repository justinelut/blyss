"""Public-visibility filter for organizations.

Single source of truth for "should this organization show up on a
public marketplace surface?". Used by every anonymous-facing
endpoint that lists or joins to organizations:

  - GET /v1/organizations/public        (homepage trending strip)
  - GET /v1/organizations/creators      (directory)
  - GET /v1/organizations/creators/{slug} (creator storefront)
  - GET /v1/products/public             (marketplace browse)
  - GET /v1/products/{id}               (PDP)
  - GET /v1/categories/{slug}/products  (category page)
  - GET /v1/search/* (any public search hitting Org)

Why this lives in one helper:

A creator is "publicly listable" only when ALL of these are true:

  1. ``is_deleted = False`` — the row isn't soft-deleted.
  2. ``blocked_at IS NULL`` — backoffice hasn't blocked them.
  3. ``status = 'active'`` — passed AI/manual review. Pre-review
     creators (``created`` / ``onboarding_started`` / ``initial_review``)
     have no AI verdict yet — surfacing their products before the
     review opinion lands risks a sale that the platform later has to
     refund and apologise for if the creator gets denied.
  4. ``subaccount_status = 'active'`` — Paystack subaccount is
     verified and capable of receiving a payout. Surfacing a product
     whose creator can't be paid leads to the dreaded
     ``inactive_subaccount`` error at checkout — a great way to lose
     a sale forever.

Owners still see their own catalogue from the dashboard regardless of
status — those queries use auth-bearing paths that never pass through
this helper.
"""

from __future__ import annotations

from sqlalchemy.sql import ColumnElement

from polar.models.organization import (
    Organization,
    OrganizationStatus,
    SubaccountStatus,
)


def public_organization_filters() -> list[ColumnElement[bool]]:
    """Return the where-clause fragments that gate public visibility.

    Use as ``statement.where(*public_organization_filters())``. Returning
    a list (not a tuple of ``and_``-combined clauses) lets callers
    splat them alongside their own filters without nesting.
    """
    return [
        Organization.is_deleted.is_(False),
        Organization.blocked_at.is_(None),
        Organization.status == OrganizationStatus.ACTIVE,
        Organization.subaccount_status == SubaccountStatus.ACTIVE,
    ]
