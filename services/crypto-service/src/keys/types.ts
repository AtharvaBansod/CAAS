/**
 * Key Types and Interfaces
 */

export interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
}

export interface PublicKey {
  key: Buffer;
  keyId?: string;
}

export interface PrivateKey {
  key: Buffer;
  keyId?: string;
}

export interface PreKey {
  keyId: number;
  publicKey: Buffer;
  privateKey?: Buffer;
}

export interface SignedPreKey {
  keyId: number;
  publicKey: Buffer;
  privateKey?: Buffer;
  signature: Buffer;
  timestamp: number;
}

export interface IdentityKeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
  registrationId: number;
}

export interface SessionKey {
  key: Buffer;
  keyId: string;
  createdAt: Date;
  expiresAt?: Date;
}

export type KeyEncoding = 'base64' | 'hex' | 'binary';

export interface KeyEncodingOptions {
  encoding: KeyEncoding;
  prefix?: string;
}

export interface KeyFingerprint {
  fingerprint: string;
  algorithm: 'sha256' | 'sha512';
}

export interface KeyDerivationParams {
  salt: Buffer;
  info: Buffer;
  length: number;
}

export interface DerivedKeys {
  encryptionKey: Buffer;
  authKey: Buffer;
  iv: Buffer;
}

export type KeyType = 'identity' | 'signed_pre_key' | 'pre_key' | 'session' | 'ephemeral';

export interface KeyMetadata {
  keyId: string;
  keyType: KeyType;
  userId: string;
  tenantId: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}
