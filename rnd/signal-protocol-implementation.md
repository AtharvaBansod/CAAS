# R&D: Signal Protocol Implementation for CAAS

> **Related Roadmap**: [Auth, Authorization & Security](../roadmaps/3_AuthAutorizeSecurity.md)

---

## Executive Summary

This document provides detailed research on implementing the Signal Protocol for end-to-end encrypted messaging in CAAS. The Signal Protocol is the gold standard for secure messaging, used by Signal, WhatsApp, and Facebook Messenger.

---

## Table of Contents
1. [Protocol Overview](#1-protocol-overview)
2. [Key Components](#2-key-components)
3. [Implementation Approach](#3-implementation-approach)
4. [Technical Considerations](#4-technical-considerations)
5. [Library Options](#5-library-options)
6. [Recommendations](#6-recommendations)

---

## 1. Protocol Overview

### What is the Signal Protocol?
The Signal Protocol combines three cryptographic components:
1. **X3DH (Extended Triple Diffie-Hellman)**: Initial key exchange
2. **Double Ratchet Algorithm**: Ongoing message encryption
3. **Sesame**: Multi-device session management

### Security Properties
| Property | Description |
|----------|-------------|
| **Perfect Forward Secrecy** | Compromise of long-term keys doesn't expose past messages |
| **Post-Compromise Security** | Security recovers after temporary key compromise |
| **Deniability** | Participants can deny having sent messages |
| **Asynchronous** | Encryption works even if recipient is offline |

---

## 2. Key Components

### 2.1 X3DH Key Exchange

```
X3DH Protocol Flow:

Alice (Sender)                              Bob (Recipient)
    │                                            │
    │     ┌────────────────────────────────┐     │
    │     │ Pre-stored on Server:          │     │
    │     │ - Identity Key (IKB)           │     │
    │     │ - Signed Pre-Key (SPKB)        │     │
    │     │ - One-Time Pre-Keys (OTKB)     │     │
    │     └────────────────────────────────┘     │
    │                                            │
    │──────────── Fetch Key Bundle ─────────────▶│
    │◀────────── {IKB, SPKB, OTKB} ─────────────│
    │                                            │
    │   Calculate shared secret:                 │
    │   DH1 = DH(IKA, SPKB)                     │
    │   DH2 = DH(EKA, IKB)                      │
    │   DH3 = DH(EKA, SPKB)                     │
    │   DH4 = DH(EKA, OTKB) [if available]     │
    │   SK = KDF(DH1 || DH2 || DH3 || DH4)     │
    │                                            │
    │──── Initial Message + Key Info ──────────▶│
    │                                            │
    │                   Bob calculates same SK   │
    │                   and decrypts message     │
```

**Key Types:**
- **Identity Key (IK)**: Long-term key pair, represents user identity
- **Signed Pre-Key (SPK)**: Medium-term key, signed by identity key
- **One-Time Pre-Key (OTK)**: Single-use keys for forward secrecy

### 2.2 Double Ratchet Algorithm

```
Double Ratchet Operation:

Root Key (RK)
     │
     ├──────────────────────────────────────┐
     │                                      │
     ▼                                      ▼
Chain Key (Sending)                   Chain Key (Receiving)
     │                                      │
     ├── MK1 ─► Encrypt Message 1           ├── MK1 ─► Decrypt Message 1
     ├── MK2 ─► Encrypt Message 2           ├── MK2 ─► Decrypt Message 2
     └── MK3 ─► Encrypt Message 3           └── MK3 ─► Decrypt Message 3

On each reply, DH ratchet step occurs:
1. Generate new ephemeral key pair
2. Derive new root key and chain keys
3. Old keys are deleted (forward secrecy)
```

**Ratchet Types:**
- **Symmetric Ratchet**: Derives new message keys from chain key
- **DH Ratchet**: Triggers on sender change, provides forward secrecy

### 2.3 Session Management

```
Session Store Structure:

sessions/
├── {userId}/
│   ├── {deviceId}/
│   │   ├── identity_key: string
│   │   ├── session_state: {
│   │   │   root_key: string
│   │   │   sending_chain: ChainState
│   │   │   receiving_chains: ChainState[]
│   │   │   previous_counter: number
│   │   └── }
│   │   └── pending_pre_key: PreKeyState | null
│   └── ...
└── ...
```

---

## 3. Implementation Approach

### 3.1 Client-Side Components

```typescript
// Core Signal Protocol interfaces

interface IdentityKeyStore {
  getIdentityKeyPair(): Promise<IdentityKeyPair>;
  saveIdentity(address: SignalAddress, identityKey: PublicKey): Promise<boolean>;
  isTrustedIdentity(address: SignalAddress, identityKey: PublicKey): Promise<boolean>;
}

interface PreKeyStore {
  loadPreKey(preKeyId: number): Promise<PreKeyRecord | null>;
  storePreKey(preKeyId: number, record: PreKeyRecord): Promise<void>;
  removePreKey(preKeyId: number): Promise<void>;
}

interface SignedPreKeyStore {
  loadSignedPreKey(signedPreKeyId: number): Promise<SignedPreKeyRecord>;
  storeSignedPreKey(signedPreKeyId: number, record: SignedPreKeyRecord): Promise<void>;
}

interface SessionStore {
  loadSession(address: SignalAddress): Promise<SessionRecord | null>;
  storeSession(address: SignalAddress, record: SessionRecord): Promise<void>;
}
```

### 3.2 Server-Side Components

```typescript
// Server only stores public keys - never private keys

interface UserKeyBundle {
  user_id: string;
  device_id: string;
  registration_id: number;
  identity_key: string;           // Public only
  signed_pre_key: {
    key_id: number;
    public_key: string;
    signature: string;
  };
  one_time_pre_keys: [{
    key_id: number;
    public_key: string;
  }];
}

// Server endpoints
POST /keys/register     // Register key bundle
GET  /keys/{userId}     // Fetch key bundle
POST /keys/prekeys      // Upload new one-time pre-keys
GET  /keys/prekeys/count // Get remaining pre-key count
```

### 3.3 Message Encryption Flow

```typescript
// Encrypt message
async function encryptMessage(
  recipientUserId: string,
  recipientDeviceId: string,
  plaintext: string
): Promise<EncryptedMessage> {
  const address = new SignalAddress(recipientUserId, recipientDeviceId);
  
  // Get or create session
  let session = await sessionStore.loadSession(address);
  if (!session) {
    // Fetch key bundle and establish session
    const bundle = await fetchKeyBundle(recipientUserId, recipientDeviceId);
    session = await sessionBuilder.processPreKeyBundle(bundle);
  }
  
  // Encrypt with session
  const ciphertext = await sessionCipher.encrypt(address, plaintext);
  
  return {
    type: ciphertext.type,  // PREKEY_MESSAGE or WHISPER_MESSAGE
    body: ciphertext.body,
    registrationId: ciphertext.registrationId
  };
}

// Decrypt message
async function decryptMessage(
  senderUserId: string,
  senderDeviceId: string,
  ciphertext: EncryptedMessage
): Promise<string> {
  const address = new SignalAddress(senderUserId, senderDeviceId);
  
  if (ciphertext.type === PREKEY_MESSAGE) {
    // First message establishing session
    const plaintext = await sessionCipher.decryptPreKeyMessage(
      address,
      ciphertext.body
    );
    return plaintext;
  } else {
    // Regular message
    const plaintext = await sessionCipher.decrypt(address, ciphertext.body);
    return plaintext;
  }
}
```

---

## 4. Technical Considerations

### 4.1 Multi-Device Support

**Challenge**: Users have multiple devices, each needs to receive messages.

**Solution: Sender Keys for Groups + Pairwise for 1:1**

```
User A (2 devices)                     User B (3 devices)
┌─────────────────┐                   ┌─────────────────┐
│ Device A1       │                   │ Device B1       │
│ Device A2       │                   │ Device B2       │
└─────────────────┘                   │ Device B3       │
                                      └─────────────────┘

Message from A1 to B:
1. Encrypt with each device's session:
   - A1 → B1 session
   - A1 → B2 session
   - A1 → B3 session
2. Server fans out to all devices
```

### 4.2 Key Verification

```typescript
// Safety number generation (like Signal)
function generateSafetyNumber(
  localIdentityKey: PublicKey,
  remoteIdentityKey: PublicKey
): string {
  const hash = SHA256(
    localIdentityKey.serialize(),
    remoteIdentityKey.serialize()
  );
  
  // Convert to 6 groups of 5 digits
  const numbers: string[] = [];
  for (let i = 0; i < 6; i++) {
    const chunk = hash.slice(i * 5, (i + 1) * 5);
    const num = parseInt(chunk.toString('hex'), 16) % 100000;
    numbers.push(num.toString().padStart(5, '0'));
  }
  
  return numbers.join(' ');  // "12345 67890 12345 67890 12345 67890"
}
```

### 4.3 Group Messaging

**Sender Keys Protocol** for efficient group encryption:

```
Group Setup:
1. Each member generates Sender Key for the group
2. Sender Key is distributed via pairwise E2E

Message Sending:
1. Encrypt message once with Sender Key
2. Send to all group members
3. Each member decrypts with sender's Sender Key

Benefits:
- O(1) encryption instead of O(n)
- Still maintains forward secrecy via chain ratchet
```

### 4.4 Storage Security

```typescript
// Client-side storage (IndexedDB with encryption)
interface SecureStorage {
  // Encrypt all values before storing
  async set(key: string, value: any): Promise<void> {
    const encryptedValue = await encrypt(
      JSON.stringify(value),
      this.storageKey  // Derived from user password
    );
    await this.db.put(key, encryptedValue);
  }
  
  async get(key: string): Promise<any> {
    const encryptedValue = await this.db.get(key);
    if (!encryptedValue) return null;
    
    const decrypted = await decrypt(encryptedValue, this.storageKey);
    return JSON.parse(decrypted);
  }
}
```

---

## 5. Library Options

### 5.1 JavaScript/TypeScript Libraries

| Library | License | Maintenance | Notes |
|---------|---------|-------------|-------|
| **@aspect-build/libsignal-client-node** | AGPL-3.0 | Active | Official Signal implementation |
| **libsignal-protocol-javascript** | GPL-3.0 | Limited | Reference implementation |
| **signal-protocol** | MIT | Active | Community port |

### 5.2 Recommendation: libsignal-client

```typescript
// Using official libsignal-client-node
import * as SignalClient from '@aspect-build/libsignal-client-node';

// Generate identity key
const identityKeyPair = SignalClient.IdentityKeyPair.generate();

// Generate pre-keys
const preKeys = [];
for (let i = 0; i < 100; i++) {
  preKeys.push(SignalClient.PreKeyRecord.new(i, SignalClient.PrivateKey.generate()));
}

// Signed pre-key
const signedPreKey = SignalClient.SignedPreKeyRecord.new(
  1,
  Date.now(),
  SignalClient.PrivateKey.generate(),
  identityKeyPair.privateKey()
);
```

---

## 6. Recommendations

### 6.1 Implementation Phases

**Phase 1: Foundation (2 weeks)**
- Set up key generation on client
- Implement key bundle API on server
- Build secure client storage

**Phase 2: Core Protocol (3 weeks)**
- Implement X3DH key exchange
- Implement Double Ratchet
- Build session management

**Phase 3: Multi-Device (2 weeks)**
- Device registration flow
- Session sync across devices
- Device verification

**Phase 4: Group E2E (2 weeks)**
- Sender Keys implementation
- Group key management
- Member changes handling

### 6.2 Security Audit Checklist

- [ ] Independent cryptographic audit
- [ ] Memory handling (no plaintext in logs)
- [ ] Secure random number generation
- [ ] Timing attack prevention
- [ ] Side-channel attack mitigation

### 6.3 UX Considerations

- Safety number verification UI
- Device linking flow
- Key change notifications
- Backup/recovery options

---

## References

- [Signal Protocol Specifications](https://signal.org/docs/)
- [X3DH Specification](https://signal.org/docs/specifications/x3dh/)
- [Double Ratchet Specification](https://signal.org/docs/specifications/doubleratchet/)
- [Sesame Specification](https://signal.org/docs/specifications/sesame/)
