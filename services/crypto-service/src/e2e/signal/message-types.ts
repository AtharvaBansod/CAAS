/**
 * Signal Protocol Message Types
 * Serialization and deserialization of protocol messages
 */

import { PreKeyMessage, CiphertextMessage } from './types';

export class MessageSerializer {
  private readonly VERSION = 3;

  /**
   * Serialize pre-key message
   */
  serializePreKeyMessage(message: PreKeyMessage): Buffer {
    const parts: Buffer[] = [];

    // Version (1 byte)
    parts.push(Buffer.from([message.version]));

    // Registration ID (4 bytes)
    const regId = Buffer.alloc(4);
    regId.writeUInt32BE(message.registration_id, 0);
    parts.push(regId);

    // Pre-key ID (4 bytes, 0 if not present)
    const preKeyId = Buffer.alloc(4);
    preKeyId.writeUInt32BE(message.pre_key_id || 0, 0);
    parts.push(preKeyId);

    // Signed pre-key ID (4 bytes)
    const signedPreKeyId = Buffer.alloc(4);
    signedPreKeyId.writeUInt32BE(message.signed_pre_key_id, 0);
    parts.push(signedPreKeyId);

    // Base key (32 bytes)
    parts.push(message.base_key);

    // Identity key (32 bytes)
    parts.push(message.identity_key);

    // Message length (4 bytes)
    const msgLen = Buffer.alloc(4);
    msgLen.writeUInt32BE(message.message.length, 0);
    parts.push(msgLen);

    // Message
    parts.push(message.message);

    return Buffer.concat(parts);
  }

  /**
   * Deserialize pre-key message
   */
  deserializePreKeyMessage(data: Buffer): PreKeyMessage {
    let offset = 0;

    // Version
    const version = data.readUInt8(offset);
    offset += 1;

    // Registration ID
    const registration_id = data.readUInt32BE(offset);
    offset += 4;

    // Pre-key ID
    const pre_key_id = data.readUInt32BE(offset);
    offset += 4;

    // Signed pre-key ID
    const signed_pre_key_id = data.readUInt32BE(offset);
    offset += 4;

    // Base key
    const base_key = data.subarray(offset, offset + 32);
    offset += 32;

    // Identity key
    const identity_key = data.subarray(offset, offset + 32);
    offset += 32;

    // Message length
    const msgLen = data.readUInt32BE(offset);
    offset += 4;

    // Message
    const message = data.subarray(offset, offset + msgLen);

    return {
      version,
      registration_id,
      pre_key_id: pre_key_id === 0 ? undefined : pre_key_id,
      signed_pre_key_id,
      base_key,
      identity_key,
      message,
    };
  }

  /**
   * Serialize ciphertext message
   */
  serializeCiphertextMessage(message: CiphertextMessage): Buffer {
    const parts: Buffer[] = [];

    // Type (1 byte: 0 = message, 1 = prekey)
    parts.push(Buffer.from([message.type === 'prekey' ? 1 : 0]));

    // Version (1 byte)
    parts.push(Buffer.from([message.version]));

    // Sender ratchet key (32 bytes)
    parts.push(message.sender_ratchet_key);

    // Message number (4 bytes)
    const msgNum = Buffer.alloc(4);
    msgNum.writeUInt32BE(message.message_number, 0);
    parts.push(msgNum);

    // Previous counter (4 bytes)
    const prevCounter = Buffer.alloc(4);
    prevCounter.writeUInt32BE(message.previous_counter, 0);
    parts.push(prevCounter);

    // Ciphertext length (4 bytes)
    const ctLen = Buffer.alloc(4);
    ctLen.writeUInt32BE(message.ciphertext.length, 0);
    parts.push(ctLen);

    // Ciphertext
    parts.push(message.ciphertext);

    return Buffer.concat(parts);
  }

  /**
   * Deserialize ciphertext message
   */
  deserializeCiphertextMessage(data: Buffer): CiphertextMessage {
    let offset = 0;

    // Type
    const typeNum = data.readUInt8(offset);
    const type = typeNum === 1 ? 'prekey' : 'message';
    offset += 1;

    // Version
    const version = data.readUInt8(offset);
    offset += 1;

    // Sender ratchet key
    const sender_ratchet_key = data.subarray(offset, offset + 32);
    offset += 32;

    // Message number
    const message_number = data.readUInt32BE(offset);
    offset += 4;

    // Previous counter
    const previous_counter = data.readUInt32BE(offset);
    offset += 4;

    // Ciphertext length
    const ctLen = data.readUInt32BE(offset);
    offset += 4;

    // Ciphertext
    const ciphertext = data.subarray(offset, offset + ctLen);

    return {
      type,
      version,
      sender_ratchet_key,
      message_number,
      previous_counter,
      ciphertext,
    };
  }

  /**
   * Create pre-key message
   */
  createPreKeyMessage(
    registrationId: number,
    preKeyId: number | undefined,
    signedPreKeyId: number,
    baseKey: Buffer,
    identityKey: Buffer,
    message: Buffer
  ): PreKeyMessage {
    return {
      version: this.VERSION,
      registration_id: registrationId,
      pre_key_id: preKeyId,
      signed_pre_key_id: signedPreKeyId,
      base_key: baseKey,
      identity_key: identityKey,
      message,
    };
  }

  /**
   * Create ciphertext message
   */
  createCiphertextMessage(
    type: 'prekey' | 'message',
    senderRatchetKey: Buffer,
    messageNumber: number,
    previousCounter: number,
    ciphertext: Buffer
  ): CiphertextMessage {
    return {
      type,
      version: this.VERSION,
      sender_ratchet_key: senderRatchetKey,
      message_number: messageNumber,
      previous_counter: previousCounter,
      ciphertext,
    };
  }

  /**
   * Encode message for transmission (base64)
   */
  encodeForTransmission(message: Buffer): string {
    return message.toString('base64');
  }

  /**
   * Decode message from transmission
   */
  decodeFromTransmission(encoded: string): Buffer {
    return Buffer.from(encoded, 'base64');
  }
}

export const messageSerializer = new MessageSerializer();
