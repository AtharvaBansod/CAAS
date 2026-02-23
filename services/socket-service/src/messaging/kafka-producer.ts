import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { EventEmitter } from 'events';

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
      const record: ProducerRecord = {
        topic: this.config.topic,
        messages: [
          {
            key: message.message_id,
            value: JSON.stringify(message),
            headers: {
              tenant_id: message.tenant_id,
              conversation_id: message.conversation_id,
              sender_id: message.sender_id,
              timestamp: message.timestamp.toISOString(),
              correlation_id: message.metadata?.correlation_id || '',
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
      const record: ProducerRecord = {
        topic: this.config.topic,
        messages: messages.map((message) => ({
          key: message.message_id,
          value: JSON.stringify(message),
          headers: {
            tenant_id: message.tenant_id,
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            timestamp: message.timestamp.toISOString(),
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
