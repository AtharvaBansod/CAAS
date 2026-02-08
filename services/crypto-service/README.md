# Crypto Service

End-to-end encryption service implementing Signal Protocol for secure messaging.

## Features

### Key Management (ENCRYPT-001 to ENCRYPT-004)
- **Key Generation**: Ed25519/X25519 key pairs, pre-keys, signed pre-keys
- **Key Storage**: Encrypted at rest with AES-256-GCM, master key hierarchy
- **Key Distribution**: Pre-key bundles, Signal Protocol key exchange
- **Key Rotation**: Automated and manual rotation, re-encryption jobs

### E2E Encryption (ENCRYPT-005 to ENCRYPT-008)
- **Signal Protocol**: Double Ratchet, X3DH key agreement ✅
- **Message Encryption**: Client-side and server-assisted modes ✅
- **Group Encryption**: Sender Keys protocol ✅
- **Safety Numbers**: Verification and key change detection ✅

## Architecture

```
crypto-service/
├── keys/              # Key generation and encoding
├── storage/           # Secure key storage and vault
├── distribution/      # Key distribution server
├── rotation/          # Key rotation and revocation
├── e2e/              # E2E encryption
│   ├── signal/       # Signal Protocol implementation
│   └── groups/       # Group encryption (Sender Keys)
└── verification/     # Safety numbers and verification
```

## Key Hierarchy

```
Root Key (from env/HSM)
  └── Tenant Key (derived)
      └── User Key (derived)
          └── Encrypted Keys (stored)
```

## Environment Variables

See `.env.example` for configuration options.

## Usage

```typescript
import { keyGenerator, keyVault, keyServer } from '@platform/crypto-service';

// Generate identity key pair
const identityKey = await keyGenerator.generateIdentityKeyPair();

// Store key securely
const keyId = await keyVault.storeKey({
  user_id: 'user123',
  tenant_id: 'tenant456',
  key_type: 'identity',
  key_material: identityKey.privateKey,
});

// Upload to key server
await keyServer.uploadIdentityKey({
  user_id: 'user123',
  tenant_id: 'tenant456',
  device_id: 1,
  registration_id: identityKey.registrationId,
  public_key: identityKey.publicKey,
});

// Get pre-key bundle for recipient
const bundle = await keyServer.getPreKeyBundle('recipient123', 1);
```

## Security Features

- **Encryption at Rest**: All keys encrypted with AES-256-GCM
- **Master Key Hierarchy**: Root → Tenant → User key derivation
- **Access Control**: Users can only access their own keys
- **Rate Limiting**: Prevents key exhaustion attacks
- **Audit Logging**: All key operations logged
- **Key Rotation**: Automated rotation schedules
- **HSM Support**: Interface for hardware security modules

## Key Rotation

- **Signed Pre-Keys**: Rotate weekly (configurable)
- **Session Keys**: Rotate per-session or daily
- **Master Keys**: Manual rotation only (critical operation)

## Docker

```bash
# Build
docker build -t crypto-service .

# Run
docker run -p 3003:3003 --env-file .env crypto-service
```

## Status

- ✅ ENCRYPT-001: Key Generation Service
- ✅ ENCRYPT-002: Key Storage and Vault
- ✅ ENCRYPT-003: Key Distribution Service
- ✅ ENCRYPT-004: Key Rotation and Revocation
- ✅ ENCRYPT-005: Signal Protocol Implementation
- ✅ ENCRYPT-006: Message Encryption Service
- ✅ ENCRYPT-007: Group Encryption (Sender Keys)
- ✅ ENCRYPT-008: Safety Numbers and Verification

## All Encryption Tasks Complete! 🎉
