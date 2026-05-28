from src.core.vault import encrypt_token, decrypt_token

def test_token_encryption_vault():
    token = "meta_marketing_api_access_token_super_secret_payload_123"
    encrypted = encrypt_token(token)
    assert encrypted != token
    assert len(encrypted) > 0
    
    decrypted = decrypt_token(encrypted)
    assert decrypted == token
    print("✅ Vault encryption/decryption round-trip test passed successfully!")

if __name__ == "__main__":
    test_token_encryption_vault()
