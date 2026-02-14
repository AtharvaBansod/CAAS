import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { MediaRepository } from '../media/media.repository';
import { Media } from '../media/media.types';
import { storageConfig } from '../config/storage.config';

export class MediaCleanupService {
  private s3Client: S3Client;

  constructor(private mediaRepo: MediaRepository) {
    this.s3Client = new S3Client({
      endpoint: storageConfig.endpoint,
      region: storageConfig.region,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
      forcePathStyle: storageConfig.forcePathStyle,
    });
  }

  async cleanupOrphanedMedia(): Promise<{ deleted: number }> {
    // Find media not attached to any message after 24 hours
    const orphanedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orphaned = await this.mediaRepo.findOrphaned(orphanedAfter);

    for (const media of orphaned) {
      await this.deleteMedia(media);
    }

    return { deleted: orphaned.length };
  }

  async cleanupExpiredMedia(): Promise<{ deleted: number }> {
    // Find media past retention period
    const expired = await this.mediaRepo.findExpired();

    for (const media of expired) {
      await this.deleteMedia(media);
    }

    return { deleted: expired.length };
  }

  private async deleteMedia(media: Media): Promise<void> {
    try {
      // Delete from S3
      await this.deleteFromS3(media.key);

      if (media.thumbnail_key) {
        await this.deleteFromS3(media.thumbnail_key);
      }

      if (media.preview_key) {
        await this.deleteFromS3(media.preview_key);
      }

      if (media.processed_key) {
        await this.deleteFromS3(media.processed_key);
      }

      // Delete from database
      await this.mediaRepo.delete(media.id, media.tenant_id);
    } catch (error) {
      console.error(`Failed to delete media ${media.id}:`, error);
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
