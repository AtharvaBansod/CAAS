import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { MongoBulkWriteError } from 'mongodb';
import { MessageRepository } from '../persistence/message-repository';
import { ConversationCache } from '../persistence/conversation-cache';
import { PersistenceNotifier } from '../persistence/persistence-notifier';
import { isRealtimeEnvelope, RealtimeEnvelope } from '@caas/realtime-contracts';
import { RealtimeDlqPublisher } from '../runtime/realtime-dlq';

interface MessagePersistenceConfig {
  kafka: Kafka;
  groupId: string;
  topic: string;
  batchSize: number;
  flushIntervalMs: number;
  allowedEventTypes: string[];
  messageRepository: MessageRepository;
  conversationCache: ConversationCache;
  persistenceNotifier: PersistenceNotifier;
  dlqPublisher: RealtimeDlqPublisher;
}

interface LegacyMessageEnvelope {
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
  private messageBuffer: RealtimeEnvelope[] = [];
  private flushTimer: NodeJS.Timeout | undefined;
  private readonly supportedEventTypes: Set<string>;

  constructor(config: MessagePersistenceConfig) {
    this.config = config;
    this.supportedEventTypes = new Set(
      config.allowedEventTypes.map((value) => value.trim()).filter(Boolean)
    );
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
      this.flushTimer = setInterval(() => {
        if (this.messageBuffer.length > 0) {
          void this.flushBuffer();
        }
      }, this.config.flushIntervalMs);

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
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    // Flush any buffered messages
    if (this.messageBuffer.length > 0) {
      await this.flushBuffer();
    }

    await this.consumer.disconnect();
    console.log('[MessagePersistenceConsumer] Stopped');
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const startTime = Date.now();
    const rawValue = message.value?.toString() || '';

    try {
      let rawMessage: unknown;
      try {
        rawMessage = JSON.parse(rawValue || '{}');
      } catch (error) {
        console.log('[MessagePersistenceConsumer] Invalid JSON, routing to DLQ');
        try {
          await this.config.dlqPublisher.publish({
            topic,
            partition,
            offset: message.offset,
            reason: 'INVALID_JSON',
            rawValue,
            diagnostics: {
              error: error instanceof Error ? error.message : 'Invalid JSON payload',
            },
          });
        } catch (dlqError) {
          console.error('[MessagePersistenceConsumer] DLQ publish failed for invalid JSON:', dlqError);
        }
        return;
      }

      const messageEnvelope = this.normalizeEnvelope(rawMessage);
      if (!this.supportedEventTypes.has(messageEnvelope.event_type)) {
        console.log(
          `[MessagePersistenceConsumer] Unsupported event type: ${messageEnvelope.event_type}, routing to DLQ`
        );
        try {
          await this.config.dlqPublisher.publish({
            topic,
            partition,
            offset: message.offset,
            reason: 'UNSUPPORTED_EVENT_TYPE',
            rawValue,
            parsedValue: rawMessage,
            eventId: messageEnvelope.event_id,
            correlationId: messageEnvelope.correlation_id,
            diagnostics: {
              event_type: messageEnvelope.event_type,
              supported_event_types: Array.from(this.supportedEventTypes),
            },
          });
          console.log(
            `[MessagePersistenceConsumer] DLQ publish success for event ${messageEnvelope.event_id}`
          );
        } catch (dlqError) {
          console.error(
            `[MessagePersistenceConsumer] DLQ publish failed for event ${messageEnvelope.event_id}:`,
            dlqError
          );
        }
        return;
      }

      // Check for duplicate
      const isDuplicate = await this.config.messageRepository.checkDuplicate(
        messageEnvelope.event_id,
        messageEnvelope.tenant_id
      );

      if (isDuplicate) {
        console.log(
          `[MessagePersistenceConsumer] Skipping duplicate message: ${messageEnvelope.event_id}`
        );
        this.metrics.duplicatesSkipped++;
        
        // Still notify success for idempotency
        await this.config.persistenceNotifier.notifySuccess(
          messageEnvelope.event_id
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

      try {
        const rawMessage = JSON.parse(rawValue || '{}');
        const messageEnvelope = this.normalizeEnvelope(rawMessage);
        await this.config.dlqPublisher.publish({
          topic,
          partition,
          offset: message.offset,
          reason: 'PERSISTENCE_CONSUMER_ERROR',
          rawValue,
          parsedValue: rawMessage,
          eventId: messageEnvelope.event_id,
          correlationId: messageEnvelope.correlation_id,
          diagnostics: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        await this.config.persistenceNotifier.notifyFailure(
          messageEnvelope.event_id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch (parseError) {
        console.error('[MessagePersistenceConsumer] Failed to parse message for error notification');
        await this.config.dlqPublisher.publish({
          topic,
          partition,
          offset: message.offset,
          reason: 'INVALID_ENVELOPE',
          rawValue,
          diagnostics: {
            error: error instanceof Error ? error.message : 'Unknown error',
            parse_error: parseError instanceof Error ? parseError.message : 'Envelope normalization failed',
          },
        });
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
      await this.config.messageRepository.saveMessages(
        messages.map((message) => {
          const payload = this.getPayload(message);
          return {
            message_id: `${payload['message_id'] || message.event_id}`,
            conversation_id: `${payload['conversation_id'] || message.metadata?.conversation_id || ''}`,
            sender_id: `${payload['sender_id'] || message.metadata?.user_id || ''}`,
            tenant_id: message.tenant_id,
            ...(message.project_id ? { project_id: message.project_id } : {}),
            content: this.normalizeContent(payload['content']),
            message_type: `${this.normalizeContent(payload['content']).type || 'text'}`,
            metadata: {
              ...message.metadata,
              event_id: message.event_id,
              correlation_id: message.correlation_id,
              ...(message.project_id ? { project_id: message.project_id } : {}),
              schema_version: message.schema_version,
            },
            created_at: new Date(message.occurred_at),
          };
        })
      );

      // Update conversation last_message_at for each unique conversation
      const conversationUpdates = new Map<string, Date>();
      for (const message of messages) {
        const payload = this.getPayload(message);
        const conversationId = `${payload['conversation_id'] || message.metadata?.conversation_id || ''}`;
        if (!conversationId) {
          continue;
        }
        const key = `${message.tenant_id}:${conversationId}`;
        const existing = conversationUpdates.get(key);
        const occurredAt = new Date(message.occurred_at);
        if (!existing || occurredAt > existing) {
          conversationUpdates.set(key, occurredAt);
        }
      }

      // Update conversations
      for (const [key, timestamp] of conversationUpdates.entries()) {
        const separator = key.indexOf(':');
        if (separator === -1) {
          continue;
        }
        const tenant_id = key.slice(0, separator);
        const conversation_id = key.slice(separator + 1);
        await this.config.messageRepository.updateConversationLastMessage(
          conversation_id,
          tenant_id,
          timestamp
        );

        // Invalidate cache
        await this.config.conversationCache.invalidate(conversation_id, tenant_id);
      }

      // Notify success for all messages (non-fatal, batched, with timeout)
      const notifyPromises = messages.map((message) =>
        Promise.race([
          this.config.persistenceNotifier.notifySuccess(message.event_id).catch((_err: unknown) => {
            console.warn(
              `[MessagePersistenceConsumer] Notify success failed for ${message.event_id} (non-fatal)`,
            );
          }),
          new Promise((resolve) => setTimeout(resolve, 3000)), // 3s timeout
        ])
      );
      await Promise.allSettled(notifyPromises);

      console.log(
        `[MessagePersistenceConsumer] Flushed ${messages.length} messages`
      );
    } catch (error) {
      // Handle MongoBulkWriteError from ordered:false gracefully
      // Some inserts may have succeeded (e.g. duplicate key errors only affect duplicates)
      if (error instanceof MongoBulkWriteError) {
        const insertedCount = error.result?.insertedCount ?? 0;
        const rawErrors = error.writeErrors ?? [];
        const writeErrors = Array.isArray(rawErrors) ? rawErrors : [rawErrors];
        const dupKeyErrors = writeErrors.filter(
          (e: { code?: number }) => e.code === 11000
        );

        if (dupKeyErrors.length === writeErrors.length) {
          // ALL errors are duplicate key - this is expected dedup behavior
          console.log(
            `[MessagePersistenceConsumer] Flushed ${insertedCount} messages (${dupKeyErrors.length} duplicates skipped)`
          );
          this.metrics.duplicatesSkipped += dupKeyErrors.length;

          // Notify success for all (inserted + deduped are both "done")
          const notifyPromises = messages.map((message) =>
            Promise.race([
              this.config.persistenceNotifier.notifySuccess(message.event_id).catch((_err: unknown) => {
                console.warn(
                  `[MessagePersistenceConsumer] Notify success failed for ${message.event_id} (non-fatal)`,
                );
              }),
              new Promise((resolve) => setTimeout(resolve, 3000)),
            ])
          );
          await Promise.allSettled(notifyPromises);
          return; // Don't re-add to buffer
        }
      }

      console.error('[MessagePersistenceConsumer] Error flushing buffer:', error);
      this.metrics.persistenceErrors += messages.length;

      // Notify failure for all messages (best-effort, with timeout)
      const failNotifyPromises = messages.map((message) =>
        Promise.race([
          this.config.persistenceNotifier.notifyFailure(
            message.event_id,
            error instanceof Error ? error.message : 'Bulk persist failed'
          ).catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ])
      );
      await Promise.allSettled(failNotifyPromises);

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

  private normalizeEnvelope(value: unknown): RealtimeEnvelope<any> {
    if (isRealtimeEnvelope(value)) {
      return value;
    }

    const legacy = value as Partial<LegacyMessageEnvelope>;
    if (
      typeof legacy.message_id !== 'string' ||
      typeof legacy.conversation_id !== 'string' ||
      typeof legacy.tenant_id !== 'string' ||
      typeof legacy.sender_id !== 'string' ||
      !legacy.timestamp
    ) {
      throw new Error('Unsupported realtime message envelope');
    }

    return {
      event_id: legacy.message_id,
      event_type: 'message.created',
      schema_version: '1.0.0',
      tenant_id: legacy.tenant_id,
      correlation_id: `${legacy.metadata?.correlation_id || legacy.message_id}`,
      occurred_at: new Date(legacy.timestamp).toISOString(),
      producer_id: 'socket-service',
      partition_key: `${legacy.tenant_id}:${legacy.conversation_id}`,
      payload: {
        message_id: legacy.message_id,
        conversation_id: legacy.conversation_id,
        sender_id: legacy.sender_id,
        content: legacy.content,
        timestamp: new Date(legacy.timestamp).toISOString(),
      },
      metadata: {
        ...legacy.metadata,
        user_id: legacy.sender_id,
        conversation_id: legacy.conversation_id,
        dedupe_key: `${legacy.tenant_id}:${legacy.message_id}`,
      },
    };
  }

  private normalizeContent(content: unknown): { type: string; [key: string]: any } {
    if (content && typeof content === 'object') {
      const normalized = content as Record<string, any>;
      return {
        type: `${normalized['type'] || 'text'}`,
        ...normalized,
      };
    }

    return {
      type: 'text',
      text: typeof content === 'string' ? content : '',
    };
  }

  private getPayload(message: RealtimeEnvelope<any>): Record<string, any> {
    return (message.payload || {}) as Record<string, any>;
  }
}
