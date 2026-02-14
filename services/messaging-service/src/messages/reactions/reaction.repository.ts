// Reaction repository for database operations
import { Db, Collection } from 'mongodb';
import { Reaction, ReactionSummary } from '../message.types';
import { v4 as uuidv4 } from 'uuid';

export class ReactionRepository {
  private reactions: Collection<Reaction>;

  constructor(private db: Db) {
    this.reactions = db.collection<Reaction>('message_reactions');
    this.ensureIndexes();
  }

  private async ensureIndexes() {
    await this.reactions.createIndex(
      { message_id: 1, user_id: 1 },
      { unique: true, background: true }
    );
    await this.reactions.createIndex({ message_id: 1, emoji: 1 }, { background: true });
  }

  async add(reaction: Omit<Reaction, '_id'>): Promise<Reaction> {
    const doc: Reaction = {
      _id: uuidv4(),
      ...reaction,
    };

    await this.reactions.insertOne(doc as any);
    return doc;
  }

  async findByUserAndMessage(userId: string, messageId: string): Promise<Reaction | null> {
    return this.reactions.findOne({ user_id: userId, message_id: messageId });
  }

  async remove(userId: string, messageId: string): Promise<void> {
    await this.reactions.deleteOne({ user_id: userId, message_id: messageId });
  }

  async getReactionSummary(messageId: string, currentUserId?: string): Promise<ReactionSummary> {
    const reactions = await this.reactions.find({ message_id: messageId }).toArray();

    const summary: ReactionSummary = {};

    for (const reaction of reactions) {
      if (!summary[reaction.emoji]) {
        summary[reaction.emoji] = {
          count: 0,
          users: [],
          user_reacted: false,
        };
      }

      summary[reaction.emoji].count++;
      summary[reaction.emoji].users.push(reaction.user_id);

      if (currentUserId && reaction.user_id === currentUserId) {
        summary[reaction.emoji].user_reacted = true;
      }
    }

    return summary;
  }

  async getReactionsByMessage(messageId: string): Promise<Reaction[]> {
    return this.reactions.find({ message_id: messageId }).toArray();
  }
}
