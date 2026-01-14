# R&D: Private-Public Key Generation & Secure Transport

> **Related Roadmaps**: 
> - [Auth, Authorization & Security](../roadmaps/3_AuthAutorizeSecurity.md)
> - [Socket Service](../roadmaps/5_sockets.md)

---

## Executive Summary

This document details the secure generation, storage, and transport of cryptographic key pairs from CAAS to end users, ensuring E2E encryption without server-side key access.

---

## 1. Key Generation Strategy

### 1.1 Where Keys Are Generated

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KEY GENERATION LOCATIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLIENT-SIDE (User's Device) ─ PREFERRED                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ✅ Private keys generated on device                                    │ │
│  │ ✅ Private keys never leave device                                     │ │
│  │ ✅ Public keys uploaded to server                                      │ │
│  │ ✅ Maximum security - server cannot decrypt                            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  SERVER-SIDE ─ NOT RECOMMENDED                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ❌ Private keys exist on server (even temporarily)                     │ │
│  │ ❌ Key transport to client creates vulnerability                       │ │
│  │ ❌ Server compromise exposes all keys                                  │ │
│  │ ❌ Not true E2E encryption                                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Client-Side Key Generation (Recommended)

```typescript
// Using Web Crypto API (Browser/Node.js)
async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  // Generate ECDSA key pair for signing
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'  // or 'P-384', 'P-521'
    },
    true,                   // extractable
    ['sign', 'verify']
  );
}

async function generateKeyExchangeKeyPair(): Promise<CryptoKeyPair> {
  // Generate ECDH key pair for key exchange
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

// Alternative: X25519 (libsodium)
import sodium from 'libsodium-wrappers';

async function generateX25519KeyPair(): Promise<KeyPair> {
  await sodium.ready;
  return sodium.crypto_box_keypair();
}
```

---

## 2. Private Key Protection

### 2.1 Password-Based Key Encryption

```typescript
// Derive encryption key from user password
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Convert password to key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES key using PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000,  // OWASP recommended
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt private key before storage
async function encryptPrivateKey(
  privateKey: CryptoKey,
  password: string
): Promise<EncryptedKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptionKey = await deriveKeyFromPassword(password, salt);
  
  // Export private key as JWK
  const keyData = await crypto.subtle.exportKey('jwk', privateKey);
  const encodedKey = new TextEncoder().encode(JSON.stringify(keyData));
  
  // Encrypt with AES-GCM
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    encryptionKey,
    encodedKey
  );
  
  return {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(encryptedData)
  };
}
```

### 2.2 Argon2 for Enhanced Security

```typescript
// Using Argon2id (recommended for password hashing)
import argon2 from 'argon2-browser';

async function deriveKeyWithArgon2(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const result = await argon2.hash({
    pass: password,
    salt: salt,
    type: argon2.ArgonType.Argon2id,
    time: 3,           // iterations
    mem: 65536,        // 64 MB memory
    hashLen: 32,       // 256-bit key
    parallelism: 4
  });
  
  return result.hash;
}
```

---

## 3. Secure Key Storage

### 3.1 Browser Storage (IndexedDB)

```typescript
// Secure IndexedDB wrapper
class SecureKeyStore {
  private dbName = 'caas-keys';
  private storeName = 'encrypted-keys';
  
  async storeEncryptedKey(
    userId: string,
    keyType: string,
    encryptedKey: EncryptedKey
  ): Promise<void> {
    const db = await this.openDb();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    await store.put({
      id: `${userId}:${keyType}`,
      userId,
      keyType,
      ...encryptedKey,
      createdAt: Date.now()
    });
    
    await tx.done;
  }
  
  async getEncryptedKey(
    userId: string,
    keyType: string
  ): Promise<EncryptedKey | null> {
    const db = await this.openDb();
    const result = await db.get(this.storeName, `${userId}:${keyType}`);
    return result || null;
  }
  
  async deleteAllKeys(userId: string): Promise<void> {
    const db = await this.openDb();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    const index = store.index('userId');
    
    const keys = await index.getAllKeys(userId);
    for (const key of keys) {
      await store.delete(key);
    }
    
    await tx.done;
  }
}
```

### 3.2 Mobile Storage (React Native)

```typescript
// React Native secure storage
import * as SecureStore from 'expo-secure-store';
import * as Keychain from 'react-native-keychain';

// iOS Keychain / Android Keystore
async function storeKeySecurely(
  keyId: string,
  encryptedKey: string
): Promise<void> {
  // Using react-native-keychain (hardware-backed)
  await Keychain.setGenericPassword(
    keyId,
    encryptedKey,
    {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE
    }
  );
}

async function retrieveKeySecurely(keyId: string): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({ service: keyId });
  return credentials ? credentials.password : null;
}
```

---

## 4. Public Key Transport to Server

### 4.1 Key Bundle Upload

```typescript
// Prepare key bundle for server
async function prepareKeyBundle(keyPairs: KeyPairs): Promise<KeyBundle> {
  const identityPublic = await crypto.subtle.exportKey(
    'spki',
    keyPairs.identity.publicKey
  );
  
  const signedPreKeyPublic = await crypto.subtle.exportKey(
    'spki',
    keyPairs.signedPreKey.publicKey
  );
  
  // Sign pre-key with identity key
  const preKeySignature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPairs.identity.privateKey,
    signedPreKeyPublic
  );
  
  return {
    identityKey: arrayBufferToBase64(identityPublic),
    signedPreKey: {
      id: keyPairs.signedPreKey.id,
      publicKey: arrayBufferToBase64(signedPreKeyPublic),
      signature: arrayBufferToBase64(preKeySignature)
    },
    oneTimePreKeys: await exportOneTimePreKeys(keyPairs.oneTimePreKeys)
  };
}

// Upload to server
async function uploadKeyBundle(bundle: KeyBundle): Promise<void> {
  await fetch('/api/keys/bundle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(bundle)
  });
}
```

### 4.2 Server-Side Validation

```typescript
// Server validates uploaded keys
async function validateKeyBundle(bundle: KeyBundle): Promise<boolean> {
  // 1. Verify public key formats
  const identityKey = await importPublicKey(bundle.identityKey);
  const signedPreKey = await importPublicKey(bundle.signedPreKey.publicKey);
  
  // 2. Verify pre-key signature
  const isValidSignature = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    identityKey,
    base64ToArrayBuffer(bundle.signedPreKey.signature),
    base64ToArrayBuffer(bundle.signedPreKey.publicKey)
  );
  
  if (!isValidSignature) {
    throw new Error('Invalid pre-key signature');
  }
  
  // 3. Verify key uniqueness
  const existingKey = await db.keys.findOne({
    identityKey: bundle.identityKey
  });
  
  if (existingKey && existingKey.userId !== currentUserId) {
    throw new Error('Identity key already registered');
  }
  
  return true;
}
```

---

## 5. Key Recovery Options

### 5.1 Recovery Phrase (BIP-39 Mnemonic)

```typescript
import * as bip39 from 'bip39';

// Generate recovery phrase during key creation
function generateRecoveryPhrase(): string {
  return bip39.generateMnemonic(256);  // 24 words
}

// Derive key from recovery phrase
async function deriveKeyFromPhrase(phrase: string): Promise<Uint8Array> {
  if (!bip39.validateMnemonic(phrase)) {
    throw new Error('Invalid recovery phrase');
  }
  
  const seed = await bip39.mnemonicToSeed(phrase);
  // Use first 32 bytes as key derivation seed
  return new Uint8Array(seed.slice(0, 32));
}

// Encrypt keys with recovery-derived key
async function createRecoveryBackup(
  keyBundle: KeyBundle,
  phrase: string
): Promise<EncryptedBackup> {
  const recoveryKey = await deriveKeyFromPhrase(phrase);
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    recoveryKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt the entire key bundle
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    new TextEncoder().encode(JSON.stringify(keyBundle))
  );
  
  return {
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(encrypted)
  };
}
```

### 5.2 Multi-Device Key Sync

```typescript
// Device-to-device key transfer
async function transferKeysToNewDevice(
  sourceDevice: Device,
  targetDevice: Device
): Promise<void> {
  // 1. Establish secure channel using QR code + verification
  const pairingCode = generatePairingCode();
  displayQrCode(pairingCode);
  
  // 2. Target device scans and establishes encrypted channel
  const sharedSecret = await performKeyExchange(pairingCode);
  
  // 3. Source device encrypts and sends keys
  const encryptedKeys = await encryptWithSharedSecret(
    await exportAllPrivateKeys(),
    sharedSecret
  );
  
  // 4. Transfer via server (encrypted end-to-end)
  await sendEncryptedPayload(targetDevice.id, encryptedKeys);
  
  // 5. Target device receives and imports
  // (handled on target device)
}
```

---

## 6. Security Considerations

### 6.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| Server compromise | Keys generated client-side |
| Network interception | TLS + E2E encryption |
| Device theft | Password-encrypted storage |
| Malware | Secure enclave where available |
| Password compromise | 2FA + device verification |

### 6.2 Best Practices

1. **Never generate private keys on server**
2. **Never transmit private keys over network**
3. **Always encrypt private keys at rest**
4. **Use hardware security modules where available**
5. **Implement key rotation regularly**
6. **Provide secure recovery options**

### 6.3 Cryptographic Recommendations

| Purpose | Algorithm | Key Size |
|---------|-----------|----------|
| Identity Signing | Ed25519 or ECDSA P-256 | 256-bit |
| Key Exchange | X25519 or ECDH P-256 | 256-bit |
| Key Encryption | AES-256-GCM | 256-bit |
| Key Derivation | Argon2id | 256-bit output |

---

## 7. Implementation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KEY LIFECYCLE FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. USER REGISTRATION                                                       │
│     ┌─────────┐                                                             │
│     │ Client  │ Generate keys → Encrypt with password → Store locally      │
│     └────┬────┘                                                             │
│          │ Upload public keys                                                │
│          ▼                                                                   │
│     ┌─────────┐                                                             │
│     │ Server  │ Validate → Store public key bundle                          │
│     └─────────┘                                                             │
│                                                                              │
│  2. NEW DEVICE SETUP                                                        │
│     ┌──────────┐   QR/Code   ┌──────────┐                                  │
│     │ Device A ├────────────▶│ Device B │ Import keys                       │
│     └──────────┘  encrypted  └──────────┘                                   │
│                                                                              │
│  3. KEY ROTATION                                                            │
│     ┌─────────┐                                                             │
│     │ Client  │ Generate new → Sign with old → Upload                       │
│     └────┬────┘                                                             │
│          │ Re-establish sessions                                            │
│          ▼                                                                   │
│     ┌─────────┐                                                             │
│     │Contacts │ Verify new key → Update sessions                            │
│     └─────────┘                                                             │
│                                                                              │
│  4. KEY RECOVERY                                                            │
│     ┌─────────┐                                                             │
│     │  User   │ Enter recovery phrase → Decrypt backup → Restore keys      │
│     └─────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documents

- [Signal Protocol Implementation](./signal-protocol-implementation.md)
- [E2E Encryption Flow](../flowdiagram/e2e-encryption-flow.md)
- [E2E Key Management Deep Dive](../deepDive/authSecurity/e2e-key-management.md)
