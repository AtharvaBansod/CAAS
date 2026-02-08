/**
 * Group Encryption Types
 */

export interface SenderKey {
  chain_id: number;
  chain_key: Buffer;
  signing_key: {
    public_key: Buffer;
    private_key: Buffer;
  };
}

export interface SenderKeyDistribution {
  group_id: string;
  sender_id: string;
  sender_device_id: number;
  chain_id: number;
  chain_key: Buffer;
  signing_key_public: Buffer;
}

export interface SenderKeyRecord {
  group_id: string;
  sender_id: string;
  device_id: number;
  chain_id: number;
  chain_key: Buffer;
  signing_key_public: Buffer;
  message_number: number;
  created_at: Date;
  updated_at: Date;
}

export interface GroupMessage {
  group_id: string;
  sender_id: string;
  device_id: number;
  chain_id: number;
  message_number: number;
  ciphertext: Buffer;
  signature: Buffer;
}
