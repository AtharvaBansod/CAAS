import { KafkaMessage } from '../types/message-envelope';
import { EVENT_TYPES } from '../config/constants';
import { getSchemaValidator } from '../schemas/schema-validator';

export interface ParsedEvent<T = any> {
  message: KafkaMessage<T>;
  eventType: string;
  isValid: boolean;
  errors?: string[];
}

export class EventParser {
  private schemaValidator = getSchemaValidator();

  /**
   * Parse and validate a Kafka message
   */
  public async parseEvent<T = any>(message: KafkaMessage<T>): Promise<ParsedEvent<T>> {
    const result: ParsedEvent<T> = {
      message,
      eventType: message.type,
      isValid: false,
    };

    try {
      // Validate envelope structure
      const envelopeValidation = await this.schemaValidator.validateMessageEnvelope(message);
      if (!envelopeValidation.valid) {
        result.errors = envelopeValidation.errors;
        return result;
      }

      // Validate payload based on event type
      const payloadSubject = this.getPayloadSubject(message.type);
      if (payloadSubject) {
        const payloadValidation = await this.schemaValidator.validateBySubject(
          payloadSubject,
          message.payload
        );
        
        if (!payloadValidation.valid) {
          result.errors = payloadValidation.errors;
          return result;
        }
      }

      result.isValid = true;
      return result;
    } catch (error) {
      result.errors = [error instanceof Error ? error.message : 'Unknown parsing error'];
      return result;
    }
  }

  /**
   * Type-safe event parsing with type narrowing
   */
  public async parseTypedEvent<T>(
    message: KafkaMessage<any>,
    expectedType: string
  ): Promise<ParsedEvent<T> | null> {
    if (message.type !== expectedType) {
      return null;
    }

    return await this.parseEvent<T>(message);
  }

  /**
   * Parse chat message event
   */
  public async parseChatMessageEvent(
    message: KafkaMessage<any>
  ): Promise<ParsedEvent<any> | null> {
    const chatMessageTypes = [
      EVENT_TYPES.MESSAGE_SENT,
      EVENT_TYPES.MESSAGE_EDITED,
      EVENT_TYPES.MESSAGE_DELETED,
    ];

    if (!chatMessageTypes.includes(message.type)) {
      return null;
    }

    return await this.parseEvent(message);
  }

  /**
   * Parse chat event (reactions, typing, etc.)
   */
  public async parseChatEvent(
    message: KafkaMessage<any>
  ): Promise<ParsedEvent<any> | null> {
    const chatEventTypes = [
      EVENT_TYPES.REACTION_ADDED,
      EVENT_TYPES.REACTION_REMOVED,
      EVENT_TYPES.TYPING_STARTED,
      EVENT_TYPES.TYPING_STOPPED,
      EVENT_TYPES.MESSAGE_READ,
      EVENT_TYPES.MESSAGE_DELIVERED,
    ];

    if (!chatEventTypes.includes(message.type)) {
      return null;
    }

    return await this.parseEvent(message);
  }

  /**
   * Parse presence event
   */
  public async parsePresenceEvent(
    message: KafkaMessage<any>
  ): Promise<ParsedEvent<any> | null> {
    const presenceEventTypes = [
      EVENT_TYPES.USER_ONLINE,
      EVENT_TYPES.USER_OFFLINE,
      EVENT_TYPES.USER_STATUS_CHANGED,
    ];

    if (!presenceEventTypes.includes(message.type)) {
      return null;
    }

    return await this.parseEvent(message);
  }

  /**
   * Parse user event
   */
  public async parseUserEvent(
    message: KafkaMessage<any>
  ): Promise<ParsedEvent<any> | null> {
    const userEventTypes = [
      EVENT_TYPES.USER_CREATED,
      EVENT_TYPES.USER_UPDATED,
      EVENT_TYPES.USER_DELETED,
      EVENT_TYPES.DEVICE_REGISTERED,
      EVENT_TYPES.DEVICE_REMOVED,
    ];

    if (!userEventTypes.includes(message.type)) {
      return null;
    }

    return await this.parseEvent(message);
  }

  /**
   * Parse conversation event
   */
  public async parseConversationEvent(
    message: KafkaMessage<any>
  ): Promise<ParsedEvent<any> | null> {
    const conversationEventTypes = [
      EVENT_TYPES.CONVERSATION_CREATED,
      EVENT_TYPES.CONVERSATION_UPDATED,
      EVENT_TYPES.CONVERSATION_DELETED,
      EVENT_TYPES.PARTICIPANT_ADDED,
      EVENT_TYPES.PARTICIPANT_REMOVED,
      EVENT_TYPES.PARTICIPANT_ROLE_CHANGED,
    ];

    if (!conversationEventTypes.includes(message.type)) {
      return null;
    }

    return await this.parseEvent(message);
  }

  /**
   * Parse notification event
   */
  public async parseNotificationEvent(
    message: KafkaMessage<any>
  ): Promise<ParsedEvent<any> | null> {
    const notificationEventTypes = [
      EVENT_TYPES.NOTIFICATION_QUEUED,
      EVENT_TYPES.NOTIFICATION_SENT,
      EVENT_TYPES.NOTIFICATION_FAILED,
    ];

    if (!notificationEventTypes.includes(message.type)) {
      return null;
    }

    return await this.parseEvent(message);
  }

