import { Collection, Db } from 'mongodb';
import { UserConversationSettings, MuteStatus, ArchiveStatus, PinStatus, DeleteStatus } from './user-settings.types';

export class UserSettingsRepository {
  private collection: Collection<UserConversationSettings>;

  constructor(db: Db) {
    this.collection = db.collection<UserConversationSettings>('conversation_user_settings');
    this.createIndexes();
  }

  private async createIndexes() {
    await this.collection.createIndex({ user_id: 1, conversation_id: 1 }, { unique: true });
    await this.collection.createIndex({ muted_until: 1 }, { expireAfterSeconds: 0 });
    // Index for finding pinned conversations quickly
    await this.collection.createIndex({ user_id: 1, is_pinned: 1, pin_order: 1 });
    // Index for finding archived conversations
    await this.collection.createIndex({ user_id: 1, is_archived: 1 });
    // Index for finding deleted conversations (or excluding them)
    await this.collection.createIndex({ user_id: 1, is_deleted: 1 });
  }

  async createOrUpdateUserSettings(
    userId: string,
    conversationId: string,
    settings: Partial<UserConversationSettings>,
  ): Promise<void> {
    await this.collection.updateOne(
      { user_id: userId, conversation_id: conversationId },
      { $set: { ...settings, user_id: userId, conversation_id: conversationId } },
      { upsert: true },
    );
  }

  async getUserSettings(userId: string, conversationId: string): Promise<UserConversationSettings | null> {
    return this.collection.findOne({ user_id: userId, conversation_id: conversationId });
  }

  async deleteMuteStatus(userId: string, conversationId: string): Promise<void> {
    await this.collection.updateOne(
      { user_id: userId, conversation_id: conversationId },
      { $unset: { muted_at: "", muted_until: "", show_notifications: "", mention_exceptions: "" } }
    );
  }

  async getMuteStatus(userId: string, conversationId: string): Promise<MuteStatus | null> {
    const doc = await this.getUserSettings(userId, conversationId);
    if (!doc || !doc.muted_at) return null;
    return {
      user_id: doc.user_id,
      conversation_id: doc.conversation_id,
      muted_at: doc.muted_at,
      muted_until: doc.muted_until,
      show_notifications: doc.show_notifications ?? true,
      mention_exceptions: doc.mention_exceptions ?? false
    };
  }

  async getMutedConversations(userId: string): Promise<MuteStatus[]> {
    const docs = await this.collection.find({ user_id: userId, muted_until: { $exists: true } }).toArray();
    return docs.map(doc => ({
      user_id: doc.user_id,
      conversation_id: doc.conversation_id,
      muted_at: doc.muted_at!,
      muted_until: doc.muted_until,
      show_notifications: doc.show_notifications ?? true,
      mention_exceptions: doc.mention_exceptions ?? false
    }));
  }

  async getArchiveStatus(userId: string, conversationId: string): Promise<ArchiveStatus | null> {
    const doc = await this.getUserSettings(userId, conversationId);
    if (!doc) return null;
    return {
      user_id: doc.user_id,
      conversation_id: doc.conversation_id,
      is_archived: doc.is_archived ?? false,
      archived_at: doc.archived_at
    };
  }

  async getArchivedConversations(userId: string): Promise<ArchiveStatus[]> {
    const docs = await this.collection.find({ user_id: userId, is_archived: true }).toArray();
    return docs.map(doc => ({
      user_id: doc.user_id,
      conversation_id: doc.conversation_id,
      is_archived: true,
      archived_at: doc.archived_at
    }));
  }

  async getPinnedConversations(userId: string): Promise<PinStatus[]> {
    // Sort by pin_order (ascending or descending - let's assume smaller number is higher/top)
    const docs = await this.collection.find({ user_id: userId, is_pinned: true }).sort({ pin_order: 1 }).toArray();
    return docs.map(doc => ({
      user_id: doc.user_id,
      conversation_id: doc.conversation_id,
      is_pinned: true,
      pinned_at: doc.pinned_at,
      pin_order: doc.pin_order
    }));
  }

  async getDeletedConversations(userId: string): Promise<DeleteStatus[]> {
    const docs = await this.collection.find({ user_id: userId, is_deleted: true }).toArray();
    return docs.map(doc => ({
      user_id: doc.user_id,
      conversation_id: doc.conversation_id,
      is_deleted: true,
      deleted_at: doc.deleted_at,
      cleared_history_at: doc.cleared_history_at
    }));
  }

  async findDeletedOlderThan(thresholdDate: Date): Promise<UserConversationSettings[]> {
    return this.collection.find({
      is_deleted: true,
      deleted_at: { $lt: thresholdDate }
    }).toArray();
  }

  async hardDelete(userId: string, conversationId: string): Promise<void> {
    await this.collection.deleteOne({ user_id: userId, conversation_id: conversationId });
  }
}