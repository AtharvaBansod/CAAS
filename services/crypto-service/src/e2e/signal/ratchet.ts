/**
 * Double Ratchet Implementation
 * Core of Signal Protocol's forward secrecy
 */

import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { RatchetState, MessageKeys, ChainState } from './types';

export class DoubleRatchet {
  /**
   * Initialize ratchet state from shared secret
   */
  async initializeAsInitiator(
    sharedSecret: Buffer,
    remotePublicKey: Buffer
  ): Promise<RatchetState> {
    // Generate initial DH key pair
    const dhPrivateKey = x25519.utils.randomPrivateKey();
    const dhPublicKey = x25519.getPublicKey(dhPrivateKey);

    // Perform initial DH ratchet
    const dhOutput = x25519.getSharedSecret(dhPrivateKey, remotePublicKey);

    // Derive root key and sending chain key
    const { rootKey, chainKey } = await this.deriveRootKey(
      sharedSecret,
      Buffer.from(dhOutput)
    );

    return {
      dh_pair: {
        public_key: Buffer.from(dhPublicKey),
        private_key: Buffer.from(dhPrivateKey),
      },
      dh_remote_public: remotePublicKey,
      root_key: rootKey,
      sending_chain_key: chainKey,
      receiving_chain_key: null,
      sending_message_number: 0,
      receiving_message_number: 0,
      previous_sending_chain_length: 0,
    };
  }

  /**
   * Initialize ratchet state as responder
   */
  async initializeAsResponder(
    sharedSecret: Buffer,
    dhKeyPair: { publicKey: Buffer; privateKey: Buffer }
  ): Promise<RatchetState> {
    return {
      dh_pair: dhKeyPair,
      dh_remote_public: null,
      root_key: sharedSecret,
      sending_chain_key: null,
      receiving_chain_key: null,
      sending_message_number: 0,
      receiving_message_number: 0,
      previous_sending_chain_length: 0,
    };
  }

  /**
   * Perform DH ratchet step (when receiving new public key)
   */
  async dhRatchet(
    state: RatchetState,
    remotePublicKey: Buffer
  ): Promise<RatchetState> {
    // Save previous chain length
    state.previous_sending_chain_length = state.sending_message_number;
    state.sending_message_number = 0;
    state.receiving_message_number = 0;

    // Update remote public key
    state.dh_remote_public = remotePublicKey;

    // Derive receiving chain
    const dhOutput = x25519.getSharedSecret(
      state.dh_pair.private_key,
      remotePublicKey
    );
    const { rootKey: newRootKey, chainKey: receivingChainKey } =
      await this.deriveRootKey(state.root_key, Buffer.from(dhOutput));

    state.root_key = newRootKey;
    state.receiving_chain_key = receivingChainKey;

    // Generate new DH key pair
    const newPrivateKey = x25519.utils.randomPrivateKey();
    const newPublicKey = x25519.getPublicKey(newPrivateKey);

    state.dh_pair = {
      public_key: Buffer.from(newPublicKey),
      private_key: Buffer.from(newPrivateKey),
    };

    // Derive sending chain
    const dhOutput2 = x25519.getSharedSecret(newPrivateKey, remotePublicKey);
    const { rootKey: finalRootKey, chainKey: sendingChainKey } =
      await this.deriveRootKey(state.root_key, Buffer.from(dhOutput2));

    state.root_key = finalRootKey;
    state.sending_chain_key = sendingChainKey;

    return state;
  }

  /**
   * Derive message keys from chain key
   */
  async deriveMessageKeys(chainKey: Buffer): Promise<MessageKeys> {
    // Derive 80 bytes: 32 cipher key + 32 MAC key + 16 IV
    const derived = Buffer.from(
      hkdf(sha256, chainKey, Buffer.alloc(0), Buffer.from('message_keys'), 80)
    );

    return {
      cipher_key: derived.subarray(0, 32),
      mac_key: derived.subarray(32, 64),
      iv: derived.subarray(64, 80),
    };
  }

