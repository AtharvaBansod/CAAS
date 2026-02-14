import { Kafka, Producer } from 'kafkajs';

interface PersistenceEvent {
  message_id: string;
  status: 'success' | 'failure';
  timestamp: Date;
  error?: string;
}

export class PersistenceNotifier {
  private kafka: Kafka;
  private producer: Producer;
  private topic: string;
  private connected: boolean = false;

  constructor(kafka: Kafka, topic: string = 'chat.persistence.events') {
    this.kafka = kafka;
    this.topic = topic;
    this.producer = this.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 1,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.connected = true;
      console.log('[PersistenceNotifier] Connected to Kafka');
    } catch (error) {
      console.error('[PersistenceNotifier] Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.connected = false;
      console.log('[PersistenceNotifier] Disconnected from Kafka');
    } catch (error) {
      console.error('[PersistenceNotifier] Failed to disconnect:', error);
      throw error;
    }
  }

  /**
   * Notify successful persistence
   */
  async notifySuccess(messageId: string): Promise<void> {
    if (!this.connected) {
      console.warn('[PersistenceNotifier] Not connected, skipping notification');
      return;
    }

    const event: PersistenceEvent = {
      message_id: messageId,
      status: 'success',
      timestamp: new Date(),
    };

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            key: messageId,
            value: JSON.stringify(event),
            headers: {
              event_type: 'persistence_success',
            },
          },
        ],
      });
    } catch (error) {
      console.error('[PersistenceNotifier] Failed to notify success:', error);
      // Don't throw - notification failure shouldn't break persistence
    }
  }

  /**
   * Notify failed persistence
   */
  async notifyFailure(messageId: string, error: string): Promise<void> {
    if (!this.connected) {
      console.warn('[PersistenceNotifier] Not connected, skipping notification');
      return;
    }

    const event: PersistenceEvent = {
      message_id: messageId,
      status: 'failure',
      timestamp: new Date(),
      error,
    };

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            key: messageId,
            value: JSON.stringify(event),
            headers: {
              event_type: 'persistence_failure',
            },
          },
        ],
      });
    } catch (notifyError) {
      console.error('[PersistenceNotifier] Failed to notify failure:', notifyError);
      // Don't throw - notification failure shouldn't break persistence
    }
  }

  /**
   * Notify batch persistence result
   */
  async notifyBatch(results: Array<{ messageId: string; success: boolean; error?: string }>): Promise<void> {
    if (!this.connected) {
      console.warn('[PersistenceNotifier] Not connected, skipping notification');
      return;
    }

    try {
      const messages = results.map((result) => {
        const event: PersistenceEvent = {
          message_id: result.messageId,
          status: result.success ? 'success' : 'failure',
          timestamp: new Date(),
          error: result.error,
        };

        return {
          key: result.messageId,
          value: JSON.stringify(event),
          headers: {
            event_type: result.success ? 'persistence_success' : 'persistence_failure',
          },
        };
      });

      await this.producer.send({
        topic: this.topic,
        messages,
      });
    } catch (error) {
      console.error('[PersistenceNotifier] Failed to notify batch:', error);
      // Don't throw - notification failure shouldn't break persistence
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