  /**
   * Parse analytics event
   */
  public async parseAnalyticsEvent(
    message: KafkaMessage<any>
  ): Promise<ParsedEvent<any> | null> {
    const analyticsEventTypes = [
      EVENT_TYPES.USER_ACTIVITY,
      EVENT_TYPES.FEATURE_USAGE,
      EVENT_TYPES.ERROR_OCCURRED,
    ];

    if (!analyticsEventTypes.includes(message.type)) {
      return null;
    }

    return await this.parseEvent(message);
  }

  /**
   * Extract tenant ID from message
   */
  public extractTenantId(message: KafkaMessage<any>): string {
    return message.tenant_id;
  }

  /**
   * Extract user ID from message (from metadata or payload)
   */
  public extractUserId(message: KafkaMessage<any>): string | null {
    // Try metadata first
    if (message.metadata.user_id) {
      return message.metadata.user_id;
    }

    // Try common payload fields
    const payload = message.payload;
    if (payload) {
      return payload.user_id || payload.sender_id || payload.actor_id || null;
    }

    return null;
  }

  /**
   * Extract conversation ID from message payload
   */
  public extractConversationId(message: KafkaMessage<any>): string | null {
    const payload = message.payload;
    return payload?.conversation_id || null;
  }

  /**
   * Extract message ID from message payload
   */
  public extractMessageId(message: KafkaMessage<any>): string | null {
    const payload = message.payload;
    return payload?.message_id || null;
  }

  /**
   * Check if message is a retry
   */
  public isRetryMessage(message: KafkaMessage<any>): boolean {
    return (message.metadata.retry_count || 0) > 0;
  }

  /**
   * Check if message has expired
   */
  public isExpired(message: KafkaMessage<any>): boolean {
    const payload = message.payload;
    if (payload?.expires_at) {
      return Date.now() > payload.expires_at;
    }
    return false;
  }

  /**
   * Get message age in milliseconds
   */
  public getMessageAge(message: KafkaMessage<any>): number {
    return Date.now() - message.timestamp;
  }

  /**
   * Check if message is from a specific source
   */
  public isFromSource(message: KafkaMessage<any>, source: string): boolean {
    return message.source === source;
  }

  /**
   * Check if message has correlation ID
   */
  public hasCorrelationId(message: KafkaMessage<any>, correlationId: string): boolean {
    return message.correlation_id === correlationId;
  }

  /**
   * Get schema subject for payload validation
   */
  private getPayloadSubject(eventType: string): string | null {
    const subjectMap: Record<string, string> = {
      [EVENT_TYPES.MESSAGE_SENT]: 'chat-message-value',
      [EVENT_TYPES.MESSAGE_EDITED]: 'chat-message-value',
      [EVENT_TYPES.MESSAGE_DELETED]: 'chat-message-value',
      [EVENT_TYPES.REACTION_ADDED]: 'chat-event-value',
      [EVENT_TYPES.REACTION_REMOVED]: 'chat-event-value',
      [EVENT_TYPES.TYPING_STARTED]: 'chat-event-value',
      [EVENT_TYPES.TYPING_STOPPED]: 'chat-event-value',
      [EVENT_TYPES.MESSAGE_READ]: 'chat-event-value',
      [EVENT_TYPES.MESSAGE_DELIVERED]: 'chat-event-value',
      [EVENT_TYPES.USER_ONLINE]: 'presence-update-value',
      [EVENT_TYPES.USER_OFFLINE]: 'presence-update-value',
      [EVENT_TYPES.USER_STATUS_CHANGED]: 'presence-update-value',
      [EVENT_TYPES.NOTIFICATION_QUEUED]: 'notification-value',
      [EVENT_TYPES.NOTIFICATION_SENT]: 'notification-value',
      [EVENT_TYPES.NOTIFICATION_FAILED]: 'notification-value',
      [EVENT_TYPES.USER_ACTIVITY]: 'analytics-event-value',
      [EVENT_TYPES.FEATURE_USAGE]: 'analytics-event-value',
      [EVENT_TYPES.ERROR_OCCURRED]: 'analytics-event-value',
    };

    return subjectMap[eventType] || null;
  }

  /**
   * Batch parse multiple events
   */
  public async parseEvents<T = any>(
    messages: KafkaMessage<any>[]
  ): Promise<ParsedEvent<T>[]> {
    const parsePromises = messages.map(message => this.parseEvent<T>(message));
    return await Promise.all(parsePromises);
  }

  /**
   * Filter events by type
   */
  public filterEventsByType<T = any>(
    events: ParsedEvent<T>[],
    eventType: string
  ): ParsedEvent<T>[] {
    return events.filter(event => event.eventType === eventType);
  }

  /**
   * Filter valid events only
   */
  public filterValidEvents<T = any>(events: ParsedEvent<T>[]): ParsedEvent<T>[] {
    return events.filter(event => event.isValid);
  }

  /**
   * Group events by type
   */
  public groupEventsByType<T = any>(
    events: ParsedEvent<T>[]
  ): Record<string, ParsedEvent<T>[]> {
    return events.reduce((groups, event) => {
      const type = event.eventType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(event);
      return groups;
    }, {} as Record<string, ParsedEvent<T>[]>);
  }
}

// Export singleton instance
let eventParserInstance: EventParser | null = null;

export const getEventParser = (): EventParser => {
  if (!eventParserInstance) {
    eventParserInstance = new EventParser();
  }
  return eventParserInstance;
};
