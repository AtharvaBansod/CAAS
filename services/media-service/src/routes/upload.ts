import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient, ObjectId } from 'mongodb';
import { Producer } from 'kafkajs';
import Redis from 'ioredis';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { Config } from '../config/index.js';

interface UploadContext {
  mongoClient: MongoClient;
  s3Client: S3Client;
  redis: Redis;
  kafkaProducer: Producer;
  config: Config;
}

export async function uploadRoutes(
  fastify: FastifyInstance,
  context: UploadContext
): Promise<void> {
  const { mongoClient, s3Client, redis, kafkaProducer, config } = context;

  // Single file upload
  fastify.post(
    '/upload',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({
            error: 'BadRequest',
            message: 'No file provided',
          });
        }

        // Validate file size
        const maxSize = config.upload.maxFileSizeMB * 1024 * 1024;
        if (data.file.bytesRead > maxSize) {
          return reply.code(413).send({
            error: 'PayloadTooLarge',
            message: `File size exceeds ${config.upload.maxFileSizeMB}MB limit`,
          });
        }

        // Check tenant quota
        const db = mongoClient.db();
        const quotaCollection = db.collection('tenant_quotas');
        const quota = await quotaCollection.findOne({ tenant_id: tenantId });

        if (quota && quota.storage_used + data.file.bytesRead > quota.storage_limit) {
          return reply.code(429).send({
            error: 'QuotaExceeded',
            message: 'Storage quota exceeded',
          });
        }

        // Generate file metadata
        const fileId = new ObjectId();
        const fileKey = `${tenantId}/${userId}/${fileId}/${data.filename}`;
        const hash = createHash('sha256');

        // Create upload progress tracker
        const uploadId = fileId.toString();
        await redis.set(
          `upload:${uploadId}`,
          JSON.stringify({
            status: 'uploading',
            progress: 0,
            total: data.file.bytesRead,
          }),
          'EX',
          3600
        );

        // Upload to S3 with progress tracking
        const chunks: Buffer[] = [];
        let uploadedBytes = 0;

        data.file.on('data', async (chunk: Buffer) => {
          chunks.push(chunk);
          hash.update(chunk);
          uploadedBytes += chunk.length;

          const progress = Math.floor((uploadedBytes / data.file.bytesRead) * 100);
          await redis.set(
            `upload:${uploadId}`,
            JSON.stringify({
              status: 'uploading',
              progress,
              total: data.file.bytesRead,
              uploaded: uploadedBytes,
            }),
            'EX',
            3600
          );
        });

        await new Promise((resolve, reject) => {
          data.file.on('end', resolve);
          data.file.on('error', reject);
        });

        const fileBuffer = Buffer.concat(chunks);
        const checksum = hash.digest('hex');

        // Upload to S3
        await s3Client.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: data.mimetype,
            Metadata: {
              tenant_id: tenantId,
              uploader_id: userId,
              checksum,
            },
          })
        );

        // Store metadata in MongoDB
        const mediaCollection = db.collection(`tenant_${tenantId}_media_files`);
        const fileMetadata = {
          _id: fileId,
          tenant_id: tenantId,
          uploader_id: userId,
          filename: data.filename,
          mimetype: data.mimetype,
          size: data.file.bytesRead,
          s3_key: fileKey,
          checksum,
          status: 'uploaded',
          created_at: new Date(),
          updated_at: new Date(),
        };

        await mediaCollection.insertOne(fileMetadata);

        // Update quota
        await quotaCollection.updateOne(
          { tenant_id: tenantId },
          {
            $inc: { storage_used: data.file.bytesRead },
            $set: { updated_at: new Date() },
          },
          { upsert: true }
        );

        // Update progress to complete
        await redis.set(
          `upload:${uploadId}`,
          JSON.stringify({
            status: 'completed',
            progress: 100,
            total: data.file.bytesRead,
            uploaded: data.file.bytesRead,
            file_id: uploadId,
          }),
          'EX',
          3600
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'media-events',
          messages: [
            {
              key: uploadId,
              value: JSON.stringify({
                event: 'file.uploaded',
                tenant_id: tenantId,
                file_id: uploadId,
                uploader_id: userId,
                filename: data.filename,
                size: data.file.bytesRead,
                mimetype: data.mimetype,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(201).send({
          id: uploadId,
          filename: data.filename,
          size: data.file.bytesRead,
          mimetype: data.mimetype,
          checksum,
          created_at: fileMetadata.created_at.toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to upload file');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to upload file',
        });
      }
    }
  );

  // Chunked upload - initiate
  fastify.post(
    '/upload/chunk',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;
      const body = request.body as { filename: string; total_size: number; chunk_size: number; mimetype: string };
      const { filename, total_size, chunk_size, mimetype } = body;

      try {
        const uploadId = new ObjectId().toString();

        // Store upload session in Redis
        await redis.set(
          `chunk:${uploadId}`,
          JSON.stringify({
            tenant_id: tenantId,
            uploader_id: userId,
            filename,
            total_size,
            chunk_size,
            mimetype,
            chunks_received: 0,
            total_chunks: Math.ceil(total_size / chunk_size),
            status: 'initiated',
            created_at: new Date().toISOString(),
          }),
          'EX',
          86400 // 24 hours
        );

        return reply.code(201).send({
          upload_id: uploadId,
          chunk_size,
          total_chunks: Math.ceil(total_size / chunk_size),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to initiate chunked upload');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to initiate chunked upload',
        });
      }
    }
  );

  // Upload chunk
  fastify.post<{
    Params: { uploadId: string };
    Querystring: { chunk_number: number };
  }>(
    '/upload/chunk/:uploadId',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { uploadId } = request.params;
      const { chunk_number } = request.query;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        // Get upload session
        const sessionData = await redis.get(`chunk:${uploadId}`);
        if (!sessionData) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Upload session not found',
          });
        }

        const session = JSON.parse(sessionData);

        if (session.tenant_id !== tenantId || session.uploader_id !== userId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Unauthorized access to upload session',
          });
        }

        const data = await request.file();
        if (!data) {
          return reply.code(400).send({
            error: 'BadRequest',
            message: 'No chunk data provided',
          });
        }

        // Store chunk in Redis temporarily
        const chunks: Buffer[] = [];
        data.file.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        await new Promise((resolve, reject) => {
          data.file.on('end', resolve);
          data.file.on('error', reject);
        });

        const chunkBuffer = Buffer.concat(chunks);
        await redis.setex(
          `chunk:${uploadId}:${chunk_number}`,
          86400,
          chunkBuffer.toString('base64')
        );

        // Update session
        session.chunks_received++;
        await redis.set(`chunk:${uploadId}`, JSON.stringify(session), 'EX', 86400);

        return reply.send({
          chunk_number,
          received: true,
          total_received: session.chunks_received,
          total_chunks: session.total_chunks,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to upload chunk');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to upload chunk',
        });
      }
    }
  );

  // Complete chunked upload
  fastify.post<{ Params: { uploadId: string } }>(
    '/upload/complete/:uploadId',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { uploadId } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const sessionData = await redis.get(`chunk:${uploadId}`);
        if (!sessionData) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Upload session not found',
          });
        }

        const session = JSON.parse(sessionData);

        if (session.chunks_received !== session.total_chunks) {
          return reply.code(400).send({
            error: 'BadRequest',
            message: 'Not all chunks received',
            received: session.chunks_received,
            expected: session.total_chunks,
          });
        }

        // Reassemble chunks
        const chunks: Buffer[] = [];
        for (let i = 0; i < session.total_chunks; i++) {
          const chunkData = await redis.get(`chunk:${uploadId}:${i}`);
          if (!chunkData) {
            return reply.code(400).send({
              error: 'BadRequest',
              message: `Chunk ${i} not found`,
            });
          }
          chunks.push(Buffer.from(chunkData, 'base64'));
        }

        const fileBuffer = Buffer.concat(chunks);
        const checksum = createHash('sha256').update(fileBuffer).digest('hex');

        // Upload to S3
        const fileKey = `${tenantId}/${userId}/${uploadId}/${session.filename}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: session.mimetype,
            Metadata: {
              tenant_id: tenantId,
              uploader_id: userId,
              checksum,
            },
          })
        );

        // Store metadata
        const db = mongoClient.db();
        const mediaCollection = db.collection(`tenant_${tenantId}_media_files`);
        const fileMetadata = {
          _id: new ObjectId(uploadId),
          tenant_id: tenantId,
          uploader_id: userId,
          filename: session.filename,
          mimetype: session.mimetype,
          size: session.total_size,
          s3_key: fileKey,
          checksum,
          status: 'uploaded',
          created_at: new Date(),
          updated_at: new Date(),
        };

        await mediaCollection.insertOne(fileMetadata);

        // Clean up chunks
        for (let i = 0; i < session.total_chunks; i++) {
          await redis.del(`chunk:${uploadId}:${i}`);
        }
        await redis.del(`chunk:${uploadId}`);

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'media-events',
          messages: [
            {
              key: uploadId,
              value: JSON.stringify({
                event: 'file.uploaded',
                tenant_id: tenantId,
                file_id: uploadId,
                uploader_id: userId,
                filename: session.filename,
                size: session.total_size,
                mimetype: session.mimetype,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.send({
          id: uploadId,
          filename: session.filename,
          size: session.total_size,
          mimetype: session.mimetype,
          checksum,
          created_at: fileMetadata.created_at.toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to complete chunked upload');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to complete chunked upload',
        });
      }
    }
  );

  // Get upload progress
  fastify.get<{ Params: { id: string } }>(
    '/upload/:id/progress',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const progressData = await redis.get(`upload:${id}`);
        if (!progressData) {
          const chunkData = await redis.get(`chunk:${id}`);
          if (!chunkData) {
            return reply.code(404).send({
              error: 'NotFound',
              message: 'Upload not found',
            });
          }

          const session = JSON.parse(chunkData);
          return reply.send({
            upload_id: id,
            status: session.status,
            progress: Math.floor((session.chunks_received / session.total_chunks) * 100),
            chunks_received: session.chunks_received,
            total_chunks: session.total_chunks,
          });
        }

        return reply.send(JSON.parse(progressData));
      } catch (error) {
        request.log.error({ error }, 'Failed to get upload progress');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to get upload progress',
        });
      }
    }
  );
}
