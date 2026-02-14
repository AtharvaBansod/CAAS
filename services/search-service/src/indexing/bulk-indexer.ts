import { Client as ElasticsearchClient } from '@elastic/elasticsearch';

interface IndexOperation {
  index: string;
  id: string;
  document?: any;
  isUpdate?: boolean;
  isDelete?: boolean;
}

export interface IndexMetrics {
  documentsIndexed: number;
  documentsUpdated: number;
  documentsDeleted: number;
  errors: number;
  lastFlush: string;
  averageLatency: number;
}

export class BulkIndexer {
  private esClient: ElasticsearchClient;
  private operations: IndexOperation[] = [];
  private batchSize: number;
  private flushInterval: number;
  private flushTimer: NodeJS.Timeout | null = null;
  private metrics: IndexMetrics;
  private latencies: number[] = [];

  constructor(
    esClient: ElasticsearchClient,
    batchSize: number = 100,
    flushInterval: number = 1000
  ) {
    this.esClient = esClient;
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.metrics = {
      documentsIndexed: 0,
      documentsUpdated: 0,
      documentsDeleted: 0,
      errors: 0,
      lastFlush: new Date().toISOString(),
      averageLatency: 0,
    };

    this.startFlushTimer();
  }

  async addOperation(operation: IndexOperation): Promise<void> {
    this.operations.push(operation);

    if (this.operations.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.operations.length === 0) {
      return;
    }

    const startTime = Date.now();
    const operationsToProcess = [...this.operations];
    this.operations = [];

    try {
      const body: any[] = [];

      for (const op of operationsToProcess) {
        if (op.isDelete) {
          body.push({ delete: { _index: op.index, _id: op.id } });
        } else if (op.isUpdate) {
          body.push({ update: { _index: op.index, _id: op.id } });
          body.push({ doc: op.document, doc_as_upsert: true });
        } else {
          body.push({ index: { _index: op.index, _id: op.id } });
          body.push(op.document);
        }
      }

      const result = await this.esClient.bulk({ body, refresh: false });

      // Process results
      if (result.errors) {
        const errors = result.items.filter((item: any) => {
          const operation = item.index || item.update || item.delete;
          return operation.error;
        });

        console.error(`Bulk indexing errors: ${errors.length}`, errors);
        this.metrics.errors += errors.length;

        // Retry failed operations
        for (const error of errors) {
          const operation = error.index || error.update || error.delete;
          console.error('Failed operation:', operation);
        }
      }

      // Update metrics
      for (const op of operationsToProcess) {
        if (op.isDelete) {
          this.metrics.documentsDeleted++;
        } else if (op.isUpdate) {
          this.metrics.documentsUpdated++;
        } else {
          this.metrics.documentsIndexed++;
        }
      }

      const latency = Date.now() - startTime;
      this.latencies.push(latency);
      if (this.latencies.length > 100) {
        this.latencies.shift();
      }

      this.metrics.averageLatency =
        this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
      this.metrics.lastFlush = new Date().toISOString();

      console.log(
        `Flushed ${operationsToProcess.length} operations in ${latency}ms`
      );
    } catch (error) {
      console.error('Bulk indexing failed:', error);
      this.metrics.errors += operationsToProcess.length;

      // Re-add operations for retry
      this.operations.unshift(...operationsToProcess);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        console.error('Scheduled flush failed:', error);
      });
    }, this.flushInterval);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  getMetrics(): IndexMetrics {
    return { ...this.metrics };
  }
}
