import { Collection, Db, ObjectId } from 'mongodb';
import { Media } from './media.types';

export class MediaRepository {
  private collection: Collection<Media>;

  constructor(db: Db) {
    this.collection = db.collection('media');
    this.createIndexes();
  }

  private async createIndexes() {
    await this.collection.createIndex({ tenant_id: 1, user_id: 1, created_at: -1 });
    await this.collection.createIndex({ key: 1 }, { unique: true });
    await this.collection.createIndex({ tenant_id: 1, attached_to: 1, created_at: 1 });
    await this.collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    await this.collection.createIndex({ status: 1, created_at: 1 });
  }

  async create(data: Partial<Media>): Promise<Media> {
    const media: Media = {
      id: new ObjectId().toString(),
      tenant_id: data.tenant_id!,
      user_id: data.user_id!,
      key: data.key!,
      filename: data.filename!,
      mime_type: data.mime_type!,
      size: data.size!,
      type: data.type!,
      status: 'uploaded',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.collection.insertOne(media as any);
    return media;
  }

  async findById(id: string, tenantId: string): Promise<Media | null> {
    return this.collection.findOne({ id, tenant_id: tenantId }) as Promise<Media | null>;
  }

  async findByKey(key: string): Promise<Media | null> {
    return this.collection.findOne({ key }) as Promise<Media | null>;
  }

  async findByUser(
    userId: string,
    tenantId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<Media[]> {
    return this.collection
      .find({ user_id: userId, tenant_id: tenantId })
      .sort({ created_at: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .toArray() as Promise<Media[]>;
  }

  async updateStatus(
    id: string,
    status: Media['status'],
    metadata?: Partial<Media>
  ): Promise<Media | null> {
    const update: any = {
      status,
      updated_at: new Date(),
      ...metadata,
    };

    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: 'after' }
    );

    return result as Media | null;
  }

  async attachToMessage(id: string, messageId: string): Promise<void> {
    await this.collection.updateOne(
      { id },
      { $set: { attached_to: messageId, updated_at: new Date() } }
    );
  }

  async findOrphaned(olderThan: Date): Promise<Media[]> {
    return this.collection
      .find({
        attached_to: { $exists: false },
        created_at: { $lt: olderThan },
      })
      .toArray() as Promise<Media[]>;
  }

  async findExpired(): Promise<Media[]> {
    return this.collection
      .find({
        expires_at: { $exists: true, $lt: new Date() },
      })
      .toArray() as Promise<Media[]>;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.collection.deleteOne({ id, tenant_id: tenantId });
  }

  async getTotalSize(tenantId: string): Promise<number> {
    const result = await this.collection
      .aggregate([
        { $match: { tenant_id: tenantId } },
        { $group: { _id: null, total: { $sum: '$size' } } },
      ])
      .toArray();

    return result[0]?.total || 0;
  }
}
