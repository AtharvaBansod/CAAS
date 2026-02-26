import { v7 as uuidv7 } from 'uuid';
import { KafkaMessage, MessageMetadata } from '../types/message-envelope';
import { EVENT_TYPES } from '../config/constants';
import { getSchemaValidator } from '../schemas/schema-validator';

export interface EventBuilderOptions {
  tenantId: string;
  source: string;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  correlationId?: string;
  traceId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
}

export class EventBuilder {
  private schemaValidator = getSchemaValidator();

  /**
   * Create a base message envelope
   */
  public createMessage<T>(
    type: string,
    payload: T,
    options: EventBuilderOptions,
    additionalMetadata: Partial<MessageMetadata> = {}
  ): KafkaMessage<T> {
    const now = Date.now();
    
    const message: KafkaMessage<T> = {
      id: uuidv7(),
      type,
      version: '1.0.0',
      timestamp: now,
      tenant_id: options.tenantId,
      source: options.source,
      correlation_id: options.correlationId,
      trace_id: options.traceId,
      payload,
      metadata: {
        user_id: options.userId,
        session_id: options.sessionId,
        device_id: options.deviceId,
        user_agent: options.userAgent,
        ip_address: options.ipAddress,
        request_id: options.requestId,
        ...additionalMetadata,
      },
    };

    return message;
  }

  /**
   * Create a chat message sent event
   */
  public createMessageSentEvent(
    messageData: {
      message_id: string;
      conversation_id: string;
      sender_id: string;
      message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'reply';
      content: any;
      thread_id?: string;
      mentions?: any[];
      reply_to?: any;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.MESSAGE_SENT,
      messageData,
      options
    );
  }

  /**
   * Create a message edited event
   */
  public createMessageEditedEvent(
    editData: {
      message_id: string;
      conversation_id: string;
      sender_id: string;
      old_content: any;
      new_content: any;
      edited_at: number;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.MESSAGE_EDITED,
      editData,
      options
    );
  }

  /**
   * Create a message deleted event
   */
  public createMessageDeletedEvent(
    deleteData: {
      message_id: string;
      conversation_id: string;
      sender_id: string;
      deleted_by: string;
      deleted_at: number;
      soft_delete: boolean;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.MESSAGE_DELETED,
      deleteData,
      options
    );
  }

  /**
   * Create a reaction added event
   */
  public createReactionAddedEvent(
    reactionData: {
      message_id: string;
      conversation_id: string;
      user_id: string;
      emoji: string;
      added_at: number;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.REACTION_ADDED,
      reactionData,
      options
    );
  }

  /**
   * Create a typing started event
   */
  public createTypingStartedEvent(
    typingData: {
      conversation_id: string;
      user_id: string;
      started_at: number;
      expires_at: number;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.TYPING_STARTED,
      typingData,
      options
    );
  }

  /**
   * Create a typing stopped event
   */
  public createTypingStoppedEvent(
    typingData: {
      conversation_id: string;
      user_id: string;
      stopped_at: number;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.TYPING_STOPPED,
      typingData,
      options
    );
  }

  /**
   * Create a user online event
   */
  public createUserOnlineEvent(
    presenceData: {
      user_id: string;
      device_info: any;
      came_online_at: number;
      last_seen: number;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.USER_ONLINE,
      presenceData,
      options
    );
  }

  /**
   * Create a user offline event
   */
  public createUserOfflineEvent(
    presenceData: {
      user_id: string;
      device_info: any;
      went_offline_at: number;
      last_activity: number;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.USER_OFFLINE,
      presenceData,
      options
    );
  }

  /**
   * Create a conversation created event
   */
  public createConversationCreatedEvent(
    conversationData: {
      conversation_id: string;
      type: 'direct' | 'group' | 'channel';
      name?: string;
      description?: string;
      created_by: string;
      participants: any[];
      settings: any;
      created_at: number;
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.CONVERSATION_CREATED,
      conversationData,
      options
    );
  }

  /**
   * Create a notification event
   */
  public createNotificationEvent(
    notificationData: {
      notification_id: string;
      user_id: string;
      type: string;
      priority: 'low' | 'normal' | 'high' | 'urgent';
      title: string;
      body: string;
      action_data: any;
      delivery_channels: string[];
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.NOTIFICATION_QUEUED,
      notificationData,
      options
    );
  }

