// Message repository for database operations
import { Db, Collection, ObjectId } from 'mongodb';
import { Message, CreateMessageDto, MessageQueryOptions, MessageStatus } from './message.types';
import { v4 as uuidv4 } from 'uuid';

export class MessageRepository {
  private messages: Collection<Message>;

  constructor(private db: Db) {
    this.messages = db.collection<Message>('messages');
    this.ensureIndexes();
  }

  private async ensureIndexes() {
    await this.messages.createIndex({ conversation_id: 1, created_at: -1 }, { background: true });
    await this.messages.createIndex({ tenant_id: 1, conversation_id: 1 }, { background: true });
    await this.messages.createIndex({ sender_id: 1, created_at: -1 }, { background: true });
    await this.messages.createIndex({ mentions: 1 }, { background: true });
    await this.messages.createIndex({ reply_to: 1, created_at: -1 }, { background: true });
    await this.messages.createIndex({ forwarded_from: 1 }, { background: true });
  }

  async create(message: CreateMessageDto): Promise<Message> {
    const doc: Message = {
      _id: uuidv4(),
      ...message,
      mentions: message.content.text ? this.extractMentions(message.content.text) : [],
      status: MessageStatus.SENDING,
      edited: false,
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.messages.insertOne(doc as any);
    return doc;
  }

  async findById(id: string, tenantId: string): Promise<Message | null> {
    return this.messages.findOne({ _id: id, tenant_id: tenantId, deleted: false });
  }

  async findByConversation(
    conversationId: string,
    tenantId: string,
    options: MessageQueryOptions
  ): Promise<Message[]> {
    const query: any = {
      conversation_id: conversationId,
      tenant_id: tenantId,
    };

    if (!options.include_deleted) {
      query.deleted = false;
    }

    if (options.before) {
      query.created_at = { $lt: new Date(options.before) };
    } else if (options.after) {
      query.created_at = { $gt: new Date(options.after) };
    }

    const limit = options.limit || 50;

    return this.messages
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  async update(id: string, tenantId: string, updates: Partial<Message>): Promise<Message | null> {
    const result = await this.messages.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { $set: { ...updates, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.messages.updateOne(
      { _id: id, tenant_id: tenantId },
      { $set: { deleted: true, deleted_at: new Date(), updated_at: new Date() } }
    );
  }

  async findByMention(userId: string, tenantId: string, limit: number = 50): Promise<Message[]> {
    return this.messages
      .find({
        tenant_id: tenantId,
        mentions: userId,
        deleted: false,
      })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  async findThreadReplies(messageId: string, tenantId: string, limit: number = 50): Promise<Message[]> {
    return this.messages
      .find({
        tenant_id: tenantId,
        reply_to: messageId,
        deleted: false,
      })
      .sort({ created_at: 1 })
      .limit(limit)
      .toArray();
  }

  async incrementThreadCount(messageId: string, tenantId: string): Promise<void> {
    await this.messages.updateOne(
      { _id: messageId, tenant_id: tenantId },
      { $inc: { thread_count: 1 }, $set: { updated_at: new Date() } }
    );
  }

  async updateStatus(id: string, tenantId: string, status: MessageStatus): Promise<void> {
    await this.messages.updateOne(
      { _id: id, tenant_id: tenantId },
      { $set: { status, updated_at: new Date() } }
    );
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }
}
