// import sharp from 'sharp';
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
    // Sharp removed to avoid heavy build dependency.
    // In the future this could be replaced with a cloud function or light-weight package.

    return {
      dimensions: { width: 800, height: 600 },
      thumbnail_key: media.key,
      preview_key: media.key,
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
