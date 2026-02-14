import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { MediaRepository } from '../media/media.repository';
import { MediaValidator } from '../validation/media-validator';
import { UploadResult } from '../media/media.types';
import { storageConfig } from '../config/storage.config';
import { Kafka, Producer } from 'kafkajs';

export class UploadService {
  private s3Client: S3Client;
  private kafkaProducer: Producer;

  constructor(
    private mediaRepo: MediaRepository,
    private validator: MediaValidator,
    kafka: Kafka
  ) {
    this.s3Client = new S3Client({
      endpoint: storageConfig.endpoint,
      region: storageConfig.region,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
      forcePathStyle: storageConfig.forcePathStyle,
    });

    this.kafkaProducer = kafka.producer();
    this.initKafka();
  }

  private async initKafka() {
    await this.kafkaProducer.connect();
  }

  async uploadFile(
    tenantId: string,
    userId: string,
    file: { filename: string; mimetype: string; file: Buffer }
  ): Promise<UploadResult> {
    // 1. Validate file
    await this.validator.validate(file);

    // 2. Generate unique key
    const key = this.generateKey(tenantId, file.filename);

    // 3. Upload to S3
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: storageConfig.bucket,
        Key: key,
        Body: file.file,
        ContentType: file.mimetype,
        Metadata: {
          'tenant-id': tenantId,
          'user-id': userId,
          'original-name': file.filename,
        },
      },
    });

    await upload.done();

    // 4. Create media record
    const mediaType = this.validator.getMediaType(file.mimetype);
    const media = await this.mediaRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      key,
      filename: file.filename,
      mime_type: file.mimetype,
      size: file.file.length,
      type: mediaType,
      status: 'uploaded',
    });

    // 5. Queue for processing
    await this.kafkaProducer.send({
      topic: 'media-processing',
      messages: [
        {
          key: media.id,
          value: JSON.stringify({
            type: 'media.uploaded',
            data: media,
          }),
        },
      ],
    });

    return {
      id: media.id,
      key: media.key,
      filename: media.filename,
      mime_type: media.mime_type,
      size: media.size,
      type: media.type,
      status: media.status,
      created_at: media.created_at,
    };
  }

  private generateKey(tenantId: string, filename: string): string {
    const date = new Date().toISOString().slice(0, 10);
    const uuid = uuidv4();
    const ext = path.extname(filename);
    return `${tenantId}/${date}/${uuid}${ext}`;
  }

  async shutdown() {
    await this.kafkaProducer.disconnect();
  }
}
