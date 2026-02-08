import { BaseConsumer } from './base-consumer';
import { EachBatchPayload } from 'kafkajs';

export class BatchConsumer<T> extends BaseConsumer<T> {
  
  async start(): Promise<void> {
    if (this.isRunning) return;

    await this.consumer.connect();
    await this.consumer.subscribe({ 
      topic: this.config.topic, 
      fromBeginning: this.config.fromBeginning 
    });

    await this.consumer.run({
      eachBatch: async (payload: EachBatchPayload) => {
        const { batch, resolveOffset, heartbeat, isRunning, isStale } = payload;
        
        for (const message of batch.messages) {
          if (!isRunning() || isStale()) break;

          const startTime = Date.now();
          try {
            const value = message.value?.toString();
            if (value) {
              const parsedMessage = JSON.parse(value);
              await this.process(parsedMessage);
            }
            
            resolveOffset(message.offset);
            await heartbeat();
            
            this.metrics.recordSuccess(Date.now() - startTime);
          } catch (error) {
            this.metrics.recordError();
            this.onError(error as Error);
            // Decide whether to stop batch or continue
            // For now, we log and continue (at-least-once with potential skip if not careful)
            // Ideally we should throw to retry the batch
          }
        }
      }
    });

    this.isRunning = true;
    console.log(`BatchConsumer ${this.config.groupId} started`);
  }
}
