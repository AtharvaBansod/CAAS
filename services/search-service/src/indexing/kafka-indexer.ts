import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { BulkIndexer, IndexMetrics } from './bulk-indexer.js';

export class KafkaIndexer {
  private kafka: Kafka;
  private consumer: Consumer;
  private esClient: ElasticsearchClient;
  private bulkIndexer: BulkIndexer;
  private isRunning: boolean = false;

  constructor(
    kafkaBrokers: string[],
    esClient: ElasticsearchClient,
    groupId: string = 'search-indexer'
  ) {
    this.kafka = new Kafka({
      clientId: 'search-service-indexer',
      brokers: kafkaBrokers,
    });

    this.consumer = this.kafka.consumer({ groupId });
    this.esClient = esClient;
    this.bulkIndexer = new BulkIndexer(esClient);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Kafka indexer already running');
      return;
    }

    await this.consumer.connect();
    console.log('Kafka indexer connected');

    // Subscribe to topics (user-events optional - only chat.messages and conversation-events are created by default)
    await this.consumer.subscribe({
      topics: ['chat.messages', 'conversation-events', 'message-events'],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    this.isRunning = true;
    console.log('Kafka indexer started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.bulkIndexer.flush();
    await this.consumer.disconnect();
    this.isRunning = false;
    console.log('Kafka indexer stopped');
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      if (!message.value) {
        return;
      }

      const event = JSON.parse(message.value.toString());

      switch (topic) {
        case 'chat.messages':
          await this.handleMessageEvent(event);
          break;
        case 'conversation-events':
          await this.handleConversationEvent(event);
          break;
        case 'message-events':
          await this.handleMessageEvent(event);
          break;
        default:
          console.warn(`Unknown topic: ${topic}`);
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
      // Send to DLQ
      await this.sendToDLQ(topic, partition, message, error);
    }
  }

  private async handleMessageEvent(event: any): Promise<void> {
    const { event: eventType, message_id, tenant_id, conversation_id, sender_id, content, timestamp } = event;

    switch (eventType) {
      case 'message.created':
        await this.bulkIndexer.addOperation({
          index: 'messages',
          id: message_id,
          document: {
            tenant_id,
            conversation_id,
            sender_id,
            content,
            created_at: timestamp,
            indexed_at: new Date().toISOString(),
          },
        });
        break;

      case 'message.updated':
        await this.bulkIndexer.addOperation({
          index: 'messages',
          id: message_id,
          document: {
            content,
            updated_at: timestamp,
          },
          isUpdate: true,
        });
        break;

      case 'message.deleted':
        await this.bulkIndexer.addOperation({
          index: 'messages',
          id: message_id,
          isDelete: true,
        });
        break;

      default:
        console.log(`Unhandled message event: ${eventType}`);
    }
  }

  private async handleConversationEvent(event: any): Promise<void> {
    const { event: eventType, conversation_id, tenant_id, timestamp } = event;

    switch (eventType) {
      case 'conversation.created':
        await this.bulkIndexer.addOperation({
          index: 'conversations',
          id: conversation_id,
          document: {
            tenant_id,
            type: event.type,
            member_ids: event.member_ids || [],
            created_at: timestamp,
            updated_at: timestamp,
            indexed_at: new Date().toISOString(),
          },
        });
        break;

      case 'conversation.updated':
        const updateDoc: any = {
          updated_at: timestamp,
        };

        if (event.changes?.name) {
          updateDoc.name = event.changes.name;
        }

        if (event.changes?.metadata) {
          updateDoc.metadata = event.changes.metadata;
        }

        await this.bulkIndexer.addOperation({
          index: 'conversations',
          id: conversation_id,
          document: updateDoc,
          isUpdate: true,
        });
        break;

      case 'conversation.archived':
        await this.bulkIndexer.addOperation({
          index: 'conversations',
          id: conversation_id,
          document: {
            archived_at: timestamp,
            updated_at: timestamp,
          },
          isUpdate: true,
        });
        break;

      case 'member.added':
      case 'member.removed':
        // Fetch current conversation to update member list
        // This is simplified - in production, you'd want to maintain member list properly
        await this.bulkIndexer.addOperation({
          index: 'conversations',
          id: conversation_id,
          document: {
            updated_at: timestamp,
          },
          isUpdate: true,
        });
        break;

      default:
        console.log(`Unhandled conversation event: ${eventType}`);
    }
  }

  private async handleUserEvent(event: any): Promise<void> {
    const { event: eventType, user_id, tenant_id, timestamp } = event;

    switch (eventType) {
      case 'user.created':
        await this.bulkIndexer.addOperation({
          index: 'users',
          id: user_id,
          document: {
            tenant_id,
            username: event.username,
            display_name: event.display_name,
            email: event.email,
            created_at: timestamp,
            indexed_at: new Date().toISOString(),
          },
        });
        break;

      case 'user.updated':
        const updateDoc: any = {
          updated_at: timestamp,
        };

        if (event.changes?.username) {
          updateDoc.username = event.changes.username;
        }

        if (event.changes?.display_name) {
          updateDoc.display_name = event.changes.display_name;
        }

        if (event.changes?.email) {
          updateDoc.email = event.changes.email;
        }

        await this.bulkIndexer.addOperation({
          index: 'users',
          id: user_id,
          document: updateDoc,
          isUpdate: true,
        });
        break;

      case 'user.deleted':
        await this.bulkIndexer.addOperation({
          index: 'users',
          id: user_id,
          isDelete: true,
        });
        break;

      default:
        console.log(`Unhandled user event: ${eventType}`);
    }
  }

  private async sendToDLQ(
    topic: string,
    partition: number,
    message: any,
    error: any
  ): Promise<void> {
    try {
      const producer = this.kafka.producer();
      await producer.connect();

      await producer.send({
        topic: 'search-indexing-dlq',
        messages: [
          {
            key: message.key,
            value: JSON.stringify({
              original_topic: topic,
              original_partition: partition,
              original_message: message.value?.toString(),
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });

      await producer.disconnect();
    } catch (dlqError) {
      console.error('Failed to send to DLQ:', dlqError);
    }
  }

  getMetrics(): IndexMetrics {
    return this.bulkIndexer.getMetrics();
  }
}
