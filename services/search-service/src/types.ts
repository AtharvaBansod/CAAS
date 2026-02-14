export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  type: 'text' | 'media' | 'system' | 'card' | 'location' | 'contact' | 'poll';
  content: any;
  mentions?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  type: '1:1' | 'group';
  name?: string;
  participant_ids: string[];
  created_at: Date;
  last_message_at?: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface MessageSearchParams {
  tenantId: string;
  userId: string;
  query?: string;
  conversationId?: string;
  senderId?: string;
  from?: string;
  to?: string;
  type?: string;
  offset?: number;
  limit?: number;
  sort?: any[];
}

export interface GlobalSearchParams {
  tenantId: string;
  userId: string;
  query: string;
}

export interface SearchResult<T> {
  hits: T[];
  total: number;
  took: number;
}

export interface MessageHit extends Message {
  highlights?: string[];
  score: number;
}

export interface ConversationHit extends Conversation {
  score: number;
}

export interface UserHit extends User {
  score: number;
}

export interface UserSuggestion {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface Suggestion {
  text: string;
  score: number;
}
