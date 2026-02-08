import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ConsumerConfig, MessageHandler } from './types';
import { ConsumerMetrics } from './consumer-metrics';

export abstract class BaseConsumer<T> {
  protected consumer: Consumer;
  protected metrics: ConsumerMetrics;
  protected isRunning: boolean = false;

  constructor(
    protected config: ConsumerConfig,
    protected handler: MessageHandler<T>
  ) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers
    });

    this.consumer = kafka.consumer({ groupId: config.groupId });
    this.metrics = new ConsumerMetrics();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    await this.consumer.connect();
    await this.consumer.subscribe({ 
      topic: this.config.topic, 
      fromBeginning: this.config.fromBeginning 
    });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const startTime = Date.now();
        try {
          const value = payload.message.value?.toString();
          if (!value) return;

          // TODO: Use Schema Registry for deserialization
          const message = JSON.parse(value);
          
          await this.process(message);
          
          this.metrics.recordSuccess(Date.now() - startTime);
        } catch (error) {
          this.metrics.recordError();
          this.onError(error as Error);
        }
      }
    });

    this.isRunning = true;
    console.log(`Consumer ${this.config.groupId} started`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    await this.consumer.disconnect();
    this.isRunning = false;
    console.log(`Consumer ${this.config.groupId} stopped`);
  }

  protected async process(message: any): Promise<void> {
    await this.handler.handle(message);
  }

  protected onError(error: Error): void {
    console.error(`Consumer error in group ${this.config.groupId}:`, error);
  }
}
