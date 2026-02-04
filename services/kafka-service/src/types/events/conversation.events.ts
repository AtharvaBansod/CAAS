// Conversation Events
export interface ConversationCreatedEvent {
  conversation_id: string;
  type: 'direct' | 'group' | 'channel';
  name?: string;
  description?: string;
  created_by: string;
  participants: ConversationParticipant[];
  settings: ConversationSettings;
  created_at: number;
}

export interface ConversationUpdatedEvent {
  conversation_id: string;
  updated_by: string;
  updated_at: number;
  changes: ConversationChanges;
}

export interface ConversationDeletedEvent {
  conversation_id: string;
  deleted_by: string;
  deleted_at: number;
  reason?: string;
}

// Participant Events
export interface ParticipantAddedEvent {
  conversation_id: string;
  participant: ConversationParticipant;
  added_by: string;
  added_at: number;
  invitation_message?: string;
}

export interface ParticipantRemovedEvent {
  conversation_id: string;
  participant_id: string;
  removed_by: string;
  removed_at: number;
  reason?: string;
}

export interface ParticipantRoleChangedEvent {
  conversation_id: string;
  participant_id: string;
  old_role: ParticipantRole;
  new_role: ParticipantRole;
  changed_by: string;
  changed_at: number;
}

// Supporting Types
export interface ConversationParticipant {
  user_id: string;
  role: ParticipantRole;
  joined_at: number;
  invited_by?: string;
  permissions?: string[];
}

export type ParticipantRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

export interface ConversationSettings {
  is_public: boolean;
  allow_invites: boolean;
  message_retention_days?: number;
  max_participants?: number;
  require_approval: boolean;
  mute_notifications: boolean;
  encryption_enabled: boolean;
}

export interface ConversationChanges {
  name?: {
    old_value: string;
    new_value: string;
  };
  description?: {
    old_value: string;
    new_value: string;
  };
  avatar?: {
    old_value: string;
    new_value: string;
  };
  settings?: {
    field: keyof ConversationSettings;
    old_value: any;
    new_value: any;
  }[];
}