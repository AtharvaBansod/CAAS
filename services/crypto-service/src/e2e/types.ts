/**
 * E2E Encryption Types
 */

export interface MessageContent {
  type: 'text' | 'media' | 'file';
  body?: string;
  media_key?: Buffer;
  thumbnail?: Buffer;
  metadata: Record<string, unknown>;
}

export interface EncryptedMessage {
  type: 'prekey' | 'message';
  sender_device_id: number;
  registration_id: number;
  ciphertext: string; // Base64
  timestamp: number;
}

export type EncryptionMode = 'CLIENT_E2E' | 'SERVER_ASSISTED' | 'TRANSPORT_ONLY';

export interface EncryptionConfig {
  mode: EncryptionMode;
  tenant_id: string;
  enabled: boolean;
}

export interface MultiDeviceMessage {
  recipient_id: string;
  device_messages: Array<{
    device_id: number;
    encrypted_message: EncryptedMessage;
  }>;
}
