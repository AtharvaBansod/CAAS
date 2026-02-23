/**
 * Conversation Repository
 * Direct MongoDB access for conversation operations
 */

import { MongoClient, Collection } from 'mongodb';

export interface Conversation {
  conversation_id: string;
  tenant_id: string;
  type: 'direct' | 'group' | 'channel';
  participants: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
  last_message_at?: Date;
  metadata?: {
    name?: string;
    description?: string;
    avatar_url?: string;
    settings?: Record<string, any>;
  };
  deleted_at?: Date;
}

export interface ConversationParticipant {
  conversation_id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
  left_at?: Date;
  muted_until?: Date;
  archived: boolean;
}

export class ConversationRepository {
  private client: MongoClient;
  private conversationsCollection?: Collection<Conversation>;
  private participantsCollection?: Collection<ConversationParticipant>;

  constructor(mongoClient: MongoClient) {
    this.client = mongoClient;
  }

  private getConversationsCollection(): Collection<Conversation> {
    if (!this.conversationsCollection) {
      this.conversationsCollection = this.client
        .db('caas_platform')
        .collection<Conversation>('conversations');
    }
    return this.conversationsCollection;
  }

  private getParticipantsCollection(): Collection<ConversationParticipant> {
    if (!this.participantsCollection) {
      this.participantsCollection = this.client
        .db('caas_platform')
        .collection<ConversationParticipant>('conversation_participants');
    }
    return this.participantsCollection;
  }

  async getConversation(conversationId: string, tenantId: string): Promise<Conversation | null> {
    const collection = this.getConversationsCollection();
    return collection.findOne({
      conversation_id: conversationId,
      tenant_id: tenantId,
      deleted_at: null,
    } as any);
  }

  async createConversation(conversation: Conversation): Promise<void> {
    const collection = this.getConversationsCollection();
    await collection.insertOne({
      ...conversation,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);
  }

  async updateConversation(
    conversationId: string,
    tenantId: string,
    updates: Partial<Conversation>
  ): Promise<void> {
    const collection = this.getConversationsCollection();
    await collection.updateOne(
      {
        conversation_id: conversationId,
        tenant_id: tenantId,
      } as any,
      {
        $set: {
          ...updates,
          updated_at: new Date(),
        },
      }
    );
  }

  async deleteConversation(conversationId: string, tenantId: string): Promise<void> {
    const collection = this.getConversationsCollection();
    await collection.updateOne(
      {
        conversation_id: conversationId,
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

  async getParticipants(conversationId: string, tenantId: string): Promise<ConversationParticipant[]> {
    const collection = this.getParticipantsCollection();
    return collection
      .find({
        conversation_id: conversationId,
        tenant_id: tenantId,
        left_at: null,
      } as any)
      .toArray();
  }

  async addParticipant(participant: ConversationParticipant): Promise<void> {
    const collection = this.getParticipantsCollection();
    await collection.insertOne({
      ...participant,
      joined_at: new Date(),
      archived: false,
    } as any);
  }

  async removeParticipant(conversationId: string, tenantId: string, userId: string): Promise<void> {
    const collection = this.getParticipantsCollection();
    await collection.updateOne(
      {
        conversation_id: conversationId,
        tenant_id: tenantId,
        user_id: userId,
      } as any,
      {
        $set: {
          left_at: new Date(),
        },
      }
    );
  }

  async isParticipant(conversationId: string, tenantId: string, userId: string): Promise<boolean> {
    const collection = this.getParticipantsCollection();
    const count = await collection.countDocuments({
      conversation_id: conversationId,
      tenant_id: tenantId,
      user_id: userId,
      left_at: null,
    } as any);
    return count > 0;
  }

  async muteConversation(
    conversationId: string,
    tenantId: string,
    userId: string,
    mutedUntil: Date
  ): Promise<void> {
    const collection = this.getParticipantsCollection();
    await collection.updateOne(
      {
        conversation_id: conversationId,
        tenant_id: tenantId,
        user_id: userId,
      } as any,
      {
        $set: {
          muted_until: mutedUntil,
        },
      }
    );
  }

  async archiveConversation(
    conversationId: string,
    tenantId: string,
    userId: string,
    archived: boolean
  ): Promise<void> {
    const collection = this.getParticipantsCollection();
    await collection.updateOne(
      {
        conversation_id: conversationId,
        tenant_id: tenantId,
        user_id: userId,
      } as any,
      {
        $set: {
          archived,
        },
      }
    );
  }
}
