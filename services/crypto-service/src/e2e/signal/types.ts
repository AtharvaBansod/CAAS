/**
 * Signal Protocol Types
 */

export interface Session {
  session_id: string;
  user_id: string;
  recipient_id: string;
  device_id: number;
  root_key: Buffer;
  sending_chain: ChainState;
  receiving_chains: Map<string, ChainState>;
  previous_counter: number;
  created_at: Date;
  updated_at: Date;
}

export interface ChainState {
  chain_key: Buffer;
  message_number: number;
  public_key?: Buffer;
}

export interface RatchetState {
  dh_pair: {
    public_key: Buffer;
    private_key: Buffer;
  };
  dh_remote_public: Buffer | null;
  root_key: Buffer;
  sending_chain_key: Buffer | null;
  receiving_chain_key: Buffer | null;
  sending_message_number: number;
  receiving_message_number: number;
  previous_sending_chain_length: number;
}

export interface PreKeyMessage {
  version: number;
  registration_id: number;
  pre_key_id?: number;
  signed_pre_key_id: number;
  base_key: Buffer;
  identity_key: Buffer;
  message: Buffer;
}

export interface CiphertextMessage {
  type: 'prekey' | 'message';
  version: number;
  sender_ratchet_key: Buffer;
  message_number: number;
  previous_counter: number;
  ciphertext: Buffer;
}

export interface MessageKeys {
  cipher_key: Buffer;
  mac_key: Buffer;
  iv: Buffer;
}

export interface SkippedMessageKey {
  public_key: Buffer;
  message_number: number;
  message_keys: MessageKeys;
}

export interface X3DHResult {
  shared_secret: Buffer;
  associated_data: Buffer;
}

export interface SessionRecord {
  session_id: string;
  user_id: string;
  recipient_id: string;
  device_id: number;
  session_state: Buffer; // Serialized session
  created_at: Date;
  updated_at: Date;
}
