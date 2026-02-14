import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Redis } from 'ioredis';
import { storageConfig } from '../config/storage.config';
import { Media, SignedUrlOptions, MediaUrls } from '../media/media.types';

export class SignedUrlService {
  private s3Client: S3Client;

  constructor(private redis: Redis) {
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

  async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    const cacheKey = `signed_url:${key}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate signed URL
    const command = new GetObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      ResponseContentType: options.contentType,
      ResponseContentDisposition: options.download
        ? `attachment; filename="${options.filename || key}"`
        : 'inline',
    });

    const expiresIn = options.expiresIn || storageConfig.signedUrlExpiry;
    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    // Cache URL (expire 1 minute before URL expires)
    await this.redis.setex(cacheKey, expiresIn - 60, url);

    return url;
  }

  async getMediaUrls(media: Media): Promise<MediaUrls> {
    const urls: MediaUrls = {
      url: await this.getSignedUrl(media.key),
    };

    if (media.thumbnail_key) {
      urls.thumbnail_url = await this.getSignedUrl(media.thumbnail_key);
    }

    if (media.preview_key) {
      urls.preview_url = await this.getSignedUrl(media.preview_key);
    }

    return urls;
  }
}
