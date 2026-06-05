import pytest
from cryptography.fernet import Fernet

from polar.kit.secrets import (
    RuntimeSettingsCryptoError,
    decrypt,
    encrypt,
    hash_value,
)


@pytest.fixture
def fernet_key() -> bytes:
    return Fernet.generate_key()


class TestEncryptDecrypt:
    def test_roundtrip(self, fernet_key: bytes) -> None:
        plaintext = "sk_test_abc123"
        ciphertext = encrypt(plaintext, fernet_key)
        assert decrypt(ciphertext, fernet_key) == plaintext

    def test_decrypt_wrong_key_raises(self, fernet_key: bytes) -> None:
        ciphertext = encrypt("secret", fernet_key)
        wrong_key = Fernet.generate_key()
        with pytest.raises(RuntimeSettingsCryptoError):
            decrypt(ciphertext, wrong_key)

    def test_encrypt_produces_bytes(self, fernet_key: bytes) -> None:
        result = encrypt("hello", fernet_key)
        assert isinstance(result, bytes)


class TestHashValue:
    def test_deterministic(self) -> None:
        assert hash_value("foo") == hash_value("foo")

    def test_length_16(self) -> None:
        assert len(hash_value("anything")) == 16

    def test_different_inputs(self) -> None:
        assert hash_value("a") != hash_value("b")
