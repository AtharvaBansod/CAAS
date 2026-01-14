# Auth & Security - E2E Encryption Key Management

> **Parent Roadmap**: [Auth, Authorization & Security](../../roadmaps/3_AuthAutorizeSecurity.md)

---

## Overview

End-to-end encryption key management system for secure message and file encryption across the CAAS platform.

---

## Tasks

### 1. Key Hierarchy Design

#### 1.1 Master Key (Root of Trust)
```
┌─────────────────────────────────────────────┐
│              Master Key (HSM)               │
│  - Never leaves HSM                         │
│  - Used to encrypt tenant keys              │
│  - Rotated annually                         │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│           Tenant Master Key                  │
│  - Encrypted by Master Key                  │
│  - Used to encrypt user keys                │
│  - Rotated quarterly or on security event   │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              User Key Pair                   │
│  - Identity Key (long-term)                 │
│  - Pre-Keys (one-time)                      │
│  - Session Keys (ephemeral)                 │
└─────────────────────────────────────────────┘
```
- [ ] HSM integration (AWS CloudHSM / Azure Key Vault)
- [ ] Master key generation
- [ ] Key encryption key (KEK) hierarchy
- [ ] Key storage design

#### 1.2 User Key Pairs
```typescript
interface UserKeyBundle {
  identity_key: {
    public: string;           // Base64 encoded
    private_encrypted: string; // Encrypted by user password
    created_at: Date;
  };
  signed_pre_key: {
    id: number;
    public: string;
    private_encrypted: string;
    signature: string;        // Signed by identity key
    created_at: Date;
  };
  one_time_pre_keys: [{
    id: number;
    public: string;
    private_encrypted: string;
  }];
}
```
- [ ] Ed25519 identity key generation
- [ ] X25519 pre-key generation
- [ ] Key bundle storage
- [ ] Key bundle upload API

### 2. Key Generation

#### 2.1 Client-Side Key Generation
```typescript
// Generate user key bundle (client-side)
async function generateKeyBundle(userPassword: string): Promise<UserKeyBundle> {
  // Generate identity key pair
  const identityKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  
  // Derive encryption key from password
  const passwordKey = await deriveKeyFromPassword(userPassword);
  
  // Encrypt private key
  const encryptedPrivateKey = await encryptPrivateKey(
    identityKeyPair.privateKey,
    passwordKey
  );
  
  // Generate signed pre-key
  const signedPreKey = await generateSignedPreKey(identityKeyPair);
  
  // Generate one-time pre-keys
  const oneTimePreKeys = await generateOneTimePreKeys(100);
  
  return {
    identity_key: {
      public: await exportPublicKey(identityKeyPair.publicKey),
      private_encrypted: encryptedPrivateKey,
      created_at: new Date()
    },
    signed_pre_key: signedPreKey,
    one_time_pre_keys: oneTimePreKeys
  };
}
```
- [ ] Implement key pair generation
- [ ] Password-based key derivation (PBKDF2/Argon2)
- [ ] Private key encryption
- [ ] Secure random number generation

#### 2.2 Pre-Key Management
- [ ] One-time pre-key generation (batch of 100)
- [ ] Pre-key replenishment when low
- [ ] Signed pre-key rotation (monthly)
- [ ] Pre-key count monitoring

### 3. Key Exchange Protocol

#### 3.1 X3DH Key Agreement
```typescript
// X3DH key agreement for session establishment
async function performX3DH(
  senderIdentity: KeyPair,
  recipientBundle: PublicKeyBundle
): Promise<SharedSecret> {
  // DH1: sender identity × recipient signed pre-key
  const dh1 = await diffieHellman(
    senderIdentity.privateKey,
    recipientBundle.signedPreKey.public
  );
  
  // DH2: sender ephemeral × recipient identity
  const ephemeralKey = await generateEphemeralKey();
  const dh2 = await diffieHellman(
    ephemeralKey.privateKey,
    recipientBundle.identityKey
  );
  
  // DH3: sender ephemeral × recipient signed pre-key
  const dh3 = await diffieHellman(
    ephemeralKey.privateKey,
    recipientBundle.signedPreKey.public
  );
  
  // DH4: sender ephemeral × recipient one-time pre-key (if available)
  let dh4 = null;
  if (recipientBundle.oneTimePreKey) {
    dh4 = await diffieHellman(
      ephemeralKey.privateKey,
      recipientBundle.oneTimePreKey.public
    );
  }
  
  // Combine all DH outputs
  const sharedSecret = await kdf(concatenate(dh1, dh2, dh3, dh4));
  
  return sharedSecret;
}
```
- [ ] X3DH implementation
- [ ] Ephemeral key generation
- [ ] Key derivation function (HKDF)
- [ ] Session key establishment

