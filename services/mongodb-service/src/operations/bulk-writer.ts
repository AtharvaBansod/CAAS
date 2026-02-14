/**
 * Bulk Writer
 * 
 * Buffers write operations and executes them in batches for efficiency
 */

import { Collection, BulkWriteOperation, BulkWriteResult } from 'mongodb';

export interface BulkWriterOptions {
  batchSize?: number;
  flushIntervalMs?: number;
  ordered?: boolean;
}

export class BulkWriter<T = any> {
  private collection: Collection<T>;
  private buffer: BulkWriteOperation<T>[] = [];
  private batchSize: number;
  private flushIntervalMs: number;
  private ordered: boolean;
  private lastFlushTime: number;
  private flushTimer?: NodeJS.Timeout;
  private isShuttingDown: boolean = false;

  constructor(collection: Collection<T>, options: BulkWriterOptions = {}) {
    this.collection = collection;
    this.batchSize = options.batchSize || 1000;
    this.flushIntervalMs = options.flushIntervalMs || 1000;
    this.ordered = options.ordered !== false;
    this.lastFlushTime = Date.now();

    // Start flush timer
    this.startFlushTimer();
  }

  /**
   * Add insert operation to buffer
   */
  insert(document: T): void {
    this.buffer.push({
      insertOne: {
        document: document as any,
      },
    });

    this.checkFlush();
  }

  /**
   * Add update operation to buffer
   */
  update(filter: any, update: any, upsert: boolean = false): void {
    this.buffer.push({
      updateOne: {
        filter,
        update,
        upsert,
      },
    });

    this.checkFlush();
  }

  /**
   * Add delete operation to buffer
   */
  delete(filter: any): void {
    this.buffer.push({
      deleteOne: {
        filter,
      },
    });

    this.checkFlush();
  }

  /**
   * Check if buffer should be flushed
   */
  private checkFlush(): void {
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      const timeSinceLastFlush = Date.now() - this.lastFlushTime;
      
      if (timeSinceLastFlush >= this.flushIntervalMs && this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Flush buffer to MongoDB
   */
  async flush(): Promise<BulkWriteResult | null> {
    if (this.buffer.length === 0) {
      return null;
    }

    const operations = [...this.buffer];
    this.buffer = [];
    this.lastFlushTime = Date.now();

    try {
      const result = await this.collection.bulkWrite(operations, {
        ordered: this.ordered,
      });

      console.log(
        `Flushed ${operations.length} operations: ` +
        `${result.insertedCount} inserted, ` +
        `${result.modifiedCount} modified, ` +
        `${result.deletedCount} deleted`
      );

      return result;
    } catch (error) {
      console.error('Bulk write error:', error);
      
      // Handle partial failures in unordered mode
      if (!this.ordered && error instanceof Error) {
        const bulkError = error as any;
        if (bulkError.result) {
          console.log(
            `Partial success: ${bulkError.result.nInserted} inserted, ` +
            `${bulkError.result.nModified} modified`
          );
        }
      }

      throw error;
    }
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Shutdown - flush remaining operations and stop timer
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush remaining operations
    await this.flush();

    console.log('BulkWriter shutdown complete');
  }
}
