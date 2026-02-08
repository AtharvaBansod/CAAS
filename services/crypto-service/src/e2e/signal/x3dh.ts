/**
 * X3DH (Extended Triple Diffie-Hellman) Key Agreement
 * Initial key agreement for Signal Protocol
 */

import { x25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { PreKeyBundle } from '../../distribution/types';
import { X3DHResult } from './types';

export class X3DH {
  /**
   * Perform X3DH as initiator (Alice)
   */
  async initiatorAgreement(
    identityKeyPair: { publicKey: Buffer; privateKey: Buffer },
    ephemeralKeyPair: { publicKey: Buffer; privateKey: Buffer },
    recipientBundle: PreKeyBundle
  ): Promise<X3DHResult> {
    // DH1 = DH(IKa, SPKb)
    const dh1 = x25519.getSharedSecret(
      identityKeyPair.privateKey,
      recipientBundle.signed_pre_key.public_key
    );

    // DH2 = DH(EKa, IKb)
    const dh2 = x25519.getSharedSecret(
      ephemeralKeyPair.privateKey,
      recipientBundle.identity_key
    );

    // DH3 = DH(EKa, SPKb)
    const dh3 = x25519.getSharedSecret(
      ephemeralKeyPair.privateKey,
      recipientBundle.signed_pre_key.public_key
    );

    // DH4 = DH(EKa, OPKb) - if one-time pre-key available
    let dh4: Uint8Array | null = null;
    if (recipientBundle.pre_key) {
      dh4 = x25519.getSharedSecret(
        ephemeralKeyPair.privateKey,
        recipientBundle.pre_key.public_key
      );
    }

    // Concatenate DH outputs
    const dhOutputs = dh4
      ? Buffer.concat([
          Buffer.from(dh1),
          Buffer.from(dh2),
          Buffer.from(dh3),
          Buffer.from(dh4),
        ])
      : Buffer.concat([
          Buffer.from(dh1),
          Buffer.from(dh2),
          Buffer.from(dh3),
        ]);

    // Derive shared secret using HKDF
    const salt = Buffer.alloc(32, 0); // 32 zero bytes
    const info = Buffer.from('X3DH');
    const sharedSecret = Buffer.from(
      hkdf(sha256, dhOutputs, salt, info, 32)
    );

    // Associated data for authentication
    const associatedData = Buffer.concat([
      identityKeyPair.publicKey,
      recipientBundle.identity_key,
    ]);

    return {
      shared_secret: sharedSecret,
      associated_data: associatedData,
    };
  }

  /**
   * Perform X3DH as responder (Bob)
   */
  async responderAgreement(
    identityKeyPair: { publicKey: Buffer; privateKey: Buffer },
    signedPreKeyPair: { publicKey: Buffer; privateKey: Buffer },
    oneTimePreKeyPair: { publicKey: Buffer; privateKey: Buffer } | null,
    initiatorIdentityKey: Buffer,
    initiatorEphemeralKey: Buffer
  ): Promise<X3DHResult> {
    // DH1 = DH(SPKb, IKa)
    const dh1 = x25519.getSharedSecret(
      signedPreKeyPair.privateKey,
      initiatorIdentityKey
    );

    // DH2 = DH(IKb, EKa)
    const dh2 = x25519.getSharedSecret(
      identityKeyPair.privateKey,
      initiatorEphemeralKey
    );

    // DH3 = DH(SPKb, EKa)
    const dh3 = x25519.getSharedSecret(
      signedPreKeyPair.privateKey,
      initiatorEphemeralKey
    );

    // DH4 = DH(OPKb, EKa) - if one-time pre-key was used
    let dh4: Uint8Array | null = null;
    if (oneTimePreKeyPair) {
      dh4 = x25519.getSharedSecret(
        oneTimePreKeyPair.privateKey,
        initiatorEphemeralKey
      );
    }

    // Concatenate DH outputs
    const dhOutputs = dh4
      ? Buffer.concat([
          Buffer.from(dh1),
          Buffer.from(dh2),
          Buffer.from(dh3),
          Buffer.from(dh4),
        ])
      : Buffer.concat([
          Buffer.from(dh1),
          Buffer.from(dh2),
          Buffer.from(dh3),
        ]);

    // Derive shared secret using HKDF
    const salt = Buffer.alloc(32, 0);
    const info = Buffer.from('X3DH');
    const sharedSecret = Buffer.from(
      hkdf(sha256, dhOutputs, salt, info, 32)
    );

    // Associated data
    const associatedData = Buffer.concat([
      initiatorIdentityKey,
      identityKeyPair.publicKey,
    ]);

    return {
      shared_secret: sharedSecret,
      associated_data: associatedData,
    };
  }

  /**
   * Verify signed pre-key signature
   */
  async verifySignedPreKey(
    signedPreKeyPublic: Buffer,
    signature: Buffer,
    identityKey: Buffer
  ): Promise<boolean> {
    const { ed25519 } = require('@noble/curves/ed25519');
    
    try {
      return ed25519.verify(signature, signedPreKeyPublic, identityKey);
    } catch (error) {
      return false;
    }
  }
}

export const x3dh = new X3DH();