  /**
   * Advance chain key
   */
  async advanceChainKey(chainKey: Buffer): Promise<Buffer> {
    return Buffer.from(
      hkdf(sha256, chainKey, Buffer.alloc(0), Buffer.from([0x02]), 32)
    );
  }

  /**
   * Derive root key and chain key from DH output
   */
  private async deriveRootKey(
    rootKey: Buffer,
    dhOutput: Buffer
  ): Promise<{ rootKey: Buffer; chainKey: Buffer }> {
    // Derive 64 bytes: 32 for new root key + 32 for chain key
    const derived = Buffer.from(
      hkdf(sha256, dhOutput, rootKey, Buffer.from('root_key'), 64)
    );

    return {
      rootKey: derived.subarray(0, 32),
      chainKey: derived.subarray(32, 64),
    };
  }

  /**
   * Encrypt message with ratchet
   */
  async encryptMessage(
    state: RatchetState,
    plaintext: Buffer
  ): Promise<{ ciphertext: Buffer; state: RatchetState }> {
    if (!state.sending_chain_key) {
      throw new Error('Sending chain not initialized');
    }

    // Derive message keys
    const messageKeys = await this.deriveMessageKeys(state.sending_chain_key);

    // Encrypt plaintext
    const ciphertext = await this.encrypt(plaintext, messageKeys);

    // Advance chain
    state.sending_chain_key = await this.advanceChainKey(
      state.sending_chain_key
    );
    state.sending_message_number++;

    return { ciphertext, state };
  }

  /**
   * Decrypt message with ratchet
   */
  async decryptMessage(
    state: RatchetState,
    senderRatchetKey: Buffer,
    messageNumber: number,
    ciphertext: Buffer
  ): Promise<{ plaintext: Buffer; state: RatchetState }> {
    // Check if we need to perform DH ratchet
    if (
      !state.dh_remote_public ||
      !state.dh_remote_public.equals(senderRatchetKey)
    ) {
      state = await this.dhRatchet(state, senderRatchetKey);
    }

    if (!state.receiving_chain_key) {
      throw new Error('Receiving chain not initialized');
    }

    // Skip to correct message number
    let chainKey = state.receiving_chain_key;
    for (let i = state.receiving_message_number; i < messageNumber; i++) {
      chainKey = await this.advanceChainKey(chainKey);
    }

    // Derive message keys
    const messageKeys = await this.deriveMessageKeys(chainKey);

    // Decrypt ciphertext
    const plaintext = await this.decrypt(ciphertext, messageKeys);

    // Update state
    state.receiving_chain_key = await this.advanceChainKey(chainKey);
    state.receiving_message_number = messageNumber + 1;

    return { plaintext, state };
  }

  /**
   * Encrypt with AES-256-CBC
   */
  private async encrypt(
    plaintext: Buffer,
    keys: MessageKeys
  ): Promise<Buffer> {
    const { createCipheriv, createHmac } = require('crypto');

    const cipher = createCipheriv('aes-256-cbc', keys.cipher_key, keys.iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    // Add MAC
    const hmac = createHmac('sha256', keys.mac_key);
    hmac.update(encrypted);
    const mac = hmac.digest();

    return Buffer.concat([encrypted, mac]);
  }

  /**
   * Decrypt with AES-256-CBC
   */
  private async decrypt(
    ciphertext: Buffer,
    keys: MessageKeys
  ): Promise<Buffer> {
    const { createDecipheriv, createHmac } = require('crypto');

    // Verify MAC
    const encrypted = ciphertext.subarray(0, -32);
    const mac = ciphertext.subarray(-32);

    const hmac = createHmac('sha256', keys.mac_key);
    hmac.update(encrypted);
    const expectedMac = hmac.digest();

    if (!mac.equals(expectedMac)) {
      throw new Error('MAC verification failed');
    }

    // Decrypt
    const decipher = createDecipheriv('aes-256-cbc', keys.cipher_key, keys.iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

export const doubleRatchet = new DoubleRatchet();
