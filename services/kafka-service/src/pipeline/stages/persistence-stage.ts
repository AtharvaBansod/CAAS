/**
 * Persistence Stage
 * 
 * Saves messages to MongoDB and updates conversation metadata
 */

import { PipelineStage, PipelineContext } from '../types';
export { PipelineStage, PipelineContext };

export class PersistenceStage implements PipelineStage {
  name = 'persistence';
  private batchBuffer: any[] = [];
  private batchSize: number = 100;
  private flushInterval: number = 1000; // 1 second
  private lastFlushTime: number = Date.now();

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const startTime = Date.now();

    try {
      const message = context.message;

      // Add to batch buffer
      this.batchBuffer.push(message);

      // Check if we should flush
      const shouldFlush =
        this.batchBuffer.length >= this.batchSize ||
        Date.now() - this.lastFlushTime >= this.flushInterval;

      if (shouldFlush) {
        await this.flushBatch();
      }

      // Update conversation last_message_at
      if (message.conversation_id) {
        await this.updateConversationMetadata(
          message.conversation_id,
          message.created_at || new Date(),
          context.tenant?.tenant_id
        );
      }

      // Record metrics
      context.metrics = context.metrics || {};
      context.metrics[this.name] = {
        duration_ms: Date.now() - startTime,
        success: true,
        batch_size: this.batchBuffer.length,
      };

      return context;
    } catch (error) {
      context.metrics = context.metrics || {};
      context.metrics[this.name] = {
        duration_ms: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      throw error;
    }
  }

  /**
   * Flush batch to MongoDB
   */
  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) {
      return;
    }

    try {
      // TODO: Implement actual MongoDB bulk write
      console.log(`Flushing ${this.batchBuffer.length} messages to MongoDB`);

      // Clear buffer
      this.batchBuffer = [];
      this.lastFlushTime = Date.now();
    } catch (error) {
      console.error('Failed to flush batch:', error);
      throw error;
    }
  }

  /**
   * Update conversation metadata
   */
  private async updateConversationMetadata(
    conversationId: string,
    lastMessageAt: Date,
    tenantId?: string
  ): Promise<void> {
    // TODO: Implement actual MongoDB update
    // Update conversation.last_message_at and conversation.message_count
    return;
  }

  /**
   * Force flush remaining messages (call on shutdown)
   */
  async forceFlush(): Promise<void> {
    await this.flushBatch();
  }
}
