/**
 * Message Repository
 * 
 * Handles message persistence to MongoDB
 */

import { MongoClient, Collection, BulkWriteOperation } from 'mongodb';

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  tenant_id: string;
  content: string;
  message_type: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

export class MessageRepository {
  private client?: MongoClient;
  private collection?: Collection<Message>;

  constructor(mongoClient?: MongoClient) {
    this.client = mongoClient;
  }

  /**
   * Set MongoDB client
   */
  setClient(client: MongoClient): void {
    this.client = client;
    this.collection = undefined; // Reset collection
  }

  /**
   * Get messages collection
   */
  private getCollection(): Collection<Message> {
    if (!this.client) {
      throw new Error('MongoDB client not configured');
    }

    if (!this.collection) {
      this.collection = this.client.db('caas_platform').collection<Message>('messages');
    }

    return this.collection;
  }

  /**
   * Save single message
   */
  async saveMessage(message: Message): Promise<void> {
    const collection = this.getCollection();

    await collection.insertOne({
      ...message,
      created_at: message.created_at || new Date(),
    } as any);
  }

  /**
   * Save multiple messages (bulk operation)
   */
  async saveMessages(messages: Message[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    const collection = this.getCollection();

    const operations: BulkWriteOperation<Message>[] = messages.map((message) => ({
      insertOne: {
        document: {
          ...message,
          created_at: message.created_at || new Date(),
        } as any,
      },
    }));

    await collection.bulkWrite(operations, { ordered: false });
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string, tenantId: string): Promise<Message | null> {
    const collection = this.getCollection();

    return collection.findOne({
      message_id: messageId,
      tenant_id: tenantId,
      deleted_at: null,
    } as any);
  }

  /**
   * Get messages for conversation
   */
  async getMessagesByConversation(
    conversationId: string,
    tenantId: string,
    limit: number = 50,
    before?: Date
  ): Promise<Message[]> {
    const collection = this.getCollection();

    const query: any = {
      conversation_id: conversationId,
      tenant_id: tenantId,
      deleted_at: null,
    };

    if (before) {
      query.created_at = { $lt: before };
    }

    return collection
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Soft delete message
   */
  async deleteMessage(messageId: string, tenantId: string): Promise<void> {
    const collection = this.getCollection();

    await collection.updateOne(
      {
        message_id: messageId,
        tenant_id: tenantId,
      } as any,
      {
        $set: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      }
    );
  }

  /**
   * Check if message is duplicate (for idempotency)
   */
  async checkDuplicate(messageId: string, tenantId: string): Promise<boolean> {
    const collection = this.getCollection();
    const count = await collection.countDocuments({
      message_id: messageId,
      tenant_id: tenantId,
    } as any);
    return count > 0;
  }

  /**
   * Update conversation last_message_at timestamp
   */
  async updateConversationLastMessage(
    conversationId: string,
    tenantId: string,
    timestamp: Date
  ): Promise<void> {
    if (!this.client) {
      throw new Error('MongoDB client not configured');
    }

    const conversationsCollection = this.client
      .db('caas_platform')
      .collection('conversations');

    await conversationsCollection.updateOne(
      {
        conversation_id: conversationId,
        tenant_id: tenantId,
      } as any,
      {
        $set: {
          last_message_at: timestamp,
          updated_at: new Date(),
        },
      }
    );
  }
}

// Singleton instance
export const messageRepository = new MessageRepository();
