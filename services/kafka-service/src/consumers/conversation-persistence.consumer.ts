/**
 * Conversation Persistence Consumer
 * Handles conversation.updated events from Kafka
 */

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { MongoClient } from 'mongodb';
import { Redis } from 'ioredis';

interface ConversationUpdateEvent {
  conversation_id: string;
  tenant_id: string;
  update_type: 'created' | 'participant_added' | 'participant_removed' | 'settings_changed';
  metadata: Record<string, any>;
  timestamp: string;
}

interface ConversationPersistenceConfig {
  kafka: Kafka;
  groupId: string;
  topic: string;
  mongoClient: MongoClient;
  redis: Redis;
}

export class ConversationPersistenceConsumer {
  private consumer: Consumer;
  private config: ConversationPersistenceConfig;
  private running: boolean = false;

  constructor(config: ConversationPersistenceConfig) {
    this.config = config;
    this.consumer = config.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: this.config.topic,
        fromBeginning: false,
      });

      this.running = true;

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      console.log('[ConversationPersistenceConsumer] Started successfully');
    } catch (error) {
      console.error('[ConversationPersistenceConsumer] Failed to start:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.consumer.disconnect();
    console.log('[ConversationPersistenceConsumer] Stopped');
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    try {
      const event: ConversationUpdateEvent = JSON.parse(
        message.value?.toString() || '{}'
      );

      // Update conversation in MongoDB
      await this.updateConversation(event);

      // Invalidate Redis cache
      await this.invalidateCache(event.conversation_id, event.tenant_id);

      console.log(
        `[ConversationPersistenceConsumer] Processed ${event.update_type} for conversation ${event.conversation_id}`
      );
    } catch (error) {
      console.error('[ConversationPersistenceConsumer] Error handling message:', error);
    }
  }

  private async updateConversation(event: ConversationUpdateEvent): Promise<void> {
    const collection = this.config.mongoClient
      .db('caas_platform')
      .collection('conversations');

    const updates: any = {
      updated_at: new Date(event.timestamp),
    };

    // Apply specific updates based on event type
    switch (event.update_type) {
      case 'created':
        // Conversation already created, just update metadata
        if (event.metadata) {
          updates.metadata = event.metadata;
        }
        break;

      case 'participant_added':
        if (event.metadata.user_id) {
          updates.$addToSet = {
            participants: event.metadata.user_id,
          };
        }
        break;

      case 'participant_removed':
        if (event.metadata.user_id) {
          updates.$pull = {
            participants: event.metadata.user_id,
          };
        }
        break;

      case 'settings_changed':
        if (event.metadata.settings) {
          updates['metadata.settings'] = event.metadata.settings;
        }
        break;
    }

    await collection.updateOne(
      {
        conversation_id: event.conversation_id,
        tenant_id: event.tenant_id,
      },
      {
        $set: updates,
      }
    );
  }

  private async invalidateCache(conversationId: string, tenantId: string): Promise<void> {
    const cacheKey = `conv:${tenantId}:${conversationId}`;
    await this.config.redis.del(cacheKey);
  }

  isRunning(): boolean {
    return this.running;
  }
}
