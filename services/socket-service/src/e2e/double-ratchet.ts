import { createHmac, randomBytes } from 'crypto';
import { Logger } from 'pino';

/**
 * Double Ratchet Algorithm implementation for forward secrecy
 * Based on Signal Protocol specification
 */
export class DoubleRatchet {
  private rootKey: Buffer;
  private sendingChainKey: Buffer;
  private receivingChainKey: Buffer;
  private sendingChainLength: number;
  private receivingChainLength: number;
  private skippedMessageKeys: Map<string, Buffer>;
  private logger: Logger;

  constructor(sharedSecret: string, isInitiator: boolean, logger: Logger) {
    this.logger = logger;
    this.rootKey = Buffer.from(sharedSecret, 'hex');
    this.skippedMessageKeys = new Map();
    this.sendingChainLength = 0;
    this.receivingChainLength = 0;

    // Initialize chain keys from root key
    const { chainKey: sendKey, nextRootKey: nextRoot1 } = this.deriveChainKey(this.rootKey, 'sending');
    this.sendingChainKey = sendKey;
    
    const { chainKey: recvKey } = this.deriveChainKey(nextRoot1, 'receiving');
    this.receivingChainKey = recvKey;
    this.rootKey = nextRoot1;
  }

  /**
   * Ratchet the sending chain forward and return message key
   */
  ratchetSendingChain(): string {
    const messageKey = this.deriveMessageKey(this.sendingChainKey, this.sendingChainLength);
    
    // Advance chain key
    this.sendingChainKey = this.advanceChainKey(this.sendingChainKey);
    this.sendingChainLength++;

    return messageKey.toString('hex');
  }

  /**
   * Ratchet the receiving chain and return message key
   * Handles out-of-order messages by storing skipped keys
   */
  async ratchetReceivingChain(messageNumber: number, chainLength: number): Promise<string> {
    // Check if we have a skipped key for this message
    const skippedKey = this.skippedMessageKeys.get(`${chainLength}:${messageNumber}`);
    if (skippedKey) {
      this.skippedMessageKeys.delete(`${chainLength}:${messageNumber}`);
      return skippedKey.toString('hex');
    }

    // If message is from future, store skipped keys
    if (messageNumber > this.receivingChainLength) {
      for (let i = this.receivingChainLength; i < messageNumber; i++) {
        const skippedMessageKey = this.deriveMessageKey(this.receivingChainKey, i);
        this.skippedMessageKeys.set(`${chainLength}:${i}`, skippedMessageKey);
        this.receivingChainKey = this.advanceChainKey(this.receivingChainKey);
      }
    }

    // Derive message key for current message
    const messageKey = this.deriveMessageKey(this.receivingChainKey, messageNumber);
    
    // Advance chain
    this.receivingChainKey = this.advanceChainKey(this.receivingChainKey);
    this.receivingChainLength = messageNumber + 1;

    // Cleanup old skipped keys (keep only last 100)
    if (this.skippedMessageKeys.size > 100) {
      const keysToDelete = Array.from(this.skippedMessageKeys.keys()).slice(0, 50);
      keysToDelete.forEach(key => this.skippedMessageKeys.delete(key));
      this.logger.warn('Cleaned up old skipped message keys');
    }

    return messageKey.toString('hex');
  }

  /**
   * Derive a new chain key from root key
   */
  private deriveChainKey(rootKey: Buffer, purpose: string): { chainKey: Buffer; nextRootKey: Buffer } {
    const info = Buffer.from(purpose, 'utf8');
    
    // KDF using HMAC-SHA256
    const hmac1 = createHmac('sha256', rootKey);
    hmac1.update(info);
    hmac1.update(Buffer.from([0x01]));
    const chainKey = hmac1.digest();

    const hmac2 = createHmac('sha256', rootKey);
    hmac2.update(info);
    hmac2.update(Buffer.from([0x02]));
    const nextRootKey = hmac2.digest();

    return { chainKey, nextRootKey };
  }

  /**
   * Derive message key from chain key
   */
  private deriveMessageKey(chainKey: Buffer, index: number): Buffer {
    const hmac = createHmac('sha256', chainKey);
    hmac.update(Buffer.from('message-key', 'utf8'));
    hmac.update(Buffer.from([index & 0xff, (index >> 8) & 0xff, (index >> 16) & 0xff, (index >> 24) & 0xff]));
    return hmac.digest();
  }

  /**
   * Advance chain key using KDF
   */
  private advanceChainKey(chainKey: Buffer): Buffer {
    const hmac = createHmac('sha256', chainKey);
    hmac.update(Buffer.from([0x02]));
    return hmac.digest();
  }

  /**
   * Perform DH ratchet step (called when receiving new public key)
   */
  dhRatchet(remotePublicKey: string): void {
    // Generate new ephemeral key pair
    const ephemeralPrivate = randomBytes(32);
    
    // Derive new root key and receiving chain key
    const dhOutput = this.performDH(ephemeralPrivate, Buffer.from(remotePublicKey, 'hex'));
    const { chainKey: newReceivingChain, nextRootKey } = this.deriveChainKey(dhOutput, 'dh-ratchet-recv');
    
    this.receivingChainKey = newReceivingChain;
    this.receivingChainLength = 0;
    
    // Derive new sending chain key
    const { chainKey: newSendingChain, nextRootKey: finalRootKey } = this.deriveChainKey(nextRootKey, 'dh-ratchet-send');
    
    this.sendingChainKey = newSendingChain;
    this.sendingChainLength = 0;
    this.rootKey = finalRootKey;

    this.logger.debug('DH ratchet step completed');
  }

  /**
   * Perform Diffie-Hellman key exchange (simplified)
   */
  private performDH(privateKey: Buffer, publicKey: Buffer): Buffer {
    // In production, use proper ECDH with Curve25519
    // This is a simplified version for demonstration
    const hmac = createHmac('sha256', privateKey);
    hmac.update(publicKey);
    return hmac.digest();
  }

  /**
   * Get current state for persistence
   */
  getSendingChainKey(): string {
    return this.sendingChainKey.toString('hex');
  }

  getReceivingChainKey(): string {
    return this.receivingChainKey.toString('hex');
  }

  getSendingChainLength(): number {
    return this.sendingChainLength;
  }

  getReceivingChainLength(): number {
    return this.receivingChainLength;
  }

  /**
   * Restore state from persistence
   */
  restore(
    sendingChainKey: string,
    receivingChainKey: string,
    sendingChainLength: number,
    receivingChainLength: number
  ): void {
    this.sendingChainKey = Buffer.from(sendingChainKey, 'hex');
    this.receivingChainKey = Buffer.from(receivingChainKey, 'hex');
    this.sendingChainLength = sendingChainLength;
    this.receivingChainLength = receivingChainLength;
  }
}
