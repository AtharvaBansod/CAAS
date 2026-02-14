/**
 * DLQ Processor
 * 
 * Processes messages from the Dead Letter Queue
 */

import { MongoClient, Collection } from 'mongodb';

export interface DLQMessage {
  dlq_id: string;
  original_topic: string;
  original_partition: number;
  original_offset: number;
  message: any;
  error: {
    type: string;
    message: string;
    stack?: string;
  };
  retry_count: number;
  max_retries: number;
  is_retryable: boolean;
  failed_at: Date;
  last_retry_at?: Date;
  status: 'pending' | 'retrying' | 'failed' | 'resolved';
  tenant_id?: string;
}

export class DLQProcessor {
  private client?: MongoClient;
  private collection?: Collection<DLQMessage>;

  constructor(mongoClient?: MongoClient) {
    this.client = mongoClient;
  }

  /**
   * Set MongoDB client
   */
  setClient(client: MongoClient): void {
    this.client = client;
    this.collection = undefined;
  }

  /**
   * Get DLQ collection
   */
  private getCollection(): Collection<DLQMessage> {
    if (!this.client) {
      throw new Error('MongoDB client not configured');
    }

    if (!this.collection) {
      this.collection = this.client.db('caas_platform').collection<DLQMessage>('dlq_messages');
    }

    return this.collection;
  }

  /**
   * Store failed message in DLQ
   */
  async storeFailedMessage(
    topic: string,
    partition: number,
    offset: number,
    message: any,
    error: Error,
    retryCount: number = 0
  ): Promise<string> {
    const collection = this.getCollection();

    const dlqMessage: DLQMessage = {
      dlq_id: this.generateDLQId(),
      original_topic: topic,
      original_partition: partition,
      original_offset: offset,
      message,
      error: {
        type: error.name,
        message: error.message,
        stack: error.stack,
      },
      retry_count: retryCount,
      max_retries: 3,
      is_retryable: this.isRetryableError(error),
      failed_at: new Date(),
      status: 'pending',
      tenant_id: message.tenant_id,
    };

    await collection.insertOne(dlqMessage as any);

    return dlqMessage.dlq_id;
  }

  /**
   * Get pending DLQ messages for retry
   */
  async getPendingMessages(limit: number = 100): Promise<DLQMessage[]> {
    const collection = this.getCollection();

    return collection
      .find({
        status: 'pending',
        is_retryable: true,
        retry_count: { $lt: 3 },
      } as any)
      .limit(limit)
      .toArray();
  }

  /**
   * Update DLQ message status
   */
  async updateStatus(
    dlqId: string,
    status: DLQMessage['status'],
    retryCount?: number
  ): Promise<void> {
    const collection = this.getCollection();

    const update: any = {
      status,
      last_retry_at: new Date(),
    };

    if (retryCount !== undefined) {
      update.retry_count = retryCount;
    }

    await collection.updateOne(
      { dlq_id: dlqId } as any,
      { $set: update }
    );
  }

  /**
   * Mark message as resolved
   */
  async markResolved(dlqId: string): Promise<void> {
    await this.updateStatus(dlqId, 'resolved');
  }

  /**
   * Mark message as permanently failed
   */
  async markFailed(dlqId: string): Promise<void> {
    await this.updateStatus(dlqId, 'failed');
  }

  /**
   * Generate unique DLQ ID
   */
  private generateDLQId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'TimeoutError',
      'ConnectionError',
      'NetworkError',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ];

    return retryableErrors.some(
      (type) => error.name.includes(type) || error.message.includes(type)
    );
  }

  /**
   * Get DLQ statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    retrying: number;
    failed: number;
    resolved: number;
  }> {
    const collection = this.getCollection();

    const [total, pending, retrying, failed, resolved] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ status: 'pending' } as any),
      collection.countDocuments({ status: 'retrying' } as any),
      collection.countDocuments({ status: 'failed' } as any),
      collection.countDocuments({ status: 'resolved' } as any),
    ]);

    return { total, pending, retrying, failed, resolved };
  }
}

// Singleton instance
export const dlqProcessor = new DLQProcessor();
