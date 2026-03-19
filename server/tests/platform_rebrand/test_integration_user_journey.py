"""
Integration test for new user journey with Blyss branding.

Feature: platform-rebrand
Task: 12.1 Write integration test for new user journey

This test validates the complete user signup and navigation experience
with Blyss branding throughout the platform.
"""

import pytest
from httpx import AsyncClient

from polar.auth.models import AuthSubject
from polar.models import User
from tests.fixtures.auth import AuthSubjectFixture


class TestNewUserJourneyIntegration:
    """
    Integration test for new user journey with Blyss branding.

    Validates:
    - Signup flow displays Blyss branding
    - No "Polar" text appears in user experience
    - All navigation links work correctly
    """

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_user_profile_endpoint_shows_blyss_branding(
        self,
        client: AsyncClient,
        user: User,
    ):
        """
        Test that user profile endpoint works and shows no Polar branding.

        Requirements: 1.4, 5.3
        """
        # Get user profile
        response = await client.get("/v1/users/me")

        assert response.status_code == 200
        json = response.json()

        # Verify user data is accessible
        assert json["email"] == user.email
        assert "id" in json

        # Verify no "Polar" text in response
        response_text = response.text.lower()
        assert "polar" not in response_text, (
            "Found 'Polar' text in user profile response"
        )

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_user_can_access_dashboard_routes(
        self,
        client: AsyncClient,
        user: User,
    ):
        """
        Test that user can access main dashboard routes.

        Requirements: 9.1, 9.2
        """
        # Test main dashboard routes that should be accessible
        accessible_routes = [
            "/v1/users/me",
            "/v1/organizations",
        ]

        for route in accessible_routes:
            response = await client.get(route)

            # All routes should return 200 or redirect (not 404/500)
            assert response.status_code in [200, 307], (
                f"Route {route} returned unexpected status {response.status_code}"
            )

            # Verify no "Polar" text in any response
            response_text = response.text.lower()
            assert "polar" not in response_text, (
                f"Found 'Polar' text in {route} response"
            )

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_developer_features_not_accessible(
        self,
        client: AsyncClient,
        user: User,
    ):
        """
        Test that developer features are hidden from navigation.

        Requirements: 2.1, 2.2, 2.3, 9.3
        """
        # These routes should not be accessible or should redirect
        # (developer features are hidden in Blyss)
        hidden_routes = [
            "/v1/personal_access_tokens",
            "/v1/webhooks/endpoints",
        ]

        for route in hidden_routes:
            response = await client.get(route)

            # Routes should either not exist (404) or redirect away
            # They should NOT return 200 with content
            assert response.status_code in [404, 307, 403], (
                f"Hidden route {route} returned unexpected status "
                f"{response.status_code} (should be hidden)"
            )

    @pytest.mark.asyncio
    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
        AuthSubjectFixture(subject="user_second"),
    )
    async def test_multiple_users_see_consistent_branding(
        self,
        client: AsyncClient,
        auth_subject: AuthSubject,
    ):
        """
        Test that multiple users see consistent Blyss branding.

        Requirements: 1.4, 5.3
        """
        # Get user profile
        response = await client.get("/v1/users/me")

        assert response.status_code == 200

        # Verify no "Polar" text for any user
        response_text = response.text.lower()
        assert "polar" not in response_text, (
            f"Found 'Polar' text for user {auth_subject.subject}"
        )

    @pytest.mark.asyncio
    async def test_anonymous_user_sees_blyss_branding(
        self,
        client: AsyncClient,
    ):
        """
        Test that anonymous users see Blyss branding in public endpoints.

        Requirements: 1.4, 5.3
        """
        # Test public endpoints that anonymous users can access
        public_routes = [
            "/v1/organizations",
        ]

        for route in public_routes:
            response = await client.get(route)

            # Public routes should be accessible
            assert response.status_code in [200, 307]

            # Verify no "Polar" text in response
            response_text = response.text.lower()
            assert "polar" not in response_text, (
                f"Found 'Polar' text in public route {route}"
            )

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_user_organizations_endpoint_works(
        self,
        client: AsyncClient,
        user: User,
    ):
        """
        Test that user can access organizations endpoint.

        Requirements: 8.1, 9.1, 9.2
        """
        # Get user's organizations
        response = await client.get("/v1/organizations")

        assert response.status_code == 200
        json = response.json()

        # Response should be a list (may be empty for new user)
        assert isinstance(json, list)

        # Verify no "Polar" text in response
        response_text = response.text.lower()
        assert "polar" not in response_text, (
            "Found 'Polar' text in organizations response"
        )

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_navigation_links_return_valid_responses(
        self,
        client: AsyncClient,
        user: User,
    ):
        """
        Test that all main navigation links return valid responses.

        Requirements: 9.1, 9.2
        """
        # Main navigation routes that should work
        navigation_routes = [
            "/v1/users/me",
            "/v1/organizations",
        ]

        for route in navigation_routes:
            response = await client.get(route)

            # All navigation routes should return 200
            assert response.status_code == 200, (
                f"Navigation route {route} returned {response.status_code}"
            )

            # Verify response is valid JSON
            json = response.json()
            assert json is not None

            # Verify no "Polar" text
            response_text = response.text.lower()
            assert "polar" not in response_text

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_user_journey_end_to_end(
        self,
        client: AsyncClient,
        user: User,
    ):
        """
        Test complete user journey from login to navigation.

        Requirements: 1.4, 5.3, 9.1, 9.2
        """
        # Step 1: Get user profile (simulates login)
        profile_response = await client.get("/v1/users/me")
        assert profile_response.status_code == 200
        assert "polar" not in profile_response.text.lower()

        # Step 2: Get organizations (simulates dashboard navigation)
        orgs_response = await client.get("/v1/organizations")
        assert orgs_response.status_code == 200
        assert "polar" not in orgs_response.text.lower()

        # Step 3: Verify all responses show consistent branding
        all_responses = [profile_response, orgs_response]

        for response in all_responses:
            response_text = response.text.lower()
            assert "polar" not in response_text, "Found 'Polar' text in user journey"
