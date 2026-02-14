import { Collection, Db, ObjectId } from 'mongodb';
import { MutedUser, BannedUser } from './moderation.types';
import { Conversation } from './conversation.types';

export class ModerationRepository {
  private mutedUsers: Collection<MutedUser>;
  private bannedUsers: Collection<BannedUser>;
  private conversations: Collection<Conversation>;

  constructor(db: Db) {
    this.mutedUsers = db.collection<MutedUser>('muted_users');
    this.bannedUsers = db.collection<BannedUser>('banned_users');
    this.conversations = db.collection<Conversation>('conversations');
    this.ensureIndexes();
  }

  private async ensureIndexes() {
    await this.mutedUsers.createIndex({ conversation_id: 1, user_id: 1 }, { unique: true });
    await this.mutedUsers.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index for temporary mutes
    await this.bannedUsers.createIndex({ conversation_id: 1, user_id: 1 }, { unique: true });
  }

  async muteUser(mutedUser: Omit<MutedUser, 'id' | '_id' | 'muted_at'>): Promise<MutedUser> {
    const now = new Date();
    const _id = new ObjectId();
    await this.mutedUsers.insertOne({
      ...mutedUser,
      _id,
      id: _id.toHexString(),
      muted_at: now,
      is_active: true,
    } as any);
    return { ...mutedUser, id: _id.toHexString(), _id, muted_at: now, is_active: true };
  }

  async unmuteUser(conversationId: string, userId: string): Promise<void> {
    await this.mutedUsers.updateOne(
      { conversation_id: conversationId, user_id: userId },
      { $set: { is_active: false, expires_at: new Date() } } // Set expires_at to now to immediately expire
    );
  }

  async isUserMuted(conversationId: string, userId: string): Promise<boolean> {
    const mutedUser = await this.mutedUsers.findOne({
      conversation_id: conversationId,
      user_id: userId,
      is_active: true,
      $or: [{ expires_at: { $gt: new Date() } }, { expires_at: { $exists: false } }],
    });
    return !!mutedUser;
  }

  async banUser(bannedUser: Omit<BannedUser, 'id' | '_id' | 'banned_at'>): Promise<BannedUser> {
    const now = new Date();
    const _id = new ObjectId();
    await this.bannedUsers.insertOne({
      ...bannedUser,
      _id,
      id: _id.toHexString(),
      banned_at: now,
      is_active: true,
    } as any);
    // Also remove the user from the conversation participants
    await this.conversations.updateOne(
      { _id: new ObjectId(bannedUser.conversation_id) },
      { $pull: { participants: { user_id: bannedUser.user_id } } }
    );
    return { ...bannedUser, id: _id.toHexString(), _id, banned_at: now, is_active: true };
  }

  async unbanUser(conversationId: string, userId: string): Promise<void> {
    await this.bannedUsers.updateOne(
      { conversation_id: conversationId, user_id: userId },
      { $set: { is_active: false } }
    );
  }

  async isUserBanned(conversationId: string, userId: string): Promise<boolean> {
    const bannedUser = await this.bannedUsers.findOne({
      conversation_id: conversationId,
      user_id: userId,
      is_active: true,
    });
    return !!bannedUser;
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    // This would typically involve a message repository, not conversation repository.
    // For now, this is a placeholder. Actual message deletion logic would go here.
    console.log(`Placeholder: Deleting message ${messageId} from conversation ${conversationId}`);
    // In a real system, this would interact with a message service/repository
    // to mark the message as deleted or remove it.
  }
}