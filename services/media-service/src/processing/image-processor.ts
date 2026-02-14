import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { storageConfig, mediaConfig } from '../config/storage.config';
import { Media, ProcessingResult } from '../media/media.types';
import { Readable } from 'stream';

export class ImageProcessor {
  private s3Client: S3Client;

  constructor() {
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

  async process(media: Media): Promise<ProcessingResult> {
    // Download from S3
    const buffer = await this.downloadFromS3(media.key);

    // Process image
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // 1. Fix orientation
    image.rotate();

    // 2. Strip EXIF data (privacy)
    image.withMetadata({
      exif: {} as any,
    });

    // 3. Generate thumbnail
    const thumbnail = await image
      .clone()
      .resize(mediaConfig.thumbnailSize.width, mediaConfig.thumbnailSize.height, {
        fit: 'cover',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // 4. Generate preview (for galleries)
    const preview = await image
      .clone()
      .resize(mediaConfig.previewSize.width, mediaConfig.previewSize.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Upload processed versions
    const thumbnailKey = `${media.key}_thumb.jpg`;
    const previewKey = `${media.key}_preview.jpg`;

    await this.uploadToS3(thumbnail, thumbnailKey, 'image/jpeg');
    await this.uploadToS3(preview, previewKey, 'image/jpeg');

    return {
      dimensions: { width: metadata.width!, height: metadata.height! },
      thumbnail_key: thumbnailKey,
      preview_key: previewKey,
    };
  }

  private async downloadFromS3(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as Readable;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  private async uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
  }
}
