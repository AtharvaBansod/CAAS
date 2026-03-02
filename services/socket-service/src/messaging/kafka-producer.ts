import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { EventEmitter } from 'events';
import {
  buildRealtimeEnvelope,
  getRealtimeTopicForEvent,
} from '@caas/realtime-contracts';

interface KafkaProducerConfig {
  brokers: string[];
  clientId: string;
  topic: string;
  retries?: number;
  idempotent?: boolean;
  maxInFlightRequests?: number;
}

interface MessageEnvelope {
  message_id: string;
  conversation_id: string;
  tenant_id: string;
  project_id?: string;
  sender_id: string;
  content: {
    type: 'text' | 'image' | 'file' | 'audio' | 'video';
    text?: string;
    media_url?: string;
    metadata?: Record<string, any>;
  };
  timestamp: Date;
  metadata: {
    socket_id: string;
    client_version?: string;
    device_type?: string;
    correlation_id?: string;
  };
}

interface ProducerMetrics {
  messagesPublished: number;
  publishErrors: number;
  totalLatency: number;
  avgLatency: number;
}

export class SocketMessageProducer extends EventEmitter {
  private kafka: Kafka;
  private producer: Producer;
  private config: KafkaProducerConfig;
  private connected: boolean = false;
  private metrics: ProducerMetrics = {
    messagesPublished: 0,
    publishErrors: 0,
    totalLatency: 0,
    avgLatency: 0,
  };

  constructor(config: KafkaProducerConfig) {
    super();
    this.config = {
      retries: 3,
      idempotent: true,
      maxInFlightRequests: 1,
      ...config,
    };

    this.kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers,
      retry: {
        retries: this.config.retries,
      },
    });

    this.producer = this.kafka.producer({
      idempotent: this.config.idempotent,
      maxInFlightRequests: this.config.maxInFlightRequests,
      transactionalId: `socket-message-producer-${this.config.clientId}`,
    });

    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    this.producer.on('producer.connect', () => {
      console.log('[SocketMessageProducer] Connected to Kafka');
      this.connected = true;
      this.emit('connected');
    });

    this.producer.on('producer.disconnect', () => {
      console.log('[SocketMessageProducer] Disconnected from Kafka');
      this.connected = false;
      this.emit('disconnected');
    });

    this.producer.on('producer.network.request_timeout', (payload) => {
      console.error('[SocketMessageProducer] Request timeout:', payload);
      this.metrics.publishErrors++;
      this.emit('error', new Error('Request timeout'));
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.connected = true;
    } catch (error) {
      console.error('[SocketMessageProducer] Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.connected = false;
    } catch (error) {
      console.error('[SocketMessageProducer] Failed to disconnect:', error);
      throw error;
    }
  }

  async publishMessage(message: MessageEnvelope): Promise<RecordMetadata[]> {
    if (!this.connected) {
      throw new Error('Producer not connected to Kafka');
    }

    const startTime = Date.now();

    try {
      const envelope = buildRealtimeEnvelope({
        eventId: message.message_id,
        eventType: 'message.created',
        tenantId: message.tenant_id,
        projectId: message.project_id,
        correlationId: message.metadata?.correlation_id,
        producerId: this.config.clientId,
        partitionKey: `${message.tenant_id}:${message.conversation_id}`,
        payload: {
          message_id: message.message_id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          content: message.content,
          timestamp: message.timestamp.toISOString(),
        },
        metadata: {
          user_id: message.sender_id,
          conversation_id: message.conversation_id,
          dedupe_key: `${message.tenant_id}:${message.message_id}`,
          socket_id: message.metadata?.socket_id,
          client_version: message.metadata?.client_version,
          device_type: message.metadata?.device_type,
        },
      });

      const record: ProducerRecord = {
        topic: getRealtimeTopicForEvent(envelope.event_type) || this.config.topic,
        messages: [
          {
            key: envelope.partition_key,
            value: JSON.stringify(envelope),
            headers: {
              tenant_id: envelope.tenant_id,
              conversation_id: message.conversation_id,
              sender_id: message.sender_id,
              timestamp: envelope.occurred_at,
              correlation_id: envelope.correlation_id || '',
              event_type: envelope.event_type,
              schema_version: envelope.schema_version,
              source_service: 'socket-service',
            },
          },
        ],
      };

      const metadata = await this.producer.send(record);

      const latency = Date.now() - startTime;
      this.updateMetrics(latency);

      this.emit('message:published', {
        message_id: message.message_id,
        correlation_id: message.metadata?.correlation_id,
        latency,
        metadata,
      });

      return metadata;
    } catch (error) {
      this.metrics.publishErrors++;
      console.error('[SocketMessageProducer] Failed to publish message:', error);
      
      this.emit('message:publish_failed', {
        message_id: message.message_id,
        correlation_id: message.metadata?.correlation_id,
        error,
      });

      throw error;
    }
  }

  async publishBatch(messages: MessageEnvelope[]): Promise<RecordMetadata[]> {
    if (!this.connected) {
      throw new Error('Producer not connected to Kafka');
    }

    const startTime = Date.now();

    try {
      const envelopes = messages.map((message) =>
        buildRealtimeEnvelope({
          eventId: message.message_id,
          eventType: 'message.created',
          tenantId: message.tenant_id,
          projectId: message.project_id,
          correlationId: message.metadata?.correlation_id,
          producerId: this.config.clientId,
          partitionKey: `${message.tenant_id}:${message.conversation_id}`,
          payload: {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            content: message.content,
            timestamp: message.timestamp.toISOString(),
          },
          metadata: {
            user_id: message.sender_id,
            conversation_id: message.conversation_id,
            dedupe_key: `${message.tenant_id}:${message.message_id}`,
          },
        })
      );

      const record: ProducerRecord = {
        topic: getRealtimeTopicForEvent('message.created') || this.config.topic,
        messages: envelopes.map((envelope) => ({
          key: envelope.partition_key,
          value: JSON.stringify(envelope),
          headers: {
            tenant_id: envelope.tenant_id,
            conversation_id: `${envelope.metadata?.conversation_id || ''}`,
            sender_id: `${envelope.metadata?.user_id || ''}`,
            timestamp: envelope.occurred_at,
            correlation_id: envelope.correlation_id,
            event_type: envelope.event_type,
            schema_version: envelope.schema_version,
          },
        })),
      };

      const metadata = await this.producer.send(record);

      const latency = Date.now() - startTime;
      this.updateMetrics(latency, messages.length);

      this.emit('batch:published', {
        count: messages.length,
        latency,
        metadata,
      });

      return metadata;
    } catch (error) {
      this.metrics.publishErrors += messages.length;
      console.error('[SocketMessageProducer] Failed to publish batch:', error);
      
      this.emit('batch:publish_failed', {
        count: messages.length,
        error,
      });

      throw error;
    }
  }

  private updateMetrics(latency: number, count: number = 1): void {
    this.metrics.messagesPublished += count;
    this.metrics.totalLatency += latency;
    this.metrics.avgLatency = this.metrics.totalLatency / this.metrics.messagesPublished;
  }

  getMetrics(): ProducerMetrics {
    return { ...this.metrics };
  }

  isConnected(): boolean {
    return this.connected;
  }
}
