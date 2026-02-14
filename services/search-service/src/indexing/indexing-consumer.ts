import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { MessageIndexer } from './message-indexer';

export class IndexingConsumer {
  private consumer: Consumer;

  constructor(
    private kafka: Kafka,
    private messageIndexer: MessageIndexer,
  ) {
    this.consumer = this.kafka.consumer({ groupId: 'search-indexing-group' });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    console.log('Indexing consumer connected');

    await this.consumer.subscribe({
      topics: ['messages'],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    if (!message.value) return;

    try {
      const event = JSON.parse(message.value.toString());
      const eventType = message.headers?.['event-type']?.toString();

      console.log(`Processing event: ${eventType} from topic: ${topic}`);

      switch (eventType) {
        case 'message.created':
          await this.onMessageCreated(event);
          break;
        case 'message.updated':
          await this.onMessageUpdated(event);
          break;
        case 'message.deleted':
          await this.onMessageDeleted(event);
          break;
        default:
          console.log(`Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  }

  private async onMessageCreated(event: any): Promise<void> {
    await this.messageIndexer.indexMessage(event.data || event);
  }

  private async onMessageUpdated(event: any): Promise<void> {
    await this.messageIndexer.updateMessage(event.data || event);
  }

  private async onMessageDeleted(event: any): Promise<void> {
    const messageId = event.data?.id || event.id;
    await this.messageIndexer.deleteMessage(messageId);
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
    console.log('Indexing consumer disconnected');
  }
}
