"""Property-based tests for M-Pesa number format validation.

This module contains property-based tests using hypothesis to verify
that M-Pesa number validation works correctly according to Kenyan format.
"""

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from pydantic import ValidationError

from polar.integrations.paystack.endpoints import MPesaConfigurationRequest


class TestMPesaNumberValidationProperties:
    """Property-based tests for M-Pesa number format validation."""

    @settings(max_examples=100, deadline=None)
    @given(
        # Valid Kenyan M-Pesa numbers: +254 followed by 7 or 1, then 8 more digits
        mpesa_number=st.one_of(
            st.from_regex(
                r"\+254[7][0-9]{8}", fullmatch=True
            ),  # Mobile numbers starting with 7
            st.from_regex(
                r"\+254[1][0-9]{8}", fullmatch=True
            ),  # Some special numbers starting with 1
        )
    )
    def test_property_21_valid_mpesa_number_format(
        self,
        mpesa_number: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 21: M-Pesa Number Format Validation

        For any M-Pesa number input that matches the Kenyan format (+254XXXXXXXXX
        where X is a digit and starts with 7 or 1), the platform should accept it
        without validation errors.

        **Validates: Requirements 5.2**
        """
        # Property assertion: Valid M-Pesa numbers should be accepted
        try:
            request = MPesaConfigurationRequest(mpesa_number=mpesa_number)

            # Property assertion: The cleaned number should match the input
            assert request.mpesa_number == mpesa_number, (
                f"Valid M-Pesa number {mpesa_number} should be preserved as-is"
            )

            # Property assertion: Number should start with +254
            assert request.mpesa_number.startswith("+254"), (
                "Valid M-Pesa number should start with +254"
            )

            # Property assertion: Number should be exactly 13 characters
            assert len(request.mpesa_number) == 13, (
                "Valid M-Pesa number should be exactly 13 characters long"
            )

            # Property assertion: After +254, should start with 7 or 1
            assert request.mpesa_number[4] in ["7", "1"], (
                "Valid M-Pesa number should start with 7 or 1 after country code"
            )

        except ValidationError:
            pytest.fail(f"Valid M-Pesa number {mpesa_number} was rejected")

    @settings(max_examples=100, deadline=None)
    @given(
        # Invalid M-Pesa numbers - various invalid formats
        invalid_number=st.one_of(
            # Wrong country code
            st.from_regex(r"\+255[0-9]{9}", fullmatch=True),  # Tanzania
            st.from_regex(r"\+256[0-9]{9}", fullmatch=True),  # Uganda
            # Missing country code
            st.from_regex(r"[0-9]{9,10}", fullmatch=True),
            # Wrong length
            st.from_regex(r"\+254[0-9]{7}", fullmatch=True),  # Too short
            st.from_regex(r"\+254[0-9]{10}", fullmatch=True),  # Too long
            # Wrong starting digit after country code
            st.from_regex(r"\+254[0235689][0-9]{8}", fullmatch=True),
            # Contains letters
            st.text(min_size=10, max_size=15).filter(
                lambda x: any(c.isalpha() for c in x)
            ),
            # Empty or very short
            st.text(min_size=0, max_size=5),
            # Special characters
            st.from_regex(r"\+254[0-9]{4}[-\s][0-9]{4}", fullmatch=True),
        )
    )
    def test_property_21_invalid_mpesa_number_format(
        self,
        invalid_number: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 21: M-Pesa Number Format Validation

        For any M-Pesa number input that does not match the Kenyan format, the
        platform should reject it with a validation error.

        **Validates: Requirements 5.2**
        """
        # Property assertion: Invalid M-Pesa numbers should be rejected
        with pytest.raises(ValidationError) as exc_info:
            MPesaConfigurationRequest(mpesa_number=invalid_number)

        # Property assertion: Error should mention format requirements
        error_message = str(exc_info.value)
        assert "format" in error_message.lower() or "kenyan" in error_message.lower(), (
            f"Validation error for {invalid_number} should mention format requirements"
        )

    @settings(max_examples=50, deadline=None)
    @given(
        # Numbers with spaces and dashes that should be cleaned
        base_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        spaces=st.lists(st.integers(min_value=1, max_value=12), min_size=0, max_size=3),
        dashes=st.lists(st.integers(min_value=1, max_value=12), min_size=0, max_size=2),
    )
    def test_property_21_number_cleaning(
        self,
        base_number: str,
        spaces: list[int],
        dashes: list[int],
    ) -> None:
        """
        Feature: paystack-integration, Property 21: M-Pesa Number Format Validation

        For any valid M-Pesa number with spaces or dashes, the platform should
        clean the number and accept it if the underlying format is valid.

        **Validates: Requirements 5.2**
        """
        # Insert spaces and dashes at random positions
        number_with_formatting = list(base_number)

        # Add spaces (but not at the beginning)
        for pos in sorted(set(spaces), reverse=True):
            if 0 < pos < len(number_with_formatting):
                number_with_formatting.insert(pos, " ")

        # Add dashes (but not at the beginning)
        for pos in sorted(set(dashes), reverse=True):
            if 0 < pos < len(number_with_formatting):
                number_with_formatting.insert(pos, "-")

        formatted_number = "".join(number_with_formatting)

        # Property assertion: Formatted number should be cleaned and accepted
        try:
            request = MPesaConfigurationRequest(mpesa_number=formatted_number)

            # Property assertion: Cleaned number should match the original base number
            assert request.mpesa_number == base_number, (
                f"Formatted number {formatted_number} should be cleaned to {base_number}"
            )

        except ValidationError:
            pytest.fail(
                f"Valid M-Pesa number with formatting {formatted_number} "
                f"(base: {base_number}) should be accepted after cleaning"
            )

    def test_property_21_edge_cases(self) -> None:
        """
        Feature: paystack-integration, Property 21: M-Pesa Number Format Validation

        Test specific edge cases for M-Pesa number validation.

        **Validates: Requirements 5.2**
        """
        # Test specific valid numbers
        valid_numbers = [
            "+254712345678",  # Standard mobile
            "+254722345678",  # Safaricom
            "+254733345678",  # Airtel
            "+254700000000",  # Edge case with zeros
            "+254799999999",  # Edge case with nines
            "+254101234567",  # Special number starting with 1
        ]

        for number in valid_numbers:
            try:
                request = MPesaConfigurationRequest(mpesa_number=number)
                assert request.mpesa_number == number
            except ValidationError:
                pytest.fail(f"Valid M-Pesa number {number} should be accepted")

        # Test specific invalid numbers
        invalid_numbers = [
            "+254812345678",  # Starts with 8 (invalid)
            "+254012345678",  # Starts with 0 (invalid)
            "+25471234567",  # Too short
            "+2547123456789",  # Too long
            "254712345678",  # Missing +
            "+254 712 345 678",  # With spaces (should be cleaned, but let's test raw)
            "+254-712-345-678",  # With dashes (should be cleaned, but let's test raw)
            "",  # Empty
            "+254",  # Just country code
            "invalid",  # Not a number
        ]

        for number in invalid_numbers:
            with pytest.raises(ValidationError):
                MPesaConfigurationRequest(mpesa_number=number)