#### 3.2 Double Ratchet Algorithm
- [ ] Root key derivation
- [ ] Chain key derivation
- [ ] Message key derivation
- [ ] Ratchet on each message
- [ ] Header encryption

### 4. Key Storage & Distribution

#### 4.1 Server-Side Key Storage
```javascript
// users collection - key bundle
{
  _id: ObjectId,
  user_id: string,
  tenant_id: string,
  key_bundle: {
    identity_key: {
      public: string,
      created_at: Date,
      version: number
    },
    signed_pre_key: {
      id: number,
      public: string,
      signature: string,
      created_at: Date
    },
    one_time_pre_key_count: number
  },
  devices: [{
    device_id: string,
    device_name: string,
    identity_key: string,
    registered_at: Date,
    last_active: Date
  }]
}
```
- [ ] Key bundle storage schema
- [ ] Public key distribution API
- [ ] Key bundle fetch API
- [ ] Device key management

#### 4.2 Client-Side Key Storage
```typescript
// Secure client-side storage
interface SecureKeyStorage {
  // Store encrypted private key
  storePrivateKey(keyId: string, encryptedKey: string): Promise<void>;
  
  // Retrieve and decrypt private key
  getPrivateKey(keyId: string, password: string): Promise<CryptoKey>;
  
  // Store session keys
  storeSessionKey(sessionId: string, key: CryptoKey): Promise<void>;
  
  // Clear all keys
  clearAllKeys(): Promise<void>;
}
```
- [ ] IndexedDB secure storage
- [ ] Session storage for session keys
- [ ] Key export/import
- [ ] Secure deletion

### 5. Key Rotation

#### 5.1 Rotation Triggers
- [ ] Scheduled rotation (monthly)
- [ ] Security event trigger
- [ ] User request
- [ ] Device compromise

#### 5.2 Rotation Process
```
1. Generate new key pair
2. Sign new public key with old identity key
3. Upload to server
4. Notify active sessions
5. Re-encrypt ongoing sessions
6. Archive old key (for message history)
7. Delete old key after grace period
```
- [ ] Key generation with rotation
- [ ] Key chain signing
- [ ] Session re-establishment
- [ ] Historical key access

### 6. Key Recovery

#### 6.1 Recovery Options
- [ ] Backup key encrypted with recovery phrase
- [ ] Multi-device key sync
- [ ] Trusted contact recovery
- [ ] Enterprise key escrow

#### 6.2 Recovery Implementation
```typescript
// Recovery using backup phrase
async function recoverKeys(
  userId: string,
  recoveryPhrase: string
): Promise<UserKeyBundle> {
  // Validate recovery phrase
  const isValid = await validateRecoveryPhrase(userId, recoveryPhrase);
  if (!isValid) throw new Error('Invalid recovery phrase');
  
  // Derive decryption key from phrase
  const recoveryKey = await deriveKeyFromPhrase(recoveryPhrase);
  
  // Fetch encrypted key backup
  const encryptedBackup = await fetchKeyBackup(userId);
  
  // Decrypt and restore
  const keyBundle = await decryptKeyBackup(encryptedBackup, recoveryKey);
  
  return keyBundle;
}
```
- [ ] Recovery phrase generation (BIP-39)
- [ ] Backup encryption
- [ ] Recovery flow UI
- [ ] Post-recovery key rotation

---

## Security Considerations

### Key Security Requirements
- Private keys never leave client device unencrypted
- Server never has access to plaintext private keys
- Perfect forward secrecy via Double Ratchet
- Post-compromise security via key rotation

### Cryptographic Algorithms
| Purpose | Algorithm |
|---------|-----------|
| Identity Keys | Ed25519/P-256 ECDSA |
| Key Agreement | X25519/P-256 ECDH |
| Message Encryption | AES-256-GCM |
| Key Derivation | HKDF-SHA256 |
| Password KDF | Argon2id |

---

## Related Documents

- [Signal Protocol Implementation](../../rnd/signal-protocol-implementation.md)
- [E2E Encryption Flow](../../flowdiagram/e2e-encryption-flow.md)
