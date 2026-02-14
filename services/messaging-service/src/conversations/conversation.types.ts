import { ObjectId } from 'mongodb';

export interface Conversation {
  _id: ObjectId;
  type: 'direct' | 'group' | 'channel';
  tenant_id: string;
  participants: Participant[];
  name?: string | null;
  avatar_url?: string | null;
  settings: ConversationSettings;
  last_message?: MessageSummary | null;
  created_at: Date;
  updated_at: Date;
}

export interface Participant {
  user_id: string;
  role: ParticipantRole;
  joined_at: Date;
  notifications: 'all' | 'mentions' | 'none';
}

export type ParticipantRole = 'admin' | 'member';

export interface ConversationSettings {
  is_muted: boolean;
  // Add other settings as needed
}

export interface MessageSummary {
  message_id: string;
  sender_id: string;
  content: string;
  sent_at: Date;
}

export interface CreateConversationDTO {
  type: 'direct' | 'group' | 'channel';
  participant_ids: string[];
  name?: string | null;
  avatar_url?: string | null;
  initial_message_content?: string | null;
}

export interface UpdateConversationDTO {
  name?: string | null;
  avatar_url?: string | null;
  is_muted?: boolean | null;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  before?: Date;
  after?: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
