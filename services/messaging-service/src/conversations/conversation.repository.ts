import { Db, ObjectId, Collection } from 'mongodb';
import { Conversation, CreateConversationDTO, UpdateConversationDTO, Participant, MessageSummary, PaginatedResult, ListOptions } from './conversation.types';
import { getUserConversationsQuery, getDirectConversationQuery } from './conversation.queries';

export class ConversationRepository {
  private conversations: Collection<Conversation>;

  constructor(db: Db) {
    this.conversations = db.collection<Conversation>('conversations');
  }

  async create(data: CreateConversationDTO, tenantId: string, creatorId: string): Promise<Conversation> {
    const now = new Date();
    const newConversation: Conversation = {
      _id: new ObjectId(),
      type: data.type,
      tenant_id: tenantId,
      participants: data.participant_ids.map(userId => ({
        user_id: userId,
        role: userId === creatorId ? 'admin' : 'member', // Creator is admin by default
        joined_at: now,
        notifications: 'all',
      })),
      name: data.name,
      avatar_url: data.avatar_url,
      settings: {
        is_muted: false,
      },
      created_at: now,
      updated_at: now,
    };
    await this.conversations.insertOne(newConversation as any); // Cast to any due to ObjectId issues with strict types
    return newConversation;
  }

  async findById(id: ObjectId, tenantId: string): Promise<Conversation | null> {
    return this.conversations.findOne({ _id: id, tenant_id: tenantId });
  }

  async findByParticipants(userId1: string, userId2: string, tenantId: string): Promise<Conversation | null> {
    return this.conversations.findOne(getDirectConversationQuery(userId1, userId2, tenantId));
  }

  async findByUser(userId: string, tenantId: string, options: ListOptions): Promise<PaginatedResult<Conversation>> {
    const query = getUserConversationsQuery(userId, tenantId);
    const { limit = 20, offset = 0, before, after } = options;

    let cursor = this.conversations.find(query);

    if (before) {
      cursor = cursor.filter({ updated_at: { $lt: before } });
    }
    if (after) {
      cursor = cursor.filter({ updated_at: { $gt: after } });
    }

    const total = await this.conversations.countDocuments(query);
    const data = await cursor
      .sort({ updated_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return { data, total, limit, offset };
  }

  async update(id: ObjectId, tenantId: string, data: UpdateConversationDTO): Promise<Conversation | null> {
    const result = await this.conversations.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { $set: { ...data, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  async delete(id: ObjectId, tenantId: string): Promise<void> {
    // For simplicity, we'll do a hard delete for now. Soft delete can be implemented later.
    await this.conversations.deleteOne({ _id: id, tenant_id: tenantId });
  }

  async addParticipant(id: ObjectId, tenantId: string, participant: Participant): Promise<void> {
    await this.conversations.updateOne(
      { _id: id, tenant_id: tenantId },
      { $push: { participants: participant }, $set: { updated_at: new Date() } }
    );
  }

  async removeParticipant(id: ObjectId, tenantId: string, userId: string): Promise<void> {
    await this.conversations.updateOne(
      { _id: id, tenant_id: tenantId },
      { $pull: { participants: { user_id: userId } }, $set: { updated_at: new Date() } }
    );
  }

  async updateParticipantRole(
    id: ObjectId,
    tenantId: string,
    userId: string,
    newRole: string,
  ): Promise<void> {
    await this.conversations.updateOne(
      { _id: id, tenant_id: tenantId, 'participants.user_id': userId },
      { $set: { 'participants.$.role': newRole, updated_at: new Date() } },
    );
  }

  async updateLastMessage(id: ObjectId, tenantId: string, message: MessageSummary): Promise<void> {
    await this.conversations.updateOne(
      { _id: id, tenant_id: tenantId },
      { $set: { last_message: message, updated_at: new Date() } }
    );
  }
}
