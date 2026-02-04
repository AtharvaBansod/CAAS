import { getSchemaRegistryClient } from './registry-client';
import { getSchemaValidator, ValidationError } from './schema-validator';

export interface SerializationOptions {
  validate?: boolean;
  subject?: string;
  version?: number;
}

export interface DeserializationResult<T = any> {
  data: T;
  schemaId: number;
  subject?: string;
  version?: number;
}

export class MessageSerializer {
  private schemaRegistryClient = getSchemaRegistryClient();
  private schemaValidator = getSchemaValidator();

  /**
   * Serialize message with schema validation and encoding
   */
  public async serialize<T = any>(
    subject: string,
    message: T,
    options: SerializationOptions = {}
  ): Promise<Buffer> {
    const { validate = true, version } = options;

    try {
      // Validate message if requested
      if (validate) {
        await this.schemaValidator.validateOrThrow(subject, message, version);
      }

      // Encode message with schema registry
      const encoded = await this.schemaRegistryClient.encode(subject, message);
      
      return encoded;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new SerializationError(
          `Validation failed for subject ${subject}: ${error.message}`,
          'VALIDATION_ERROR',
          error.validationErrors
        );
      }
      
      throw new SerializationError(
        `Serialization failed for subject ${subject}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SERIALIZATION_ERROR'
      );
    }
  }

  /**
   * Deserialize message with schema resolution
   */
  public async deserialize<T = any>(buffer: Buffer): Promise<DeserializationResult<T>> {
    try {
      // Decode message with schema registry
      const decoded = await this.schemaRegistryClient.decode(buffer);
      
      // Extract schema information from the decoded message
      // Note: The actual schema ID extraction depends on the schema registry client implementation
      const schemaId = this.extractSchemaId(buffer);
      
      return {
        data: decoded as T,
        schemaId,
      };
    } catch (error) {
      throw new DeserializationError(
        `Deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DESERIALIZATION_ERROR'
      );
    }
  }

  /**
   * Serialize message envelope with payload
   */
  public async serializeMessageEnvelope<T = any>(
    envelope: MessageEnvelope<T>,
    payloadSubject: string
  ): Promise<Buffer> {
    // Validate envelope structure
    await this.schemaValidator.validateOrThrow('message-envelope-value', envelope);
    
    // Validate payload if subject is provided
    if (payloadSubject && envelope.payload) {
      await this.schemaValidator.validateOrThrow(payloadSubject, envelope.payload);
    }

    // Serialize the complete envelope
    return await this.serialize('message-envelope-value', envelope);
  }

  /**
   * Deserialize message envelope with typed payload
   */
  public async deserializeMessageEnvelope<T = any>(buffer: Buffer): Promise<DeserializationResult<MessageEnvelope<T>>> {
    return await this.deserialize<MessageEnvelope<T>>(buffer);
  }

  /**
   * Serialize chat message
   */
  public async serializeChatMessage(message: ChatMessagePayload): Promise<Buffer> {
    return await this.serialize('chat-message-value', message);
  }

  /**
   * Deserialize chat message
   */
  public async deserializeChatMessage(buffer: Buffer): Promise<DeserializationResult<ChatMessagePayload>> {
    return await this.deserialize<ChatMessagePayload>(buffer);
  }

  /**
   * Serialize chat event
   */
  public async serializeChatEvent(event: ChatEventPayload): Promise<Buffer> {
    return await this.serialize('chat-event-value', event);
  }

  /**
   * Deserialize chat event
   */
  public async deserializeChatEvent(buffer: Buffer): Promise<DeserializationResult<ChatEventPayload>> {
    return await this.deserialize<ChatEventPayload>(buffer);
  }

  /**
   * Serialize presence update
   */
  public async serializePresenceUpdate(presence: PresenceUpdatePayload): Promise<Buffer> {
    return await this.serialize('presence-update-value', presence);
  }

  /**
   * Deserialize presence update
   */
  public async deserializePresenceUpdate(buffer: Buffer): Promise<DeserializationResult<PresenceUpdatePayload>> {
    return await this.deserialize<PresenceUpdatePayload>(buffer);
  }

  /**
   * Serialize notification
   */
  public async serializeNotification(notification: NotificationPayload): Promise<Buffer> {
    return await this.serialize('notification-value', notification);
  }

  /**
   * Deserialize notification
   */
  public async deserializeNotification(buffer: Buffer): Promise<DeserializationResult<NotificationPayload>> {
    return await this.deserialize<NotificationPayload>(buffer);
  }

  /**
   * Serialize analytics event
   */
  public async serializeAnalyticsEvent(event: AnalyticsEventPayload): Promise<Buffer> {
    return await this.serialize('analytics-event-value', event);
  }

  /**
   * Deserialize analytics event
   */
  public async deserializeAnalyticsEvent(buffer: Buffer): Promise<DeserializationResult<AnalyticsEventPayload>> {
    return await this.deserialize<AnalyticsEventPayload>(buffer);
  }

  /**
   * Serialize audit log
   */
  public async serializeAuditLog(auditLog: AuditLogPayload): Promise<Buffer> {
    return await this.serialize('audit-log-value', auditLog);
  }

  /**
   * Deserialize audit log
   */
  public async deserializeAuditLog(buffer: Buffer): Promise<DeserializationResult<AuditLogPayload>> {
    return await this.deserialize<AuditLogPayload>(buffer);
  }

  /**
   * Extract schema ID from encoded buffer
   * This is a simplified implementation - actual implementation depends on schema registry format
   */
  private extractSchemaId(buffer: Buffer): number {
    // Confluent Schema Registry format: magic byte (0) + schema ID (4 bytes) + data
    if (buffer.length < 5 || buffer[0] !== 0) {
      throw new Error('Invalid schema registry format');
    }
    
    return buffer.readUInt32BE(1);
  }

  /**
   * Get schema information for a buffer
   */
  public async getSchemaInfo(buffer: Buffer): Promise<{
    schemaId: number;
    subject?: string;
    version?: number;
    schema?: string;
  }> {
    try {
      const schemaId = this.extractSchemaId(buffer);
      const schemaInfo = await this.schemaRegistryClient.getSchemaById(schemaId);
      
      return {
        schemaId,
        subject: schemaInfo.subject,
        version: schemaInfo.version,
        schema: schemaInfo.schema,
      };
    } catch (error) {
      throw new DeserializationError(
        `Failed to get schema info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SCHEMA_INFO_ERROR'
      );
    }
  }
}

// Type definitions for payloads
export interface MessageEnvelope<T = any> {
  id: string;
  type: string;
  version: string;
  timestamp: number;
  tenant_id: string;
  source: string;
  correlation_id?: string;
  trace_id?: string;
  payload: T;
  metadata: {
    retry_count?: number;
    original_timestamp?: number;
    user_agent?: string;
    ip_address?: string;
    user_id?: string;
    session_id?: string;
  };
}

export interface ChatMessagePayload {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'reply';
  content: any;
  thread_id?: string;
  edited_at?: number;
  deleted_at?: number;
  reactions?: any[];
  delivery_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at?: number;
}

export interface ChatEventPayload {
  event_id: string;
  event_type: string;
  conversation_id: string;
  user_id: string;
  target_message_id?: string;
  event_data: any;
  expires_at?: number;
  sequence_number?: number;
}

export interface PresenceUpdatePayload {
  user_id: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'invisible';
  custom_status?: any;
  last_seen: number;
  device_info: any;
  activity?: any;
  capabilities?: string[];
  connection_quality?: any;
  privacy_settings?: any;
  session_id?: string;
  heartbeat_interval?: number;
}

export interface NotificationPayload {
  notification_id: string;
  user_id: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  body: string;
  icon?: string;
  image?: string;
  action_data: any;
  actions?: any[];
  delivery_channels: string[];
  delivery_settings?: any;
  scheduled_at?: number;
  expires_at?: number;
  read_at?: number;
  clicked_at?: number;
  dismissed_at?: number;
}

export interface AnalyticsEventPayload {
  event_id: string;
  event_name: string;
  category: string;
  user_id?: string;
  session_id?: string;
  device_info?: any;
  location_info?: any;
  properties: any;
  metrics?: any;
  tags?: string[];
  experiment_info?: any;
  funnel_info?: any;
  cohort_info?: any;
  sampling_rate?: number;
  processed_at?: number;
}

export interface AuditLogPayload {
  audit_id: string;
  event_type: string;
  action: string;
  resource: any;
  actor: any;
  context: any;
  outcome: any;
  changes?: any;
  risk_assessment?: any;
  compliance?: any;
  metadata?: any;
  duration_ms?: number;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  archived?: boolean;
  retention_date?: number;
}

// Error classes
export class SerializationError extends Error {
  public readonly code: string;
  public readonly validationErrors?: string[];

  constructor(message: string, code: string, validationErrors?: string[]) {
    super(message);
    this.name = 'SerializationError';
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

export class DeserializationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'DeserializationError';
    this.code = code;
  }
}

// Export singleton instance
let messageSerializerInstance: MessageSerializer | null = null;

export const getMessageSerializer = (): MessageSerializer => {
  if (!messageSerializerInstance) {
    messageSerializerInstance = new MessageSerializer();
  }
  return messageSerializerInstance;
};