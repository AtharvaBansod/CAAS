import { Collection, Db, ObjectId } from 'mongodb';
import { PinnedMessage } from './pinned-messages.types';

export class PinnedMessagesRepository {
  private pinnedMessages: Collection<PinnedMessage>;

  constructor(db: Db) {
    this.pinnedMessages = db.collection<PinnedMessage>('pinned_messages');
    this.ensureIndexes();
  }

  private async ensureIndexes() {
    await this.pinnedMessages.createIndex({ conversation_id: 1, message_id: 1 }, { unique: true });
    await this.pinnedMessages.createIndex({ conversation_id: 1, order: 1 });
  }

  async pinMessage(pinnedMessage: Omit<PinnedMessage, 'id' | '_id' | 'pinned_at'>): Promise<PinnedMessage> {
    const now = new Date();
    const _id = new ObjectId();
    await this.pinnedMessages.insertOne({
      ...pinnedMessage,
      _id,
      id: _id.toHexString(),
      pinned_at: now,
    } as any);
    return { ...pinnedMessage, id: _id.toHexString(), _id, pinned_at: now };
  }

  async unpinMessage(conversationId: string, messageId: string): Promise<void> {
    await this.pinnedMessages.deleteOne({ conversation_id: conversationId, message_id: messageId });
    // Reorder remaining pinned messages if necessary (more complex, might be handled in service)
  }

  async getPinnedMessages(conversationId: string): Promise<PinnedMessage[]> {
    return this.pinnedMessages.find({ conversation_id: conversationId }).sort({ order: 1 }).toArray();
  }

  async getPinnedMessageCount(conversationId: string): Promise<number> {
    return this.pinnedMessages.countDocuments({ conversation_id: conversationId });
  }
}