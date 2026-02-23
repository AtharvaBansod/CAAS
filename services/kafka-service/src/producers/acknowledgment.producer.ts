/**
 * Acknowledgment Producer
 * Publishes message.delivered events after successful persistence
 */

import { Kafka, Producer, ProducerRecord } from 'kafkajs';

interface AcknowledgmentEvent {
  message_id: string;
  temp_id?: string;
  conversation_id: string;
  tenant_id: string;
  status: 'delivered' | 'failed';
  timestamp: string;
  error?: string;
}

interface AcknowledgmentProducerConfig {
  kafka: Kafka;
  clientId: string;
  topic: string;
}

export class AcknowledgmentProducer {
  private producer: Producer;
  private config: AcknowledgmentProducerConfig;
  private connected: boolean = false;

  constructor(config: AcknowledgmentProducerConfig) {
    this.config = config;
    this.producer = config.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 1,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.connected = true;
      console.log('[AcknowledgmentProducer] Connected to Kafka');
    } catch (error) {
      console.error('[AcknowledgmentProducer] Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.connected = false;
      console.log('[AcknowledgmentProducer] Disconnected from Kafka');
    } catch (error) {
      console.error('[AcknowledgmentProducer] Failed to disconnect:', error);
      throw error;
    }
  }

  async publishDelivered(
    messageId: string,
    conversationId: string,
    tenantId: string,
    tempId?: string
  ): Promise<void> {
    if (!this.connected) {
      console.warn('[AcknowledgmentProducer] Not connected, skipping acknowledgment');
      return;
    }

    const event: AcknowledgmentEvent = {
      message_id: messageId,
      temp_id: tempId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      status: 'delivered',
      timestamp: new Date().toISOString(),
    };

    try {
      const record: ProducerRecord = {
        topic: this.config.topic,
        messages: [
          {
            key: messageId,
            value: JSON.stringify(event),
            headers: {
              tenant_id: tenantId,
              conversation_id: conversationId,
            },
          },
        ],
      };

      await this.producer.send(record);
    } catch (error) {
      console.error('[AcknowledgmentProducer] Failed to publish delivered event:', error);
    }
  }

  async publishFailed(
    messageId: string,
    conversationId: string,
    tenantId: string,
    error: string,
    tempId?: string
  ): Promise<void> {
    if (!this.connected) {
      console.warn('[AcknowledgmentProducer] Not connected, skipping acknowledgment');
      return;
    }

    const event: AcknowledgmentEvent = {
      message_id: messageId,
      temp_id: tempId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      status: 'failed',
      timestamp: new Date().toISOString(),
      error,
    };

    try {
      const record: ProducerRecord = {
        topic: this.config.topic,
        messages: [
          {
            key: messageId,
            value: JSON.stringify(event),
            headers: {
              tenant_id: tenantId,
              conversation_id: conversationId,
            },
          },
        ],
      };

      await this.producer.send(record);
    } catch (error) {
      console.error('[AcknowledgmentProducer] Failed to publish failed event:', error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
