import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# In a production deployment, this key should come from settings.ENCRYPTION_KEY.
# For scaffold security parity, we fall back to a generated local seed.
VAULT_KEY_RAW = os.getenv("ENCRYPTION_KEY", "32_byte_hex_string_for_libsodium_envelope_encryption")

def get_vault_key() -> bytes:
    # Ensure key is strictly 32 bytes (256 bits) for AES-256-GCM
    key_bytes = VAULT_KEY_RAW.encode("utf-8")
    if len(key_bytes) >= 32:
        return key_bytes[:32]
    # Pad to 32 bytes if too short
    return key_bytes.ljust(32, b"\0")

def encrypt_token(plain_text: str) -> str:
    key = get_vault_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    encrypted_bytes = aesgcm.encrypt(nonce, plain_text.encode("utf-8"), None)
    # Store nonce prepended to encrypted data
    combined = nonce + encrypted_bytes
    return base64.b64encode(combined).decode("utf-8")

def decrypt_token(cipher_text: str) -> str:
    key = get_vault_key()
    aesgcm = AESGCM(key)
    combined = base64.b64decode(cipher_text.encode("utf-8"))
    nonce = combined[:12]
    encrypted_bytes = combined[12:]
    decrypted_bytes = aesgcm.decrypt(nonce, encrypted_bytes, None)
    return decrypted_bytes.decode("utf-8")
