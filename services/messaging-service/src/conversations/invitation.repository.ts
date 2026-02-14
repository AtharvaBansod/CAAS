import { Collection, Db, ObjectId } from 'mongodb';
import { Conversation, ParticipantRole } from './conversation.types';
import { InviteLink } from './invitation.types';

export class InvitationRepository {
  private invites: Collection<InviteLink>;
  private conversations: Collection<Conversation>;

  constructor(db: Db) {
    this.invites = db.collection<InviteLink>('conversation_invites');
    this.conversations = db.collection<Conversation>('conversations');
    this.ensureIndexes();
  }

  private async ensureIndexes() {
    await this.invites.createIndex({ code: 1, tenant_id: 1 }, { unique: true });
    await this.invites.createIndex({ conversation_id: 1, tenant_id: 1 });
    await this.invites.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index
  }

  async createInviteLink(inviteLink: Omit<InviteLink, 'id' | '_id' | 'created_at' | 'updated_at'>, tenantId: string): Promise<InviteLink> {
    const now = new Date();
    const _id = new ObjectId();
    const document = {
      ...inviteLink,
      _id,
      id: _id.toHexString(),
      tenant_id: tenantId,
      created_at: now,
      updated_at: now,
    } as any;
    await this.invites.insertOne(document);
    return document;
  }

  async findInviteLinkByCode(code: string): Promise<InviteLink | null> {
    return this.invites.findOne({ code, is_active: true });
  }

  async findInviteLinkById(id: string, tenantId: string): Promise<InviteLink | null> {
    return this.invites.findOne({ _id: new ObjectId(id), tenant_id: tenantId, is_active: true });
  }

  async revokeInviteLink(id: string): Promise<void> {
    await this.invites.updateOne(
      { _id: new ObjectId(id) },
      { $set: { is_active: false, updated_at: new Date() } }
    );
  }

  async incrementInviteLinkUses(id: string): Promise<void> {
    await this.invites.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { uses: 1 }, $set: { updated_at: new Date() } }
    );
  }

  async getInviteLinksForConversation(conversationId: string, tenantId: string): Promise<InviteLink[]> {
    return this.invites.find({ conversation_id: conversationId, tenant_id: tenantId }).toArray();
  }

  async addParticipantToConversation(conversationId: string, userId: string, role: ParticipantRole = 'member'): Promise<void> {
    await this.conversations.updateOne(
      { _id: new ObjectId(conversationId), 'participants.user_id': { $ne: userId } },
      {
        $push: {
          participants: {
            user_id: userId,
            role: role,
            joined_at: new Date(),
            notifications: 'all',
          },
        },
        $set: { updated_at: new Date() },
      }
    );
  }

  async findConversationById(id: string, tenantId: string): Promise<Conversation | null> {
    return this.conversations.findOne({ _id: new ObjectId(id), tenant_id: tenantId });
  }
}