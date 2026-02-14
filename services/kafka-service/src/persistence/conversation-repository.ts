/**
 * Conversation Repository
 * 
 * Handles conversation metadata updates
 */

import { MongoClient, Collection } from 'mongodb';

export interface Conversation {
  conversation_id: string;
  tenant_id: string;
  name?: string;
  type: string;
  participants: Array<{
    user_id: string;
    role: string;
    joined_at: Date;
  }>;
  last_message_at?: Date;
  message_count: number;
  created_at: Date;
  updated_at?: Date;
}

export class ConversationRepository {
  private client?: MongoClient;
  private collection?: Collection<Conversation>;

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
   * Get conversations collection
   */
  private getCollection(): Collection<Conversation> {
    if (!this.client) {
      throw new Error('MongoDB client not configured');
    }

    if (!this.collection) {
      this.collection = this.client
        .db('caas_platform')
        .collection<Conversation>('conversations');
    }

    return this.collection;
  }

  /**
   * Update conversation last message timestamp
   */
  async updateLastMessage(
    conversationId: string,
    tenantId: string,
    lastMessageAt: Date
  ): Promise<void> {
    const collection = this.getCollection();

    await collection.updateOne(
      {
        conversation_id: conversationId,
        tenant_id: tenantId,
      } as any,
      {
        $set: {
          last_message_at: lastMessageAt,
          updated_at: new Date(),
        },
        $inc: {
          message_count: 1,
        },
      }
    );
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(
    conversationId: string,
    tenantId: string
  ): Promise<Conversation | null> {
    const collection = this.getCollection();

    return collection.findOne({
      conversation_id: conversationId,
      tenant_id: tenantId,
    } as any);
  }

  /**
   * Get conversation participants
   */
  async getParticipants(
    conversationId: string,
    tenantId: string
  ): Promise<Array<{ user_id: string; role: string }>> {
    const collection = this.getCollection();

    const conversation = await collection.findOne(
      {
        conversation_id: conversationId,
        tenant_id: tenantId,
      } as any,
      {
        projection: { participants: 1 },
      }
    );

    return conversation?.participants || [];
  }

  /**
   * Check if user is member of conversation
   */
  async isMember(
    conversationId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const collection = this.getCollection();

    const count = await collection.countDocuments({
      conversation_id: conversationId,
      tenant_id: tenantId,
      'participants.user_id': userId,
    } as any);

    return count > 0;
  }

  /**
   * Bulk update conversations
   */
  async bulkUpdateLastMessage(
    updates: Array<{
      conversationId: string;
      tenantId: string;
      lastMessageAt: Date;
    }>
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    const collection = this.getCollection();

    const operations = updates.map((update) => ({
      updateOne: {
        filter: {
          conversation_id: update.conversationId,
          tenant_id: update.tenantId,
        },
        update: {
          $set: {
            last_message_at: update.lastMessageAt,
            updated_at: new Date(),
          },
          $inc: {
            message_count: 1,
          },
        },
      },
    }));

    await collection.bulkWrite(operations as any, { ordered: false });
  }
}

// Singleton instance
export const conversationRepository = new ConversationRepository();
