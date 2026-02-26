// Chat Message Events
export interface MessageSentEvent {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'reply';
  content: MessageContent;
  thread_id?: string;
  mentions?: UserMention[];
  reply_to?: ReplyInfo;
}

export interface MessageEditedEvent {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  old_content: MessageContent;
  new_content: MessageContent;
  edited_at: number;
}

export interface MessageDeletedEvent {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  deleted_by: string;
  deleted_at: number;
  soft_delete: boolean;
}

export interface MessageReadEvent {
  message_id: string;
  conversation_id: string;
  reader_id: string;
  read_at: number;
}

export interface MessageDeliveredEvent {
  message_id: string;
  conversation_id: string;
  recipient_id: string;
  delivered_at: number;
  delivery_method: 'push' | 'websocket' | 'email' | 'sms';
}

// Reaction Events
export interface ReactionAddedEvent {
  message_id: string;
  conversation_id: string;
  user_id: string;
  emoji: string;
  added_at: number;
}

export interface ReactionRemovedEvent {
  message_id: string;
  conversation_id: string;
  user_id: string;
  emoji: string;
  removed_at: number;
}

// Typing Events
export interface TypingStartedEvent {
  conversation_id: string;
  user_id: string;
  started_at: number;
  expires_at: number;
}

export interface TypingStoppedEvent {
  conversation_id: string;
  user_id: string;
  stopped_at: number;
}

// Supporting Types
export interface MessageContent {
  text?: string;
  media?: MediaContent;
  formatting?: TextFormatting[];
}

export interface MediaContent {
  file_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  url?: string;
  thumbnail_url?: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface TextFormatting {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link';
  offset: number;
  length: number;
  url?: string;
}

export interface UserMention {
  user_id: string;
  display_name: string;
  offset: number;
  length: number;
}

export interface ReplyInfo {
  message_id: string;
  sender_id: string;
  preview: string;
}
