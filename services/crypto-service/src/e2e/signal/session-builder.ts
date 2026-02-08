/**
 * Session Builder
 * Establishes Signal Protocol sessions using X3DH
 */

import { x3dh } from './x3dh';
import { doubleRatchet } from './ratchet';
import { sessionStore } from './session-store';
import { messageSerializer } from './message-types';
import { keyGenerator } from '../../keys/key-generator';
import { PreKeyBundle } from '../../distribution/types';
import { Session, PreKeyMessage } from './types';

export class SessionBuilder {
  /**
   * Build outgoing session (initiator)
   */
  async buildOutgoingSession(
    userId: string,
    recipientUserId: string,
    recipientBundle: PreKeyBundle
  ): Promise<Session> {
    // Generate ephemeral key pair
    const ephemeralKeyPair = await keyGenerator.generateEphemeralKeyPair();

    // Get user's identity key (would be loaded from storage)
    const identityKeyPair = await keyGenerator.generateIdentityKeyPair();

    // Perform X3DH key agreement
    const x3dhResult = await x3dh.initiatorAgreement(
      {
        publicKey: identityKeyPair.publicKey,
        privateKey: identityKeyPair.privateKey,
      },
      {
        publicKey: ephemeralKeyPair.publicKey,
        privateKey: ephemeralKeyPair.privateKey,
      },
      recipientBundle
    );

    // Initialize ratchet
    const ratchetState = await doubleRatchet.initializeAsInitiator(
      x3dhResult.shared_secret,
      recipientBundle.signed_pre_key.public_key
    );

    // Create session
    const session = await sessionStore.createSession(
      userId,
      recipientUserId,
      recipientBundle.device_id,
      ratchetState.root_key
    );

    // Update session with ratchet state
    session.sending_chain = {
      chain_key: ratchetState.sending_chain_key!,
      message_number: 0,
      public_key: ratchetState.dh_pair.public_key,
    };

    await sessionStore.updateSession(session);

    return session;
  }

  /**
   * Process pre-key message (responder)
   */
  async processPreKeyMessage(
    userId: string,
    senderUserId: string,
    message: PreKeyMessage
  ): Promise<Session> {
    // Get user's identity key pair (would be loaded from storage)
    const identityKeyPair = await keyGenerator.generateIdentityKeyPair();

    // Get signed pre-key pair (would be loaded from storage)
    const signedPreKeyPair = await keyGenerator.generateSignedPreKey(
      { key: identityKeyPair.privateKey },
      message.signed_pre_key_id
    );

    // Get one-time pre-key if used
    let oneTimePreKeyPair = null;
    if (message.pre_key_id) {
      // Would be loaded from storage
      oneTimePreKeyPair = await keyGenerator.generateEphemeralKeyPair();
    }

    // Perform X3DH key agreement
    const x3dhResult = await x3dh.responderAgreement(
      {
        publicKey: identityKeyPair.publicKey,
        privateKey: identityKeyPair.privateKey,
      },
      {
        publicKey: signedPreKeyPair.publicKey!,
        privateKey: signedPreKeyPair.privateKey!,
      },
      oneTimePreKeyPair
        ? {
            publicKey: oneTimePreKeyPair.publicKey,
            privateKey: oneTimePreKeyPair.privateKey,
          }
        : null,
      message.identity_key,
      message.base_key
    );

    // Initialize ratchet as responder
    const dhKeyPair = await keyGenerator.generateEphemeralKeyPair();
    const ratchetState = await doubleRatchet.initializeAsResponder(
      x3dhResult.shared_secret,
      dhKeyPair
    );

    // Create session
    const session = await sessionStore.createSession(
      userId,
      senderUserId,
      1, // Device ID from message
      ratchetState.root_key
    );

    // Update session with ratchet state
    session.sending_chain = {
      chain_key: Buffer.alloc(32), // Will be derived on first send
      message_number: 0,
      public_key: dhKeyPair.publicKey,
    };

    await sessionStore.updateSession(session);

    return session;
  }

  /**
   * Create pre-key message for initial message
   */
  async createPreKeyMessage(
    userId: string,
    recipientUserId: string,
    recipientBundle: PreKeyBundle,
    plaintext: Buffer
  ): Promise<{ message: PreKeyMessage; session: Session }> {
    // Build session
    const session = await this.buildOutgoingSession(
      userId,
      recipientUserId,
      recipientBundle
    );

    // Encrypt first message
    const { sessionCipher } = require('./session-cipher');
    const ciphertextMessage = await sessionCipher.encrypt(
      userId,
      recipientUserId,
      recipientBundle.device_id,
      plaintext
    );

    // Serialize ciphertext message
    const serializedCiphertext =
      messageSerializer.serializeCiphertextMessage(ciphertextMessage);

    // Get user's identity key
    const identityKeyPair = await keyGenerator.generateIdentityKeyPair();

    // Get ephemeral key used in X3DH
    const ephemeralKeyPair = await keyGenerator.generateEphemeralKeyPair();

    // Create pre-key message
    const preKeyMessage = messageSerializer.createPreKeyMessage(
      identityKeyPair.registrationId,
      recipientBundle.pre_key?.id,
      recipientBundle.signed_pre_key.id,
      ephemeralKeyPair.publicKey,
      identityKeyPair.publicKey,
      serializedCiphertext
    );

    return { message: preKeyMessage, session };
  }

  /**
   * Check if session exists
   */
  async hasSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<boolean> {
    return sessionStore.hasSession(userId, recipientId, deviceId);
  }
}

export const sessionBuilder = new SessionBuilder();
