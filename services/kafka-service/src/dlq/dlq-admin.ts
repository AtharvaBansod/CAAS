/**
 * DLQ Admin
 * 
 * Administrative functions for managing DLQ messages
 */

import { dlqProcessor, DLQMessage } from './dlq-processor';
import { dlqRetryService } from './dlq-retry-service';

export class DLQAdmin {
  /**
   * List failed messages with filters
   */
  async listFailedMessages(filters: {
    status?: DLQMessage['status'];
    tenantId?: string;
    topic?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ messages: DLQMessage[]; total: number }> {
    const collection = dlqProcessor['getCollection']();

    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.tenantId) {
      query.tenant_id = filters.tenantId;
    }

    if (filters.topic) {
      query.original_topic = filters.topic;
    }

    const limit = filters.limit || 50;
    const skip = filters.skip || 0;

    const [messages, total] = await Promise.all([
      collection
        .find(query)
        .sort({ failed_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return { messages, total };
  }

  /**
   * Get message details by ID
   */
  async getMessageDetails(dlqId: string): Promise<DLQMessage | null> {
    const collection = dlqProcessor['getCollection']();
    return collection.findOne({ dlq_id: dlqId } as any);
  }

  /**
   * Manually reprocess a message
   */
  async reprocessMessage(dlqId: string): Promise<void> {
    await dlqRetryService.reprocessMessage(dlqId);
  }

  /**
   * Delete message from DLQ
   */
  async deleteMessage(dlqId: string): Promise<void> {
    const collection = dlqProcessor['getCollection']();
    await collection.deleteOne({ dlq_id: dlqId } as any);
  }

  /**
   * Bulk reprocess messages
   */
  async bulkReprocess(dlqIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ dlqId: string; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ dlqId: string; error: string }>,
    };

    for (const dlqId of dlqIds) {
      try {
        await this.reprocessMessage(dlqId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          dlqId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Bulk delete messages
   */
  async bulkDelete(dlqIds: string[]): Promise<{
    success: number;
    failed: number;
  }> {
    const collection = dlqProcessor['getCollection']();

    const result = await collection.deleteMany({
      dlq_id: { $in: dlqIds },
    } as any);

    return {
      success: result.deletedCount || 0,
      failed: dlqIds.length - (result.deletedCount || 0),
    };
  }

  /**
   * Get DLQ statistics
   */
  async getStatistics(): Promise<any> {
    return dlqProcessor.getStatistics();
  }

  /**
   * Get error type breakdown
   */
  async getErrorBreakdown(): Promise<Array<{ errorType: string; count: number }>> {
    const collection = dlqProcessor['getCollection']();

    const pipeline = [
      {
        $group: {
          _id: '$error.type',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          errorType: '$_id',
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ];

    return collection.aggregate(pipeline).toArray() as any;
  }

  /**
   * Get topic breakdown
   */
  async getTopicBreakdown(): Promise<Array<{ topic: string; count: number }>> {
    const collection = dlqProcessor['getCollection']();

    const pipeline = [
      {
        $group: {
          _id: '$original_topic',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          topic: '$_id',
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ];

    return collection.aggregate(pipeline).toArray() as any;
  }
}

// Singleton instance
export const dlqAdmin = new DLQAdmin();