  /**
   * Create an analytics event
   */
  public createAnalyticsEvent(
    analyticsData: {
      event_id: string;
      event_name: string;
      category: string;
      properties: any;
      metrics?: any;
      tags?: string[];
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      EVENT_TYPES.USER_ACTIVITY,
      {
        ...analyticsData,
        user_id: options.userId,
        session_id: options.sessionId,
        device_info: options.deviceId ? {
          device_id: options.deviceId,
          user_agent: options.userAgent,
        } : undefined,
      },
      options
    );
  }

  /**
   * Create an audit log event
   */
  public createAuditLogEvent(
    auditData: {
      audit_id: string;
      event_type: string;
      action: string;
      resource: any;
      actor: any;
      outcome: any;
      changes?: any;
      severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    },
    options: EventBuilderOptions
  ): KafkaMessage<any> {
    return this.createMessage(
      'audit.log',
      {
        ...auditData,
        context: {
          session_id: options.sessionId,
          request_id: options.requestId,
          correlation_id: options.correlationId,
          trace_id: options.traceId,
          ip_address: options.ipAddress,
          user_agent: options.userAgent,
        },
      },
      options
    );
  }

  /**
   * Create a retry event (for failed message processing)
   */
  public createRetryEvent<T>(
    originalMessage: KafkaMessage<T>,
    error: Error,
    retryCount: number,
    nextRetryAt: number
  ): KafkaMessage<T> {
    return {
      ...originalMessage,
      id: uuidv7(), // New ID for retry
      metadata: {
        ...originalMessage.metadata,
        retry_count: retryCount,
        original_timestamp: originalMessage.timestamp,
        error_message: error.message,
        next_retry_at: nextRetryAt,
      },
    };
  }

  /**
   * Create a dead letter queue event
   */
  public createDLQEvent<T>(
    originalMessage: KafkaMessage<T>,
    error: Error,
    processingAttempts: number
  ): KafkaMessage<{
    original_message: KafkaMessage<T>;
    error_info: {
      message: string;
      stack?: string;
      code?: string;
    };
    processing_attempts: number;
    failed_at: number;
  }> {
    return this.createMessage(
      'internal.dlq',
      {
        original_message: originalMessage,
        error_info: {
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        },
        processing_attempts: processingAttempts,
        failed_at: Date.now(),
      },
      {
        tenantId: originalMessage.tenant_id,
        source: 'kafka-service',
        correlationId: originalMessage.correlation_id,
        traceId: originalMessage.trace_id,
      }
    );
  }

  /**
   * Validate event payload against schema
   */
  public async validateEvent<T>(message: KafkaMessage<T>): Promise<boolean> {
    try {
      // Validate envelope
      await this.schemaValidator.validateOrThrow('message-envelope-value', message);
      
      // Validate payload based on event type
      const payloadSubject = this.getPayloadSubject(message.type);
      if (payloadSubject) {
        await this.schemaValidator.validateOrThrow(payloadSubject, message.payload);
      }
      
      return true;
    } catch (error) {
      console.error(`Event validation failed for type ${message.type}:`, error);
      return false;
    }
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
      [EVENT_TYPES.USER_ONLINE]: 'presence-update-value',
      [EVENT_TYPES.USER_OFFLINE]: 'presence-update-value',
      [EVENT_TYPES.NOTIFICATION_QUEUED]: 'notification-value',
      [EVENT_TYPES.USER_ACTIVITY]: 'analytics-event-value',
    };

    return subjectMap[eventType] || null;
  }

  /**
   * Create event with automatic validation
   */
  public async createValidatedEvent<T>(
    type: string,
    payload: T,
    options: EventBuilderOptions,
    additionalMetadata: Partial<MessageMetadata> = {}
  ): Promise<KafkaMessage<T>> {
    const message = this.createMessage(type, payload, options, additionalMetadata);
    
    const isValid = await this.validateEvent(message);
    if (!isValid) {
      throw new Error(`Event validation failed for type: ${type}`);
    }
    
    return message;
  }
}

// Export singleton instance
let eventBuilderInstance: EventBuilder | null = null;

export const getEventBuilder = (): EventBuilder => {
  if (!eventBuilderInstance) {
    eventBuilderInstance = new EventBuilder();
  }
  return eventBuilderInstance;
};
