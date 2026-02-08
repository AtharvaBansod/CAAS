import { BaseConsumer } from './base-consumer';
import { EachBatchPayload } from 'kafkajs';

export class ConcurrentConsumer<T> extends BaseConsumer<T> {
  private concurrency: number = 5;

  constructor(config: any, handler: any, concurrency: number = 5) {
    super(config, handler);
    this.concurrency = concurrency;
  }

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
        
        const messages = batch.messages;
        
        // Process in chunks of 'concurrency'
        for (let i = 0; i < messages.length; i += this.concurrency) {
          if (!isRunning() || isStale()) break;

          const chunk = messages.slice(i, i + this.concurrency);
          
          await Promise.all(chunk.map(async (message) => {
            const startTime = Date.now();
            try {
              const value = message.value?.toString();
              if (value) {
                const parsedMessage = JSON.parse(value);
                await this.process(parsedMessage);
              }
              resolveOffset(message.offset);
              this.metrics.recordSuccess(Date.now() - startTime);
            } catch (error) {
              this.metrics.recordError();
              this.onError(error as Error);
            }
          }));

          await heartbeat();
        }
      }
    });

    this.isRunning = true;
    console.log(`ConcurrentConsumer ${this.config.groupId} started`);
  }
}
