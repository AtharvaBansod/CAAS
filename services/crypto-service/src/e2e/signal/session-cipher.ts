/**
 * Session Cipher
 * High-level encryption/decryption using Signal Protocol sessions
 */

import { doubleRatchet } from './ratchet';
import { sessionStore } from './session-store';
import { messageSerializer } from './message-types';
import { CiphertextMessage, RatchetState } from './types';

export class SessionCipher {
  /**
   * Encrypt message using existing session
   */
  async encrypt(
    userId: string,
    recipientId: string,
    deviceId: number,
    plaintext: Buffer
  ): Promise<CiphertextMessage> {
    // Load session
    const session = await sessionStore.loadSession(
      userId,
      recipientId,
      deviceId
    );

    if (!session) {
      throw new Error('Session not found. Establish session first.');
    }

    // Create ratchet state from session
    const ratchetState: RatchetState = {
      dh_pair: {
        public_key: session.sending_chain.public_key || Buffer.alloc(32),
        private_key: Buffer.alloc(32), // Would be loaded from secure storage
      },
      dh_remote_public: null,
      root_key: session.root_key,
      sending_chain_key: session.sending_chain.chain_key,
      receiving_chain_key: null,
      sending_message_number: session.sending_chain.message_number,
      receiving_message_number: 0,
      previous_sending_chain_length: session.previous_counter,
    };

    // Encrypt with ratchet
    const { ciphertext, state: newState } = await doubleRatchet.encryptMessage(
      ratchetState,
      plaintext
    );

    // Update session
    session.sending_chain.chain_key = newState.sending_chain_key!;
    session.sending_chain.message_number = newState.sending_message_number;
    session.previous_counter = newState.previous_sending_chain_length;
    await sessionStore.updateSession(session);

    // Create ciphertext message
    return messageSerializer.createCiphertextMessage(
      'message',
      ratchetState.dh_pair.public_key,
      newState.sending_message_number - 1,
      session.previous_counter,
      ciphertext
    );
  }

  /**
   * Decrypt message using existing session
   */
  async decrypt(
    userId: string,
    senderId: string,
    deviceId: number,
    ciphertextMessage: CiphertextMessage
  ): Promise<Buffer> {
    // Load session
    const session = await sessionStore.loadSession(userId, senderId, deviceId);

    if (!session) {
      throw new Error('Session not found');
    }

    // Get or create receiving chain
    const chainKey =
      session.receiving_chains.get(
        ciphertextMessage.sender_ratchet_key.toString('hex')
      )?.chain_key || session.root_key;

    // Create ratchet state
    const ratchetState: RatchetState = {
      dh_pair: {
        public_key: Buffer.alloc(32), // Would be loaded
        private_key: Buffer.alloc(32),
      },
      dh_remote_public: ciphertextMessage.sender_ratchet_key,
      root_key: session.root_key,
      sending_chain_key: null,
      receiving_chain_key: chainKey,
      sending_message_number: 0,
      receiving_message_number: 0,
      previous_sending_chain_length: 0,
    };

    // Decrypt with ratchet
    const { plaintext, state: newState } = await doubleRatchet.decryptMessage(
      ratchetState,
      ciphertextMessage.sender_ratchet_key,
      ciphertextMessage.message_number,
      ciphertextMessage.ciphertext
    );

    // Update session
    session.receiving_chains.set(
      ciphertextMessage.sender_ratchet_key.toString('hex'),
      {
        chain_key: newState.receiving_chain_key!,
        message_number: newState.receiving_message_number,
        public_key: ciphertextMessage.sender_ratchet_key,
      }
    );
    await sessionStore.updateSession(session);

    return plaintext;
  }

  /**
   * Get session info
   */
  async getSessionInfo(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<{
    exists: boolean;
    created_at?: Date;
    updated_at?: Date;
    message_count?: number;
  }> {
    const session = await sessionStore.loadSession(
      userId,
      recipientId,
      deviceId
    );

    if (!session) {
      return { exists: false };
    }

    return {
      exists: true,
      created_at: session.created_at,
      updated_at: session.updated_at,
      message_count: session.sending_chain.message_number,
    };
  }

  /**
   * Delete session
   */
  async deleteSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<void> {
    await sessionStore.deleteSession(userId, recipientId, deviceId);
  }
}

export const sessionCipher = new SessionCipher();
