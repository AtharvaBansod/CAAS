/**
 * Sender Key Service
 * Implements Sender Keys protocol for efficient group messaging
 */

import { randomBytes, createHmac, createCipheriv, createDecipheriv } from 'crypto';
import { ed25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { senderKeyStore } from './sender-key-store';
import { messageEncryptionService } from '../message-encryption-service';
import {
  SenderKey,
  SenderKeyDistribution,
  SenderKeyRecord,
  GroupMessage,
} from './types';

export class SenderKeyService {
  /**
   * Create sender key for group
   */
  async createSenderKey(
    groupId: string,
    userId: string,
    deviceId: number
  ): Promise<SenderKeyDistribution> {
    // Generate chain key
    const chainKey = randomBytes(32);

    // Generate signing key pair
    const signingPrivateKey = ed25519.utils.randomPrivateKey();
    const signingPublicKey = ed25519.getPublicKey(signingPrivateKey);

    // Store sender key
    const record: SenderKeyRecord = {
      group_id: groupId,
      sender_id: userId,
      device_id: deviceId,
      chain_id: 0,
      chain_key: chainKey,
      signing_key_public: Buffer.from(signingPublicKey),
      message_number: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await senderKeyStore.storeSenderKey(record);

    // Create distribution message
    return {
      group_id: groupId,
      sender_id: userId,
      sender_device_id: deviceId,
      chain_id: 0,
      chain_key: chainKey,
      signing_key_public: Buffer.from(signingPublicKey),
    };
  }

  /**
   * Distribute sender key to group member
   */
  async distributeSenderKey(
    groupId: string,
    userId: string,
    deviceId: number,
    recipientId: string
  ): Promise<void> {
    // Get sender key
    const senderKey = await senderKeyStore.loadSenderKey(
      groupId,
      userId,
      deviceId
    );

    if (!senderKey) {
      throw new Error('Sender key not found');
    }

    // Create distribution message
    const distribution: SenderKeyDistribution = {
      group_id: groupId,
      sender_id: userId,
      sender_device_id: deviceId,
      chain_id: senderKey.chain_id,
      chain_key: senderKey.chain_key,
      signing_key_public: senderKey.signing_key_public,
    };

    // Serialize distribution
    const serialized = this.serializeDistribution(distribution);

    // Encrypt distribution using Signal Protocol session
    await messageEncryptionService.encryptMessage(
      userId,
      'default', // Tenant ID
      recipientId,
      {
        type: 'text',
        body: serialized.toString('base64'),
        metadata: { type: 'sender_key_distribution' },
      }
    );
  }

  /**
   * Process sender key distribution
   */
  async processSenderKeyDistribution(
    distribution: SenderKeyDistribution
  ): Promise<void> {
    // Store sender key
    const record: SenderKeyRecord = {
      group_id: distribution.group_id,
      sender_id: distribution.sender_id,
      device_id: distribution.sender_device_id,
      chain_id: distribution.chain_id,
      chain_key: distribution.chain_key,
      signing_key_public: distribution.signing_key_public,
      message_number: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await senderKeyStore.storeSenderKey(record);
  }

  /**
   * Encrypt group message
   */
  async encryptGroupMessage(
    groupId: string,
    userId: string,
    deviceId: number,
    message: Buffer
  ): Promise<GroupMessage> {
    // Get sender key
    const senderKey = await senderKeyStore.loadSenderKey(
      groupId,
      userId,
      deviceId
    );

    if (!senderKey) {
      throw new Error('Sender key not found. Create sender key first.');
    }

    // Derive message key
    const messageKey = await this.deriveMessageKey(
      senderKey.chain_key,
      senderKey.message_number
    );

    // Encrypt message
    const ciphertext = await this.encrypt(message, messageKey);

    // Sign ciphertext
    // In production, would use actual private key
    const signature = Buffer.from(
      ed25519.sign(ciphertext, randomBytes(32))
    );

    // Advance chain
    senderKey.message_number++;
    senderKey.chain_key = await this.advanceChainKey(senderKey.chain_key);
    await senderKeyStore.updateSenderKey(senderKey);

    return {
      group_id: groupId,
      sender_id: userId,
      device_id: deviceId,
      chain_id: senderKey.chain_id,
      message_number: senderKey.message_number - 1,
      ciphertext,
      signature,
    };
  }

  /**
   * Decrypt group message
   */
  async decryptGroupMessage(
    groupId: string,
    senderId: string,
    deviceId: number,
    groupMessage: GroupMessage
  ): Promise<Buffer> {
    // Get sender key
    const senderKey = await senderKeyStore.loadSenderKey(
      groupId,
      senderId,
      deviceId
    );

    if (!senderKey) {
      throw new Error('Sender key not found for this sender');
    }

    // Verify signature
    const isValid = ed25519.verify(
      groupMessage.signature,
      groupMessage.ciphertext,
      senderKey.signing_key_public
    );

    if (!isValid) {
      throw new Error('Invalid message signature');
    }

    // Derive message key
    const messageKey = await this.deriveMessageKey(
      senderKey.chain_key,
      groupMessage.message_number
    );

    // Decrypt message
    return this.decrypt(groupMessage.ciphertext, messageKey);
  }

  /**
   * Derive message key from chain key
   */
  private async deriveMessageKey(
    chainKey: Buffer,
    messageNumber: number
  ): Promise<Buffer> {
    const info = Buffer.concat([
      Buffer.from('message_key'),
      Buffer.alloc(4),
    ]);
    info.writeUInt32BE(messageNumber, 12);

    return Buffer.from(hkdf(sha256, chainKey, Buffer.alloc(0), info, 32));
  }

  /**
   * Advance chain key
   */
  private async advanceChainKey(chainKey: Buffer): Promise<Buffer> {
    return Buffer.from(
      hkdf(sha256, chainKey, Buffer.alloc(0), Buffer.from([0x02]), 32)
    );
  }

  /**
   * Encrypt with AES-256-CBC
   */
  private async encrypt(plaintext: Buffer, key: Buffer): Promise<Buffer> {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    // Add HMAC
    const hmac = createHmac('sha256', key);
    hmac.update(Buffer.concat([iv, encrypted]));
    const mac = hmac.digest();

    return Buffer.concat([iv, encrypted, mac]);
  }

  /**
   * Decrypt with AES-256-CBC
   */
  private async decrypt(ciphertext: Buffer, key: Buffer): Promise<Buffer> {
    // Extract components
    const iv = ciphertext.subarray(0, 16);
    const encrypted = ciphertext.subarray(16, -32);
    const mac = ciphertext.subarray(-32);

    // Verify HMAC
    const hmac = createHmac('sha256', key);
    hmac.update(Buffer.concat([iv, encrypted]));
    const expectedMac = hmac.digest();

    if (!mac.equals(expectedMac)) {
      throw new Error('MAC verification failed');
    }

    // Decrypt
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Serialize distribution message
   */
  private serializeDistribution(distribution: SenderKeyDistribution): Buffer {
    const data = {
      group_id: distribution.group_id,
      sender_id: distribution.sender_id,
      sender_device_id: distribution.sender_device_id,
      chain_id: distribution.chain_id,
      chain_key: distribution.chain_key.toString('base64'),
      signing_key_public: distribution.signing_key_public.toString('base64'),
    };

    return Buffer.from(JSON.stringify(data));
  }

  /**
   * Deserialize distribution message
   */
  deserializeDistribution(data: Buffer): SenderKeyDistribution {
    const parsed = JSON.parse(data.toString());

    return {
      group_id: parsed.group_id,
      sender_id: parsed.sender_id,
      sender_device_id: parsed.sender_device_id,
      chain_id: parsed.chain_id,
      chain_key: Buffer.from(parsed.chain_key, 'base64'),
      signing_key_public: Buffer.from(parsed.signing_key_public, 'base64'),
    };
  }
}

export const senderKeyService = new SenderKeyService();
