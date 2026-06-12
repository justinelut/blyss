import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from pytest_mock import MockerFixture

from polar.enums import AccountType
from polar.models import Product, User
from polar.models.account import Account
from polar.models.organization import Organization, OrganizationStatus
from polar.models.subscription import SubscriptionStatus
from polar.models.user import IdentityVerificationStatus
from polar.models.user_organization import UserOrganization
from polar.postgres import AsyncSession
from polar.user_organization.service import (
    user_organization as user_organization_service,
)
from tests.fixtures.auth import AuthSubjectFixture
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import (
    create_customer,
    create_order,
    create_subscription,
)


@pytest.mark.asyncio
class TestListOrganizations:
    async def test_anonymous(self, client: AsyncClient) -> None:
        response = await client.get("/v1/organizations/")

        assert response.status_code == 401

    @pytest.mark.auth
    async def test_not_member(self, client: AsyncClient) -> None:
        response = await client.get("/v1/organizations/")

        assert response.status_code == 200

        json = response.json()
        assert json["pagination"]["total_count"] == 0

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
        AuthSubjectFixture(subject="organization"),
    )
    async def test_valid(
        self,
        client: AsyncClient,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        response = await client.get("/v1/organizations/")

        assert response.status_code == 200

        json = response.json()
        assert json["pagination"]["total_count"] == 1
        assert json["items"][0]["id"] == str(organization.id)


@pytest.mark.asyncio
class TestGetOrganization:
    async def test_anonymous(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.get(f"/v1/organizations/{organization.id}")

        assert response.status_code == 401

    @pytest.mark.auth
    async def test_not_member(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.get(f"/v1/organizations/{organization.id}")

        assert response.status_code == 404

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
        AuthSubjectFixture(subject="organization"),
    )
    async def test_not_existing(self, client: AsyncClient) -> None:
        response = await client.get(f"/v1/organizations/{uuid.uuid4()}")

        assert response.status_code == 404

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
        AuthSubjectFixture(subject="organization"),
    )
    async def test_valid(
        self,
        client: AsyncClient,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        response = await client.get(f"/v1/organizations/{organization.id}")

        assert response.status_code == 200

        json = response.json()
        assert json["id"] == str(organization.id)


@pytest.mark.asyncio
class TestUpdateOrganization:
    @pytest.mark.auth
    async def test_not_existing(self, client: AsyncClient) -> None:
        response = await client.patch(f"/v1/organizations/{uuid.uuid4()}", json={})

        assert response.status_code == 404

    @pytest.mark.auth
    async def test_not_admin(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.patch(f"/v1/organizations/{organization.id}", json={})

        assert response.status_code == 404

    @pytest.mark.auth
    async def test_valid_user(
        self,
        client: AsyncClient,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        response = await client.patch(
            f"/v1/organizations/{organization.id}", json={"name": "Updated"}
        )

        assert response.status_code == 200

        json = response.json()
        assert json["name"] == "Updated"

    @pytest.mark.auth
    async def test_negative_revenue_validation(
        self,
        client: AsyncClient,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        # Test negative future_annual_revenue
        response = await client.patch(
            f"/v1/organizations/{organization.id}",
            json={
                "details": {
                    "about": "Test company",
                    "product_description": "SaaS product",
                    "intended_use": "API integration",
                    "customer_acquisition": ["website"],
                    "future_annual_revenue": -1000,
                    "switching": False,
                    "previous_annual_revenue": 25000,
                }
            },
        )

        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("future_annual_revenue" in str(error) for error in error_detail)

    @pytest.mark.auth
    async def test_negative_previous_revenue_validation(
        self,
        client: AsyncClient,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        # Test negative previous_annual_revenue
        response = await client.patch(
            f"/v1/organizations/{organization.id}",
            json={
                "details": {
                    "about": "Test company",
                    "product_description": "SaaS product",
                    "intended_use": "API integration",
                    "customer_acquisition": ["website"],
                    "future_annual_revenue": 50000,
                    "switching": False,
                    "previous_annual_revenue": -5000,
                }
            },
        )

        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("previous_annual_revenue" in str(error) for error in error_detail)

    @pytest.mark.auth
    async def test_enable_seat_based_pricing_with_member_model(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        organization.feature_settings = {
            "member_model_enabled": True,
            "seat_based_pricing_enabled": False,
        }
        await save_fixture(organization)

        response = await client.patch(
            f"/v1/organizations/{organization.id}",
            json={
                "feature_settings": {
                    "seat_based_pricing_enabled": True,
                },
            },
        )

        assert response.status_code == 200
        assert response.json()["feature_settings"]["seat_based_pricing_enabled"] is True

    @pytest.mark.auth
    async def test_enable_seat_based_pricing_without_member_model(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        organization.feature_settings = {
            "member_model_enabled": False,
            "seat_based_pricing_enabled": False,
        }
        await save_fixture(organization)

        response = await client.patch(
            f"/v1/organizations/{organization.id}",
            json={
                "feature_settings": {
                    "seat_based_pricing_enabled": True,
                },
            },
        )

        assert response.status_code == 422

    @pytest.mark.auth
    async def test_disable_seat_based_pricing_when_enabled(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        organization.feature_settings = {
            "member_model_enabled": True,
            "seat_based_pricing_enabled": True,
        }
        await save_fixture(organization)

        response = await client.patch(
            f"/v1/organizations/{organization.id}",
            json={
                "feature_settings": {
                    "seat_based_pricing_enabled": False,
                },
            },
        )

        assert response.status_code == 422


@pytest.mark.asyncio
class TestInviteOrganization:
    @pytest.mark.auth
    async def test_not_existing(self, client: AsyncClient) -> None:
        response = await client.patch(f"/v1/organizations/{uuid.uuid4()}", json={})

        assert response.status_code == 404

    @pytest.mark.auth
    async def test_inviter_not_part_of_org(
        self,
        client: AsyncClient,
        session: AsyncSession,
        organization: Organization,
        # user_organization: UserOrganization,
    ) -> None:
        members_before = await user_organization_service.list_by_org(
            session, organization.id
        )
        response = await client.post(
            f"/v1/organizations/{organization.id}/members/invite",
            json={"email": "test@polar.sh"},
        )
        assert response.status_code == 404

        members_after = await user_organization_service.list_by_org(
            session, organization.id
        )

        assert set(members_after) == set(members_before)

    @pytest.mark.auth
    @pytest.mark.keep_session_state
    async def test_inviter_part_of_org(
        self,
        client: AsyncClient,
        session: AsyncSession,
        organization: Organization,
        user_organization: UserOrganization,  # Makes this user part of the organization
    ) -> None:
        email_to_invite = "test@polar.sh"

        members_before = await user_organization_service.list_by_org(
            session, organization.id
        )
        response = await client.post(
            f"/v1/organizations/{organization.id}/members/invite",
            json={"email": email_to_invite},
        )
        assert response.status_code == 201
        json = response.json()
        assert json["email"] == email_to_invite

        members_after = await user_organization_service.list_by_org(
            session, organization.id
        )

        new_members = set(members_after) - set(members_before)
        assert len(new_members) == 1
        assert list(new_members)[0].user.email == email_to_invite

    @pytest.mark.auth
    @pytest.mark.keep_session_state
    async def test_already_invited(
        self,
        client: AsyncClient,
        session: AsyncSession,
        organization: Organization,
        user_organization: UserOrganization,
        user_organization_second: UserOrganization,  # second user part of this org
    ) -> None:
        email_already_in_org = user_organization_second.user.email

        members_before = await user_organization_service.list_by_org(
            session, organization.id
        )
        assert len(members_before) == 2

        response = await client.post(
            f"/v1/organizations/{organization.id}/members/invite",
            json={"email": email_already_in_org},
        )
        assert response.status_code == 200
        json = response.json()
        assert json["email"] == email_already_in_org

        members_after = await user_organization_service.list_by_org(
            session, organization.id
        )

        assert set(members_after) == set(members_before)
        assert len(members_after) == 2


@pytest.mark.asyncio
@pytest.mark.auth
async def test_list_members(
    session: AsyncSession,
    organization: Organization,
    user_organization: UserOrganization,  # makes User a member of Organization
    user_organization_second: UserOrganization,  # adds another member
    client: AsyncClient,
) -> None:
    response = await client.get(f"/v1/organizations/{organization.id}/members")

    assert response.status_code == 200

    json = response.json()
    assert len(json["items"]) == 2


@pytest.mark.asyncio
@pytest.mark.auth
async def test_list_members_not_member(
    session: AsyncSession,
    organization: Organization,
    # user_organization: UserOrganization,  # makes User a member of Organization
    user_organization_second: UserOrganization,  # adds another member
    client: AsyncClient,
) -> None:
    response = await client.get(f"/v1/organizations/{organization.id}/members")

    assert response.status_code == 404


@pytest.mark.asyncio
class TestGetPaymentStatus:
    async def test_anonymous(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.get(
            f"/v1/organizations/{organization.id}/payment-status"
        )
        assert response.status_code == 401

    async def test_anonymous_with_account_verification_only(
        self,
        client: AsyncClient,
        organization: Organization,
        save_fixture: SaveFixture,
    ) -> None:
        # Make this a new organization (not grandfathered)
        organization.created_at = datetime(2025, 8, 4, 12, 0, tzinfo=UTC)
        # Test fixture defaults status to ACTIVE so the public-visibility
        # gate doesn't 404 marketplace tests. These payment-status tests
        # exercise the pre-activation flow, so explicitly reset to CREATED.
        from polar.models.organization import OrganizationStatus
        organization.status = OrganizationStatus.CREATED
        await save_fixture(organization)

        response = await client.get(
            f"/v1/organizations/{organization.id}/payment-status?account_verification_only=true"
        )
        assert response.status_code == 200

        json = response.json()
        # When account_verification_only=true, we should get minimal response
        # focusing only on account setup (no product/integration steps)
        assert "payment_ready" in json
        assert "steps" in json
        assert "organization_status" in json

        # With account_verification_only=true, only account setup step should be present
        step_ids = [step["id"] for step in json["steps"]]
        assert "setup_account" in step_ids
        assert len(step_ids) == 1
        assert json["payment_ready"] is False

    @pytest.mark.auth
    async def test_not_member(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.get(
            f"/v1/organizations/{organization.id}/payment-status"
        )
        assert response.status_code == 404

    @pytest.mark.auth
    async def test_valid_no_steps_complete(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        # Make this a new organization (not grandfathered)
        organization.created_at = datetime(2025, 8, 4, 12, 0, tzinfo=UTC)
        # Test fixture defaults status to ACTIVE so the public-visibility
        # gate doesn't 404 marketplace tests. These payment-status tests
        # exercise the pre-activation flow, so explicitly reset to CREATED.
        from polar.models.organization import OrganizationStatus
        organization.status = OrganizationStatus.CREATED
        await save_fixture(organization)

        response = await client.get(
            f"/v1/organizations/{organization.id}/payment-status"
        )
        assert response.status_code == 200

        json = response.json()
        assert json["payment_ready"] is False
        assert len(json["steps"]) == 3

        # All steps should be incomplete
        for step in json["steps"]:
            assert step["completed"] is False

        # Check specific steps exist
        step_ids = [step["id"] for step in json["steps"]]
        assert "create_product" in step_ids
        assert "integrate_checkout" in step_ids
        assert "setup_account" in step_ids

    @pytest.mark.auth
    async def test_valid_with_product(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        product: Product,
    ) -> None:
        # Make this a new organization (not grandfathered)
        organization.created_at = datetime(2025, 8, 4, 12, 0, tzinfo=UTC)
        # Test fixture defaults status to ACTIVE so the public-visibility
        # gate doesn't 404 marketplace tests. These payment-status tests
        # exercise the pre-activation flow, so explicitly reset to CREATED.
        from polar.models.organization import OrganizationStatus
        organization.status = OrganizationStatus.CREATED
        await save_fixture(organization)

        response = await client.get(
            f"/v1/organizations/{organization.id}/payment-status"
        )
        assert response.status_code == 200

        json = response.json()
        assert json["payment_ready"] is False

        # Product step should be complete
        product_step = next(s for s in json["steps"] if s["id"] == "create_product")
        assert product_step["completed"] is True

    @pytest.mark.auth
    async def test_valid_with_api_key(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        mocker: MockerFixture,
    ) -> None:
        # Make this a new organization (not grandfathered)
        organization.created_at = datetime(2025, 8, 4, 12, 0, tzinfo=UTC)
        # Test fixture defaults status to ACTIVE so the public-visibility
        # gate doesn't 404 marketplace tests. These payment-status tests
        # exercise the pre-activation flow, so explicitly reset to CREATED.
        from polar.models.organization import OrganizationStatus
        organization.status = OrganizationStatus.CREATED
        await save_fixture(organization)

        # Mock the API key count
        mocker.patch(
            "polar.organization_access_token.repository.OrganizationAccessTokenRepository.count_by_organization_id",
            return_value=1,  # Has 1 API key
        )

        response = await client.get(
            f"/v1/organizations/{organization.id}/payment-status"
        )
        assert response.status_code == 200

        json = response.json()
        assert json["payment_ready"] is False

        # API integration step should be complete
        api_step = next(s for s in json["steps"] if s["id"] == "integrate_checkout")
        assert api_step["completed"] is True

    @pytest.mark.auth
    async def test_valid_grandfathered_organization(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        # Make organization grandfathered
        organization.created_at = datetime(2025, 8, 4, 8, 0, tzinfo=UTC)
        await save_fixture(organization)

        response = await client.get(
            f"/v1/organizations/{organization.id}/payment-status"
        )
        assert response.status_code == 200

        json = response.json()
        # Should be payment ready even without completing steps
        assert json["payment_ready"] is True

    @pytest.mark.auth
    async def test_valid_all_steps_complete(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        product: Product,
        mocker: MockerFixture,
        user: User,
    ) -> None:
        # Set up as new organization
        organization.created_at = datetime(2025, 8, 4, 12, 0, tzinfo=UTC)
        organization.status = OrganizationStatus.ACTIVE
        organization.details_submitted_at = datetime.now(UTC)
        organization.details = {"about": "Test"}  # type: ignore

        # Set up user verification
        user.identity_verification_status = IdentityVerificationStatus.verified
        await save_fixture(user)

        # Set up account (only checking is_details_submitted now)
        account = Account(
            account_type=AccountType.stripe,
            admin_id=user.id,
            country="US",
            currency="USD",
            is_details_submitted=True,
            is_charges_enabled=False,  # Can be false
            is_payouts_enabled=False,  # Can be false
            stripe_id="STRIPE_ACCOUNT_ID",
        )
        await save_fixture(account)

        organization.account = account
        organization.account_id = account.id
        await save_fixture(organization)

        # Mock the API key count
        mocker.patch(
            "polar.organization_access_token.repository.OrganizationAccessTokenRepository.count_by_organization_id",
            return_value=1,  # Has 1 API key
        )

        response = await client.get(
            f"/v1/organizations/{organization.id}/payment-status"
        )
        assert response.status_code == 200

        json = response.json()
        assert json["payment_ready"] is True

        # All steps should be complete
        for step in json["steps"]:
            assert step["completed"] is True


@pytest.mark.asyncio
class TestGetAccount:
    async def test_anonymous(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.get(f"/v1/organizations/{organization.id}/account")

        assert response.status_code == 401

    @pytest.mark.auth
    async def test_not_member(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.get(f"/v1/organizations/{organization.id}/account")

        assert response.status_code == 404

    @pytest.mark.auth
    async def test_organization_not_found(self, client: AsyncClient) -> None:
        response = await client.get(f"/v1/organizations/{uuid.uuid4()}/account")

        assert response.status_code == 404

    @pytest.mark.auth
    async def test_no_account_set(
        self,
        client: AsyncClient,
        organization: Organization,
        user_organization: UserOrganization,
        save_fixture: SaveFixture,
    ) -> None:
        organization.account_id = None
        await save_fixture(organization)

        response = await client.get(f"/v1/organizations/{organization.id}/account")

        assert response.status_code == 404

    @pytest.mark.auth
    async def test_not_account_admin(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        user: User,
    ) -> None:
        # Create an account with a different admin (not the current user)
        other_user = User(
            email="other@example.com",
        )
        await save_fixture(other_user)

        account = Account(
            account_type=AccountType.stripe,
            admin_id=other_user.id,  # Different admin than the current user
            country="US",
            currency="USD",
            is_details_submitted=True,
            is_charges_enabled=True,
            is_payouts_enabled=True,
        )
        await save_fixture(account)

        # Link account to organization
        organization.account_id = account.id
        await save_fixture(organization)

        response = await client.get(f"/v1/organizations/{organization.id}/account")

        assert response.status_code == 403
        json = response.json()
        assert json["detail"] == "You are not the admin of this account"

    @pytest.mark.auth
    async def test_valid_account_admin(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        user: User,
    ) -> None:
        # Create an account with the current user as admin
        account = Account(
            account_type=AccountType.stripe,
            admin_id=user.id,  # Current user is the admin
            country="US",
            currency="USD",
            is_details_submitted=True,
            is_charges_enabled=True,
            is_payouts_enabled=True,
        )
        await save_fixture(account)

        # Link account to organization
        organization.account_id = account.id
        await save_fixture(organization)

        response = await client.get(f"/v1/organizations/{organization.id}/account")

        assert response.status_code == 200
        json = response.json()
        assert json["id"] == str(account.id)
        assert json["account_type"] == "stripe"
        assert json["country"] == "US"
        assert json["is_details_submitted"]
        assert json["is_charges_enabled"]
        assert json["is_payouts_enabled"]


@pytest.mark.asyncio
class TestDeleteOrganization:
    async def test_anonymous(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.delete(f"/v1/organizations/{organization.id}")
        assert response.status_code == 401

    @pytest.mark.auth
    async def test_not_member(
        self, client: AsyncClient, organization: Organization
    ) -> None:
        response = await client.delete(f"/v1/organizations/{organization.id}")
        assert response.status_code == 404

    @pytest.mark.auth
    async def test_not_existing(self, client: AsyncClient) -> None:
        response = await client.delete(f"/v1/organizations/{uuid.uuid4()}")
        assert response.status_code == 404

    @pytest.mark.auth
    async def test_valid_no_activity(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        mocker: MockerFixture,
    ) -> None:
        # Mock the enqueue_job to prevent actual task execution
        mock_enqueue = mocker.patch("polar.organization.service.enqueue_job")

        response = await client.delete(f"/v1/organizations/{organization.id}")

        assert response.status_code == 200
        json = response.json()
        assert json["deleted"] is True
        assert json["requires_support"] is False
        assert json["blocked_reasons"] == []

        # Ensure no background task was enqueued (immediate deletion)
        mock_enqueue.assert_not_called()

    @pytest.mark.auth
    async def test_blocked_has_orders(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        product: Product,
        mocker: MockerFixture,
    ) -> None:
        # Create a customer and order for this organization
        customer = await create_customer(
            save_fixture,
            organization=organization,
            email="customer@example.com",
            stripe_customer_id="STRIPE_CUSTOMER_ID",
        )
        await create_order(save_fixture, customer=customer, product=product)

        # Mock the enqueue_job to prevent actual task execution
        mock_enqueue = mocker.patch("polar.organization.service.enqueue_job")

        response = await client.delete(f"/v1/organizations/{organization.id}")

        assert response.status_code == 200
        json = response.json()
        assert json["deleted"] is False
        assert json["requires_support"] is True
        assert "has_orders" in json["blocked_reasons"]

        # Ensure background task was enqueued for support ticket
        mock_enqueue.assert_called_once()

    @pytest.mark.auth
    async def test_blocked_has_active_subscriptions(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        product: Product,
        mocker: MockerFixture,
    ) -> None:
        # Create a customer and active subscription for this organization
        customer = await create_customer(
            save_fixture,
            organization=organization,
            email="customer@example.com",
            stripe_customer_id="STRIPE_CUSTOMER_ID",
        )
        await create_subscription(
            save_fixture,
            product=product,
            customer=customer,
            status=SubscriptionStatus.active,
        )

        # Mock the enqueue_job to prevent actual task execution
        mock_enqueue = mocker.patch("polar.organization.service.enqueue_job")

        response = await client.delete(f"/v1/organizations/{organization.id}")

        assert response.status_code == 200
        json = response.json()
        assert json["deleted"] is False
        assert json["requires_support"] is True
        assert "has_active_subscriptions" in json["blocked_reasons"]

        # Ensure background task was enqueued for support ticket
        mock_enqueue.assert_called_once()

    @pytest.mark.auth
    async def test_valid_with_account_deletion(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        user: User,
        mocker: MockerFixture,
    ) -> None:
        # Create an account for the organization
        account = Account(
            account_type=AccountType.stripe,
            admin_id=user.id,
            country="US",
            currency="USD",
            is_details_submitted=True,
            is_charges_enabled=True,
            is_payouts_enabled=True,
            stripe_id="acct_test123",
        )
        await save_fixture(account)
        organization.account_id = account.id
        await save_fixture(organization)

        # Mock Stripe account deletion to succeed (returns None on success)
        mock_stripe_delete = mocker.patch(
            "polar.account.service.account.delete_stripe_account",
            return_value=None,
        )
        mock_enqueue = mocker.patch("polar.organization.service.enqueue_job")

        response = await client.delete(f"/v1/organizations/{organization.id}")

        assert response.status_code == 200
        json = response.json()
        assert json["deleted"] is True
        assert json["requires_support"] is False
        assert json["blocked_reasons"] == []

        # Stripe account should have been deleted
        mock_stripe_delete.assert_called_once()
        # No background task should be enqueued (immediate deletion)
        mock_enqueue.assert_not_called()

    @pytest.mark.auth
    async def test_stripe_account_deletion_failure(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        user: User,
        mocker: MockerFixture,
    ) -> None:
        # Create an account for the organization
        account = Account(
            account_type=AccountType.stripe,
            admin_id=user.id,
            country="US",
            currency="USD",
            is_details_submitted=True,
            is_charges_enabled=True,
            is_payouts_enabled=True,
            stripe_id="acct_test123",
        )
        await save_fixture(account)
        organization.account_id = account.id
        await save_fixture(organization)

        # Mock Stripe account deletion to fail with an exception
        from polar.account.service import AccountServiceError

        mock_stripe_delete = mocker.patch(
            "polar.account.service.account.delete_stripe_account",
            side_effect=AccountServiceError("Stripe account deletion failed"),
        )
        mock_enqueue = mocker.patch("polar.organization.service.enqueue_job")

        response = await client.delete(f"/v1/organizations/{organization.id}")

        assert response.status_code == 200
        json = response.json()
        assert json["deleted"] is False
        assert json["requires_support"] is True
        assert "stripe_account_deletion_failed" in json["blocked_reasons"]

        # Stripe account deletion should have been attempted
        mock_stripe_delete.assert_called_once()
        # Background task should be enqueued for support ticket
        mock_enqueue.assert_called_once()

    @pytest.mark.auth
    async def test_not_admin_with_account(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
        user: User,
        mocker: MockerFixture,
    ) -> None:
        # Create an account with a different admin (not the current user)
        other_user = User(
            email="other@example.com",
        )
        await save_fixture(other_user)

        account = Account(
            account_type=AccountType.stripe,
            admin_id=other_user.id,  # Different admin than the current user
            country="US",
            currency="USD",
            is_details_submitted=True,
            is_charges_enabled=True,
            is_payouts_enabled=True,
            stripe_id="acct_test123",
        )
        await save_fixture(account)
        organization.account_id = account.id
        await save_fixture(organization)

        response = await client.delete(f"/v1/organizations/{organization.id}")

        assert response.status_code == 403
        json = response.json()
        assert (
            json["detail"]
            == "Only the account admin can delete an organization with an account"
        )


# Creator Endpoints Tests


@pytest.mark.asyncio
class TestListCreators:
    async def test_public_access_without_authentication(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that creators endpoint is accessible without authentication."""
        response = await client.get("/v1/creators")

        assert response.status_code == 200
        json = response.json()
        assert isinstance(json, list)

    async def test_excludes_organizations_without_products(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that only organizations with products are returned."""
        # Create organization without products
        org_without_products = Organization(
            name="No Products Org",
            slug="no-products-org",
        )
        await save_fixture(org_without_products)

        response = await client.get("/v1/creators")

        assert response.status_code == 200
        json = response.json()

        # Should only include organization with products
        assert len(json) == 1
        assert json[0]["id"] == str(organization.id)
        assert json[0]["product_count"] == 1

        # Verify org without products is not in results
        org_ids = [creator["id"] for creator in json]
        assert str(org_without_products.id) not in org_ids

    async def test_search_filters_by_name(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that search parameter filters creators by name."""
        # Create another organization with products
        from tests.fixtures.random_objects import create_product

        org2 = Organization(
            name="Another Creator",
            slug="another-creator",
        )
        await save_fixture(org2)
        await create_product(save_fixture, organization=org2)

        # Search for specific organization
        response = await client.get(
            "/v1/creators", params={"search": organization.name}
        )

        assert response.status_code == 200
        json = response.json()

        # Should only return matching organization
        assert len(json) >= 1
        matching_ids = [creator["id"] for creator in json]
        assert str(organization.id) in matching_ids

    async def test_returns_required_fields(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that response includes all required fields."""
        response = await client.get("/v1/creators")

        assert response.status_code == 200
        json = response.json()

        assert len(json) > 0
        creator = json[0]

        # Verify all required fields are present
        assert "id" in creator
        assert "name" in creator
        assert "slug" in creator
        assert "avatar_url" in creator
        assert "product_count" in creator

        # Verify field types
        assert isinstance(creator["id"], str)
        assert isinstance(creator["name"], str)
        assert isinstance(creator["slug"], str)
        assert isinstance(creator["product_count"], int)
        assert creator["product_count"] > 0


@pytest.mark.asyncio
class TestGetCreator:
    async def test_public_access_without_authentication(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that creator storefront endpoint is accessible without authentication."""
        response = await client.get(f"/v1/creators/{organization.slug}")

        assert response.status_code == 200
        json = response.json()
        assert json["id"] == str(organization.id)

    async def test_creator_not_found_returns_404(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that non-existent creator slug returns 404."""
        response = await client.get("/v1/creators/nonexistent-slug-12345")

        assert response.status_code == 404

    async def test_returns_complete_profile(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that storefront returns complete creator profile."""
        # Update organization with profile data
        organization.bio = "Test creator bio"
        organization.social_links = {
            "twitter": "https://twitter.com/testcreator",
            "instagram": "https://instagram.com/testcreator",
            "website": "https://example.com",
        }
        await save_fixture(organization)

        response = await client.get(f"/v1/creators/{organization.slug}")

        assert response.status_code == 200
        json = response.json()

        # Verify all profile fields
        assert json["id"] == str(organization.id)
        assert json["name"] == organization.name
        assert json["slug"] == organization.slug
        assert json["bio"] == "Test creator bio"
        assert json["social_links"]["twitter"] == "https://twitter.com/testcreator"
        assert json["social_links"]["instagram"] == "https://instagram.com/testcreator"
        assert json["social_links"]["website"] == "https://example.com"
        assert "products" in json
        assert len(json["products"]) == 1

    async def test_handles_null_profile_fields(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that null bio and social_links are handled correctly."""
        # Ensure organization has null profile fields
        organization.bio = None
        organization.social_links = None
        await save_fixture(organization)

        response = await client.get(f"/v1/creators/{organization.slug}")

        assert response.status_code == 200
        json = response.json()

        assert json["bio"] is None
        assert json["social_links"] is None


@pytest.mark.asyncio
class TestUpdateOrganizationProfile:
    @pytest.mark.auth
    async def test_profile_update_with_invalid_urls_returns_422(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        """Test that invalid social link URLs return 422 validation error."""
        response = await client.patch(
            f"/v1/organizations/{organization.id}/profile",
            json={
                "social_links": {
                    "twitter": "not-a-valid-url",
                    "instagram": "also-invalid",
                }
            },
        )

        assert response.status_code == 422
        json = response.json()
        assert "detail" in json

    @pytest.mark.auth
    async def test_profile_update_without_permission_returns_403(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that updating profile without permission returns 403."""
        # User is not a member of the organization (no user_organization fixture)
        response = await client.patch(
            f"/v1/organizations/{organization.id}/profile",
            json={"bio": "Unauthorized update attempt"},
        )

        assert response.status_code == 404  # Returns 404 when not a member

    @pytest.mark.auth
    async def test_valid_profile_update(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        """Test successful profile update with valid data."""
        response = await client.patch(
            f"/v1/organizations/{organization.id}/profile",
            json={
                "bio": "Updated bio text",
                "social_links": {
                    "twitter": "https://twitter.com/updated",
                    "website": "https://updated.com",
                },
            },
        )

        assert response.status_code == 200
        json = response.json()

        assert json["bio"] == "Updated bio text"
        assert json["social_links"]["twitter"] == "https://twitter.com/updated"
        assert json["social_links"]["website"] == "https://updated.com"

    @pytest.mark.auth
    async def test_bio_max_length_validation(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        """Test that bio exceeding max length returns 422."""
        long_bio = "x" * 501  # Exceeds 500 character limit

        response = await client.patch(
            f"/v1/organizations/{organization.id}/profile",
            json={"bio": long_bio},
        )

        assert response.status_code == 422
        json = response.json()
        assert "detail" in json

    @pytest.mark.auth
    async def test_partial_social_links_update(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        """Test updating only some social links."""
        response = await client.patch(
            f"/v1/organizations/{organization.id}/profile",
            json={
                "social_links": {
                    "twitter": "https://twitter.com/partial",
                }
            },
        )

        assert response.status_code == 200
        json = response.json()

        assert json["social_links"]["twitter"] == "https://twitter.com/partial"
        # Other social links should not be present if not provided
        assert (
            "instagram" not in json["social_links"]
            or json["social_links"]["instagram"] is None
        )

    @pytest.mark.auth
    async def test_clear_profile_fields(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        user_organization: UserOrganization,
    ) -> None:
        """Test clearing bio and social links by setting to null."""
        # First set some values
        organization.bio = "Initial bio"
        organization.social_links = {"twitter": "https://twitter.com/test"}
        await save_fixture(organization)

        # Clear the values
        response = await client.patch(
            f"/v1/organizations/{organization.id}/profile",
            json={"bio": None, "social_links": None},
        )

        assert response.status_code == 200
        json = response.json()

        assert json["bio"] is None
        assert json["social_links"] is None or json["social_links"] == {}
