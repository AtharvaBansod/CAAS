// Message types and interfaces for the messaging service

export enum MessageType {
  TEXT = 'text',
  MEDIA = 'media',
  SYSTEM = 'system',
  RICH = 'rich',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export interface Message {
  _id: string;
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  type: MessageType;
  content: MessageContent;
  reply_to?: string;
  forwarded_from?: string;
  mentions: string[];
  status: MessageStatus;
  edited: boolean;
  edited_at?: Date;
  deleted: boolean;
  deleted_at?: Date;
  thread_count?: number;
  thread_participants?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface MessageContent {
  text?: string;
  media?: MediaAttachment[];
  system?: SystemMessageData;
  rich?: RichContent;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnail_url?: string;
  filename: string;
  size: number;
  mime_type: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  is_voice_message?: boolean;
  waveform?: number[];
}

export interface SystemMessageData {
  type: SystemMessageType;
  data: Record<string, any>;
}

export enum SystemMessageType {
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  MEMBER_REMOVED = 'member_removed',
  GROUP_CREATED = 'group_created',
  GROUP_NAME_CHANGED = 'group_name_changed',
  GROUP_AVATAR_CHANGED = 'group_avatar_changed',
  CALL_STARTED = 'call_started',
  CALL_ENDED = 'call_ended',
  CALL_MISSED = 'call_missed',
  ENCRYPTION_CHANGED = 'encryption_changed',
}

export interface RichContent {
  type: 'card' | 'carousel' | 'location' | 'contact' | 'poll';
  data: CardData | CarouselData | LocationData | ContactData | PollData;
}

export interface CardData {
  title: string;
  subtitle?: string;
  image_url?: string;
  buttons?: Button[];
}

export interface Button {
  type: 'url' | 'action' | 'reply';
  label: string;
  value: string;
}

export interface CarouselData {
  cards: CardData[];
}

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  live?: {
    duration: number;
    expires_at: Date;
  };
}

export interface ContactData {
  name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allows_multiple: boolean;
  anonymous: boolean;
  closes_at?: Date;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters?: string[];
}

export interface CreateMessageDto {
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  type: MessageType;
  content: MessageContent;
  reply_to?: string;
  forwarded_from?: string;
}

export interface SendMessageDto {
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  type: MessageType;
  content: MessageContent;
  reply_to?: string;
  forwarded_from?: string;
  media?: string[];
}

export interface MessageQueryOptions {
  before?: string;
  after?: string;
  limit?: number;
  include_deleted?: boolean;
}

export interface MessageListResponse {
  messages: Message[];
  cursor: {
    before?: string;
    after?: string;
  };
  has_more: boolean;
}

export interface ProcessedText {
  original: string;
  formatted: string;
  mentions: Mention[];
  links: LinkPreview[];
  hashtags: string[];
}

export interface Mention {
  user_id: string;
  username: string;
  start: number;
  length: number;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name?: string;
}

export interface Reaction {
  _id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: Date;
}

export interface ReactionSummary {
  [emoji: string]: {
    count: number;
    users: string[];
    user_reacted: boolean;
  };
}

export interface EditHistory {
  _id: string;
  message_id: string;
  previous_content: MessageContent;
  edited_at: Date;
}

export interface ForwardInfo {
  forwarded_from: string;
  original_sender_id: string;
  original_conversation_id: string;
  forward_count: number;
}
