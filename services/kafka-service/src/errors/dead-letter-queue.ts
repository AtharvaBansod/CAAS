import { BaseProducer } from '../producers/base-producer';
import { KafkaMessage } from '../types/message-envelope';

export class DeadLetterQueue {
  constructor(private producer: BaseProducer, private dlqTopic: string) {}

  async sendToDLQ(message: KafkaMessage<any>, error: Error, context?: any): Promise<void> {
    const dlqMessage = {
      originalMessage: message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      failedAt: Date.now()
    };

    await this.producer.send({
      topic: this.dlqTopic,
      key: message.id,
      value: dlqMessage
    });
  }
}
