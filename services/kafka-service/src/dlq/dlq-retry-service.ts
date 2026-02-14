/**
 * DLQ Retry Service
 * 
 * Handles retry logic for failed messages with exponential backoff
 */

import { Kafka, Producer } from 'kafkajs';
import { dlqProcessor, DLQMessage } from './dlq-processor';

export class DLQRetryService {
  private kafka?: Kafka;
  private producer?: Producer;
  private retryDelayMs: number;
  private maxRetries: number;
  private isRunning: boolean = false;

  constructor(options: { retryDelayMs?: number; maxRetries?: number } = {}) {
    this.retryDelayMs = options.retryDelayMs || 60000; // 1 minute default
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Set Kafka client
   */
  setKafka(kafka: Kafka): void {
    this.kafka = kafka;
  }

  /**
   * Start retry service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('DLQ retry service already running');
      return;
    }

    if (!this.kafka) {
      throw new Error('Kafka client not configured');
    }

    this.producer = this.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
      transactionalId: 'dlq-retry-producer',
    });

    await this.producer.connect();

    this.isRunning = true;
    console.log('DLQ retry service started');

    // Start retry loop
    this.retryLoop();
  }

  /**
   * Stop retry service
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.producer) {
      await this.producer.disconnect();
    }

    console.log('DLQ retry service stopped');
  }

  /**
   * Retry loop - continuously processes pending messages
   */
  private async retryLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processPendingMessages();
      } catch (error) {
        console.error('Error in retry loop:', error);
      }

      // Wait before next iteration
      await this.sleep(this.retryDelayMs);
    }
  }

  /**
   * Process pending DLQ messages
   */
  private async processPendingMessages(): Promise<void> {
    const messages = await dlqProcessor.getPendingMessages(100);

    if (messages.length === 0) {
      return;
    }

    console.log(`Processing ${messages.length} pending DLQ messages`);

    for (const message of messages) {
      await this.retryMessage(message);
    }
  }

  /**
   * Retry a single message
   */
  async retryMessage(dlqMessage: DLQMessage): Promise<void> {
    try {
      // Check if max retries exceeded
      if (dlqMessage.retry_count >= this.maxRetries) {
        console.log(`Max retries exceeded for message ${dlqMessage.dlq_id}`);
        await dlqProcessor.markFailed(dlqMessage.dlq_id);
        return;
      }

      // Calculate exponential backoff delay
      const backoffDelay = this.calculateBackoff(dlqMessage.retry_count);
      const timeSinceFailure = Date.now() - dlqMessage.failed_at.getTime();

      if (timeSinceFailure < backoffDelay) {
        // Not ready to retry yet
        return;
      }

      // Update status to retrying
      await dlqProcessor.updateStatus(
        dlqMessage.dlq_id,
        'retrying',
        dlqMessage.retry_count + 1
      );

      // Determine retry topic
      const retryTopic = this.getRetryTopic(dlqMessage.retry_count);

      // Send to retry topic
      if (!this.producer) {
        throw new Error('Producer not initialized');
      }

      await this.producer.send({
        topic: retryTopic,
        messages: [
          {
            key: dlqMessage.message.message_id || null,
            value: JSON.stringify(dlqMessage.message),
            headers: {
              'x-retry-count': String(dlqMessage.retry_count + 1),
              'x-original-topic': dlqMessage.original_topic,
              'x-dlq-id': dlqMessage.dlq_id,
            },
          },
        ],
      });

      console.log(
        `Retried message ${dlqMessage.dlq_id} (attempt ${dlqMessage.retry_count + 1})`
      );
    } catch (error) {
      console.error(`Failed to retry message ${dlqMessage.dlq_id}:`, error);
      
      // If retry fails, increment retry count
      await dlqProcessor.updateStatus(
        dlqMessage.dlq_id,
        'pending',
        dlqMessage.retry_count + 1
      );
    }
  }

  /**
   * Manually reprocess a message
   */
  async reprocessMessage(dlqId: string): Promise<void> {
    const collection = dlqProcessor['getCollection']();
    const dlqMessage = await collection.findOne({ dlq_id: dlqId } as any);

    if (!dlqMessage) {
      throw new Error(`DLQ message ${dlqId} not found`);
    }

    // Reset retry count and retry
    await dlqProcessor.updateStatus(dlqId, 'pending', 0);
    await this.retryMessage(dlqMessage);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(retryCount: number): number {
    // Exponential backoff: 1min, 2min, 4min, 8min, etc.
    return this.retryDelayMs * Math.pow(2, retryCount);
  }

  /**
   * Get retry topic based on retry count
   */
  private getRetryTopic(retryCount: number): string {
    return `retry.${retryCount + 1}`;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics
   */
  async getStatistics(): Promise<any> {
    return dlqProcessor.getStatistics();
  }
}

// Singleton instance
export const dlqRetryService = new DLQRetryService();
