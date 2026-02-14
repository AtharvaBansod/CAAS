import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { MessageRepository } from '../persistence/message-repository';
import { ConversationCache } from '../persistence/conversation-cache';
import { PersistenceNotifier } from '../persistence/persistence-notifier';

interface MessagePersistenceConfig {
  kafka: Kafka;
  groupId: string;
  topic: string;
  batchSize: number;
  messageRepository: MessageRepository;
  conversationCache: ConversationCache;
  persistenceNotifier: PersistenceNotifier;
}

interface MessageEnvelope {
  message_id: string;
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  content: any;
  timestamp: Date;
  metadata: any;
}

interface PersistenceMetrics {
  messagesPersisted: number;
  persistenceErrors: number;
  duplicatesSkipped: number;
  totalLatency: number;
  avgLatency: number;
}

export class MessagePersistenceConsumer {
  private consumer: Consumer;
  private config: MessagePersistenceConfig;
  private running: boolean = false;
  private metrics: PersistenceMetrics = {
    messagesPersisted: 0,
    persistenceErrors: 0,
    duplicatesSkipped: 0,
    totalLatency: 0,
    avgLatency: 0,
  };
  private messageBuffer: MessageEnvelope[] = [];

  constructor(config: MessagePersistenceConfig) {
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

      console.log('[MessagePersistenceConsumer] Started successfully');
    } catch (error) {
      console.error('[MessagePersistenceConsumer] Failed to start:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    
    // Flush any buffered messages
    if (this.messageBuffer.length > 0) {
      await this.flushBuffer();
    }

    await this.consumer.disconnect();
    console.log('[MessagePersistenceConsumer] Stopped');
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message, partition, topic } = payload;
    const startTime = Date.now();

    try {
      const messageEnvelope: MessageEnvelope = JSON.parse(
        message.value?.toString() || '{}'
      );

      // Check for duplicate
      const isDuplicate = await this.config.messageRepository.checkDuplicate(
        messageEnvelope.message_id,
        messageEnvelope.tenant_id
      );

      if (isDuplicate) {
        console.log(
          `[MessagePersistenceConsumer] Skipping duplicate message: ${messageEnvelope.message_id}`
        );
        this.metrics.duplicatesSkipped++;
        
        // Still notify success for idempotency
        await this.config.persistenceNotifier.notifySuccess(
          messageEnvelope.message_id
        );
        
        return;
      }

      // Add to buffer
      this.messageBuffer.push(messageEnvelope);

      // Flush if buffer is full
      if (this.messageBuffer.length >= this.config.batchSize) {
        await this.flushBuffer();
      }

      const latency = Date.now() - startTime;
      this.updateMetrics(latency);
    } catch (error) {
      console.error('[MessagePersistenceConsumer] Error handling message:', error);
      this.metrics.persistenceErrors++;

      // Try to extract message_id for error notification
      try {
        const messageEnvelope: MessageEnvelope = JSON.parse(
          message.value?.toString() || '{}'
        );
        await this.config.persistenceNotifier.notifyFailure(
          messageEnvelope.message_id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch (parseError) {
        console.error('[MessagePersistenceConsumer] Failed to parse message for error notification');
      }
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.messageBuffer.length === 0) {
      return;
    }

    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    try {
      // Bulk persist messages
      await this.config.messageRepository.saveMessages(messages);

      // Update conversation last_message_at for each unique conversation
      const conversationUpdates = new Map<string, Date>();
      for (const message of messages) {
        const key = `${message.tenant_id}:${message.conversation_id}`;
        const existing = conversationUpdates.get(key);
        if (!existing || message.timestamp > existing) {
          conversationUpdates.set(key, message.timestamp);
        }
      }

      // Update conversations
      for (const [key, timestamp] of conversationUpdates.entries()) {
        const [tenant_id, conversation_id] = key.split(':');
        await this.config.messageRepository.updateConversationLastMessage(
          conversation_id,
          tenant_id,
          timestamp
        );

        // Invalidate cache
        await this.config.conversationCache.invalidate(conversation_id, tenant_id);
      }

      // Notify success for all messages
      for (const message of messages) {
        await this.config.persistenceNotifier.notifySuccess(message.message_id);
      }

      console.log(
        `[MessagePersistenceConsumer] Flushed ${messages.length} messages`
      );
    } catch (error) {
      console.error('[MessagePersistenceConsumer] Error flushing buffer:', error);
      this.metrics.persistenceErrors += messages.length;

      // Notify failure for all messages
      for (const message of messages) {
        await this.config.persistenceNotifier.notifyFailure(
          message.message_id,
          error instanceof Error ? error.message : 'Bulk persist failed'
        );
      }

      // Re-add messages to buffer for retry
      this.messageBuffer.unshift(...messages);
    }
  }

  private updateMetrics(latency: number): void {
    this.metrics.messagesPersisted++;
    this.metrics.totalLatency += latency;
    this.metrics.avgLatency = this.metrics.totalLatency / this.metrics.messagesPersisted;
  }

  getMetrics(): PersistenceMetrics {
    return { ...this.metrics };
  }

  isRunning(): boolean {
    return this.running;
  }
}
