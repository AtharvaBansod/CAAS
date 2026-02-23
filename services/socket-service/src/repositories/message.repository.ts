/**
 * Message Repository
 * Direct MongoDB access for message operations
 */

import { MongoClient, Collection } from 'mongodb';

export interface Message {
  message_id: string;
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  content: {
    type: 'text' | 'image' | 'file' | 'audio' | 'video';
    text?: string;
    media_url?: string;
    metadata?: Record<string, any>;
  };
  created_at: Date;
  updated_at?: Date;
  deleted_at?: Date;
  deleted_for?: string[]; // User IDs who deleted this message for themselves
  edit_history?: Array<{
    content: string;
    edited_at: Date;
  }>;
  reactions?: Array<{
    user_id: string;
    emoji: string;
    created_at: Date;
  }>;
  reply_to?: string; // Parent message ID
  forwarded_from?: {
    conversation_id: string;
    message_id: string;
  };
  metadata?: Record<string, any>;
}

export class MessageRepository {
  private client: MongoClient;
  private collection?: Collection<Message>;

  constructor(mongoClient: MongoClient) {
    this.client = mongoClient;
  }

  private getCollection(): Collection<Message> {
    if (!this.collection) {
      this.collection = this.client
        .db('caas_platform')
        .collection<Message>('messages');
    }
    return this.collection;
  }

  async getMessage(messageId: string, tenantId: string): Promise<Message | null> {
    const collection = this.getCollection();
    return collection.findOne({
      message_id: messageId,
      tenant_id: tenantId,
      deleted_at: null,
    } as any);
  }

  async createMessage(message: Message): Promise<void> {
    const collection = this.getCollection();
    await collection.insertOne({
      ...message,
      created_at: new Date(),
      deleted_for: [],
      reactions: [],
    } as any);
  }

  async editMessage(
    messageId: string,
    tenantId: string,
    newContent: string
  ): Promise<void> {
    const collection = this.getCollection();
    
    // Get current message to save in history
    const currentMessage = await this.getMessage(messageId, tenantId);
    if (!currentMessage) {
      throw new Error('Message not found');
    }

    const editHistory = currentMessage.edit_history || [];
    editHistory.push({
      content: currentMessage.content.text || '',
      edited_at: new Date(),
    });

    await collection.updateOne(
      {
        message_id: messageId,
        tenant_id: tenantId,
      } as any,
      {
        $set: {
          'content.text': newContent,
          updated_at: new Date(),
          edit_history: editHistory,
        },
      }
    );
  }

  async deleteMessage(
    messageId: string,
    tenantId: string,
    deleteType: 'soft' | 'hard' | 'for_me',
    userId?: string
  ): Promise<void> {
    const collection = this.getCollection();

    if (deleteType === 'hard') {
      // Hard delete - remove from DB
      await collection.deleteOne({
        message_id: messageId,
        tenant_id: tenantId,
      } as any);
    } else if (deleteType === 'for_me' && userId) {
      // Delete for specific user
      await collection.updateOne(
        {
          message_id: messageId,
          tenant_id: tenantId,
        } as any,
        {
          $addToSet: {
            deleted_for: userId,
          },
        }
      );
    } else {
      // Soft delete - mark as deleted
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
  }

  async addReaction(
    messageId: string,
    tenantId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const collection = this.getCollection();
    
    // Remove existing reaction from this user first
    await collection.updateOne(
      {
        message_id: messageId,
        tenant_id: tenantId,
      } as any,
      {
        $pull: {
          reactions: { user_id: userId },
        },
      }
    );

    // Add new reaction
    await collection.updateOne(
      {
        message_id: messageId,
        tenant_id: tenantId,
      } as any,
      {
        $push: {
          reactions: {
            user_id: userId,
            emoji,
            created_at: new Date(),
          },
        },
      }
    );
  }

  async removeReaction(
    messageId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const collection = this.getCollection();
    await collection.updateOne(
      {
        message_id: messageId,
        tenant_id: tenantId,
      } as any,
      {
        $pull: {
          reactions: { user_id: userId },
        },
      }
    );
  }

  async getMessages(
    conversationId: string,
    tenantId: string,
    userId: string,
    limit: number = 50,
    before?: Date
  ): Promise<Message[]> {
    const collection = this.getCollection();

    const query: any = {
      conversation_id: conversationId,
      tenant_id: tenantId,
      deleted_at: null,
      deleted_for: { $ne: userId }, // Exclude messages deleted by this user
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
}
