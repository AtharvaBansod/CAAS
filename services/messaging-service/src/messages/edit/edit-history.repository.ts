// Edit history repository for tracking message edits
import { Db, Collection } from 'mongodb';
import { EditHistory } from '../message.types';
import { v4 as uuidv4 } from 'uuid';

export class EditHistoryRepository {
  private editHistory: Collection<EditHistory>;

  constructor(private db: Db) {
    this.editHistory = db.collection<EditHistory>('message_edit_history');
    this.ensureIndexes();
  }

  private async ensureIndexes() {
    await this.editHistory.createIndex(
      { message_id: 1, edited_at: -1 },
      { background: true }
    );
  }

  async add(history: Omit<EditHistory, '_id'>): Promise<EditHistory> {
    const doc: EditHistory = {
      _id: uuidv4(),
      ...history,
    };

    await this.editHistory.insertOne(doc as any);
    return doc;
  }

  async findByMessage(messageId: string, limit: number = 10): Promise<EditHistory[]> {
    return this.editHistory
      .find({ message_id: messageId })
      .sort({ edited_at: -1 })
      .limit(limit)
      .toArray();
  }
}
