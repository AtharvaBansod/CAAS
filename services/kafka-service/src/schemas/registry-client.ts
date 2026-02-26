import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';
import { env } from '../config/environment';

export interface Schema {
  id?: number;
  version?: number;
  schema: string;
  type: SchemaType;
  subject: string;
}

export interface SchemaInfo {
  id: number;
  version: number;
  schema: string;
  subject: string;
  type: SchemaType;
}

export interface CompatibilityResult {
  compatible: boolean;
  messages?: string[];
}

export class SchemaRegistryClient {
  private registry: SchemaRegistry;

  constructor() {
    this.registry = new SchemaRegistry({
      host: env.SCHEMA_REGISTRY_URL,
    });
  }

  /**
   * Register a new schema
   */
  public async registerSchema(subject: string, schema: Schema): Promise<number> {
    try {
      const schemaId = await this.registry.register({
        type: schema.type,
        schema: schema.schema,
      }, { subject });

      console.log(`✅ Schema registered for subject ${subject} with ID: ${schemaId}`);
      return schemaId;
    } catch (error) {
      console.error(`❌ Failed to register schema for subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Get schema by subject and version
   */
  public async getSchema(subject: string, version?: number): Promise<SchemaInfo> {
    try {
      const schemaInfo = await this.registry.getSchema(subject, version);
      
      return {
        id: schemaInfo.id,
        version: schemaInfo.version,
        schema: schemaInfo.schema,
        subject,
        type: schemaInfo.type,
      };
    } catch (error) {
      console.error(`❌ Failed to get schema for subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Get latest schema for subject
   */
  public async getLatestSchema(subject: string): Promise<SchemaInfo> {
    return await this.getSchema(subject);
  }

  /**
   * Get schema by ID
   */
  public async getSchemaById(id: number): Promise<SchemaInfo> {
    try {
      const schemaInfo = await this.registry.getSchemaById(id);
      
      return {
        id,
        version: schemaInfo.version || 0,
        schema: schemaInfo.schema,
        subject: schemaInfo.subject || 'unknown',
        type: schemaInfo.type,
      };
    } catch (error) {
      console.error(`❌ Failed to get schema by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Check schema compatibility
   */
  public async checkCompatibility(subject: string, schema: Schema): Promise<CompatibilityResult> {
    try {
      const result = await this.registry.checkCompatibility(subject, {
        type: schema.type,
        schema: schema.schema,
      });

      return {
        compatible: result.compatible,
        messages: result.messages,
      };
    } catch (error) {
      console.error(`❌ Failed to check compatibility for subject ${subject}:`, error);
      return {
        compatible: false,
        messages: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get all subjects
   */
  public async getSubjects(): Promise<string[]> {
    try {
      return await this.registry.getSubjects();
    } catch (error) {
      console.error('❌ Failed to get subjects:', error);
      throw error;
    }
  }

  /**
   * Get all versions for a subject
   */
  public async getVersions(subject: string): Promise<number[]> {
    try {
      return await this.registry.getVersions(subject);
    } catch (error) {
      console.error(`❌ Failed to get versions for subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Delete schema subject
   */
  public async deleteSchema(subject: string): Promise<void> {
    try {
      await this.registry.deleteSubject(subject);
      console.log(`✅ Deleted schema subject: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to delete schema subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Delete specific schema version
   */
  public async deleteSchemaVersion(subject: string, version: number): Promise<void> {
    try {
      await this.registry.deleteSchemaVersion(subject, version);
      console.log(`✅ Deleted schema version ${version} for subject: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to delete schema version ${version} for subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Set compatibility level for subject
   */
  public async setCompatibility(subject: string, level: 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE'): Promise<void> {
    try {
      await this.registry.updateCompatibility(subject, level);
      console.log(`✅ Set compatibility level ${level} for subject: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to set compatibility for subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Get compatibility level for subject
   */
  public async getCompatibility(subject: string): Promise<string> {
    try {
      const result = await this.registry.getCompatibility(subject);
      return result.compatibility;
    } catch (error) {
      console.error(`❌ Failed to get compatibility for subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Encode message with schema
   */
  public async encode(subject: string, message: any): Promise<Buffer> {
    try {
      return await this.registry.encode(subject, message);
    } catch (error) {
      console.error(`❌ Failed to encode message for subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Decode message with schema
   */
  public async decode(buffer: Buffer): Promise<any> {
    try {
      return await this.registry.decode(buffer);
    } catch (error) {
      console.error('❌ Failed to decode message:', error);
      throw error;
    }
  }

  /**
   * Register all platform schemas
   */
  public async registerPlatformSchemas(): Promise<void> {
    console.log('📝 Registering platform schemas...');

    const schemas = await this.getPlatformSchemas();
    
    for (const [subject, schema] of Object.entries(schemas)) {
      try {
        await this.registerSchema(subject, schema);
      } catch (error) {
        // Schema might already exist, check if it's compatible
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`ℹ️ Schema already exists for subject: ${subject}`);
          
          // Check compatibility
          const compatibility = await this.checkCompatibility(subject, schema);
          if (!compatibility.compatible) {
            console.warn(`⚠️ Schema incompatibility detected for ${subject}:`, compatibility.messages);
          }
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Platform schemas registered');
  }

  /**
   * Get platform schema definitions
   */
  private async getPlatformSchemas(): Promise<Record<string, Schema>> {
    // Import schema definitions
    const { MESSAGE_ENVELOPE_SCHEMA } = await import('./definitions/message-envelope.schema');
    const { CHAT_MESSAGE_SCHEMA } = await import('./definitions/chat-message.schema');
    const { CHAT_EVENT_SCHEMA } = await import('./definitions/chat-event.schema');
    const { PRESENCE_UPDATE_SCHEMA } = await import('./definitions/presence-update.schema');
    const { NOTIFICATION_SCHEMA } = await import('./definitions/notification.schema');
    const { ANALYTICS_EVENT_SCHEMA } = await import('./definitions/analytics-event.schema');
    const { AUDIT_LOG_SCHEMA } = await import('./definitions/audit-log.schema');

    return {
      'message-envelope-value': MESSAGE_ENVELOPE_SCHEMA,
      'chat-message-value': CHAT_MESSAGE_SCHEMA,
      'chat-event-value': CHAT_EVENT_SCHEMA,
      'presence-update-value': PRESENCE_UPDATE_SCHEMA,
      'notification-value': NOTIFICATION_SCHEMA,
      'analytics-event-value': ANALYTICS_EVENT_SCHEMA,
      'audit-log-value': AUDIT_LOG_SCHEMA,
    };
  }
}

// Export singleton instance
let schemaRegistryClientInstance: SchemaRegistryClient | null = null;

export const getSchemaRegistryClient = (): SchemaRegistryClient => {
  if (!schemaRegistryClientInstance) {
    schemaRegistryClientInstance = new SchemaRegistryClient();
  }
  return schemaRegistryClientInstance;
};
