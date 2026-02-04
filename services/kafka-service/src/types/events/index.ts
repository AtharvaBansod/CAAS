export * from './chat.events';
export * from './conversation.events';
export * from './user.events';

// Re-export all event types for convenience
export type {
  // Chat Events
  MessageSentEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MessageReadEvent,
  MessageDeliveredEvent,
  ReactionAddedEvent,
  ReactionRemovedEvent,
  TypingStartedEvent,
  TypingStoppedEvent,
  
  // Conversation Events
  ConversationCreatedEvent,
  ConversationUpdatedEvent,
  ConversationDeletedEvent,
  ParticipantAddedEvent,
  ParticipantRemovedEvent,
  ParticipantRoleChangedEvent,
  
  // User Events
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserOnlineEvent,
  UserOfflineEvent,
  UserStatusChangedEvent,
  DeviceRegisteredEvent,
  DeviceRemovedEvent,
} from './chat.events';

// Union types for all events
export type ChatEvent = 
  | MessageSentEvent
  | MessageEditedEvent
  | MessageDeletedEvent
  | MessageReadEvent
  | MessageDeliveredEvent
  | ReactionAddedEvent
  | ReactionRemovedEvent
  | TypingStartedEvent
  | TypingStoppedEvent;

export type ConversationEvent = 
  | ConversationCreatedEvent
  | ConversationUpdatedEvent
  | ConversationDeletedEvent
  | ParticipantAddedEvent
  | ParticipantRemovedEvent
  | ParticipantRoleChangedEvent;

export type UserEvent = 
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | UserOnlineEvent
  | UserOfflineEvent
  | UserStatusChangedEvent
  | DeviceRegisteredEvent
  | DeviceRemovedEvent;

export type AllEvents = ChatEvent | ConversationEvent | UserEvent;