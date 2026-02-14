import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MongoClient, ObjectId } from 'mongodb';
import { Producer } from 'kafkajs';
import Redis from 'ioredis';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { Config } from '../config/index.js';

interface DownloadContext {
  mongoClient: MongoClient;
  s3Client: S3Client;
  redis: Redis;
  kafkaProducer: Producer;
  config: Config;
}

export async function downloadRoutes(
  fastify: FastifyInstance,
  context: DownloadContext
): Promise<void> {
  const { mongoClient, s3Client, redis, kafkaProducer, config } = context;

  // Direct download
  fastify.get<{ Params: { id: string } }>(
    '/download/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const mediaCollection = db.collection(`tenant_${tenantId}_media_files`);

        // Get file metadata
        const file = await mediaCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!file) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'File not found',
          });
        }

        // Access control check (simplified - can be enhanced)
        if (file.tenant_id !== tenantId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Access denied',
          });
        }

        // Get file from S3
        const command = new GetObjectCommand({
          Bucket: config.s3.bucket,
          Key: file.s3_key,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
          return reply.code(500).send({
            error: 'InternalServerError',
            message: 'Failed to retrieve file',
          });
        }

        // Track download
        await redis.incr(`download:${id}:count`);
        await redis.lpush(
          `download:${id}:history`,
          JSON.stringify({
            user_id: userId,
            timestamp: new Date().toISOString(),
          })
        );
        await redis.ltrim(`download:${id}:history`, 0, 99); // Keep last 100

        // Publish analytics event
        await kafkaProducer.send({
          topic: 'media-events',
          messages: [
            {
              key: id,
              value: JSON.stringify({
                event: 'file.downloaded',
                tenant_id: tenantId,
                file_id: id,
                user_id: userId,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        // Set headers
        reply.header('Content-Type', file.mimetype);
        reply.header('Content-Length', file.size);
        reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
        reply.header('Cache-Control', 'private, max-age=3600');

        // Stream the file
        return reply.send(response.Body);
      } catch (error) {
        request.log.error({ error }, 'Failed to download file');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to download file',
        });
      }
    }
  );

  // Get signed URL
  fastify.get<{ Params: { id: string } }>(
    '/download/:id/signed',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const mediaCollection = db.collection(`tenant_${tenantId}_media_files`);

        // Get file metadata
        const file = await mediaCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!file) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'File not found',
          });
        }

        // Access control check
        if (file.tenant_id !== tenantId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Access denied',
          });
        }

        // Generate signed URL
        const command = new GetObjectCommand({
          Bucket: config.s3.bucket,
          Key: file.s3_key,
        });

        const signedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: config.download.signedUrlExpirySeconds,
        });

        // Track signed URL generation
        await redis.setex(
          `signed:${id}:${userId}`,
          config.download.signedUrlExpirySeconds,
          JSON.stringify({
            generated_at: new Date().toISOString(),
            expires_at: new Date(
              Date.now() + config.download.signedUrlExpirySeconds * 1000
            ).toISOString(),
          })
        );

        return reply.send({
          url: signedUrl,
          expires_in: config.download.signedUrlExpirySeconds,
          expires_at: new Date(
            Date.now() + config.download.signedUrlExpirySeconds * 1000
          ).toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to generate signed URL');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to generate signed URL',
        });
      }
    }
  );

  // Stream with range support
  fastify.get<{ Params: { id: string } }>(
    '/stream/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;
      const range = request.headers.range;

      try {
        const db = mongoClient.db();
        const mediaCollection = db.collection(`tenant_${tenantId}_media_files`);

        // Get file metadata
        const file = await mediaCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!file) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'File not found',
          });
        }

        // Access control check
        if (file.tenant_id !== tenantId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Access denied',
          });
        }

        // Get file size from S3
        const headCommand = new HeadObjectCommand({
          Bucket: config.s3.bucket,
          Key: file.s3_key,
        });

        const headResponse = await s3Client.send(headCommand);
        const fileSize = headResponse.ContentLength || file.size;

        // Handle range request
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = end - start + 1;

          // Get partial content from S3
          const command = new GetObjectCommand({
            Bucket: config.s3.bucket,
            Key: file.s3_key,
            Range: `bytes=${start}-${end}`,
          });

          const response = await s3Client.send(command);

          if (!response.Body) {
            return reply.code(500).send({
              error: 'InternalServerError',
              message: 'Failed to retrieve file',
            });
          }

          // Set headers for partial content
          reply.code(206);
          reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          reply.header('Accept-Ranges', 'bytes');
          reply.header('Content-Length', chunkSize);
          reply.header('Content-Type', file.mimetype);
          reply.header('Cache-Control', 'private, max-age=3600');

          return reply.send(response.Body);
        } else {
          // Full file stream
          const command = new GetObjectCommand({
            Bucket: config.s3.bucket,
            Key: file.s3_key,
          });

          const response = await s3Client.send(command);

          if (!response.Body) {
            return reply.code(500).send({
              error: 'InternalServerError',
              message: 'Failed to retrieve file',
            });
          }

          reply.header('Content-Type', file.mimetype);
          reply.header('Content-Length', fileSize);
          reply.header('Accept-Ranges', 'bytes');
          reply.header('Cache-Control', 'private, max-age=3600');

          return reply.send(response.Body);
        }
      } catch (error) {
        request.log.error({ error }, 'Failed to stream file');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to stream file',
        });
      }
    }
  );

  // Get file metadata
  fastify.get<{ Params: { id: string } }>(
    '/files/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const mediaCollection = db.collection(`tenant_${tenantId}_media_files`);

        const file = await mediaCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!file) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'File not found',
          });
        }

        if (file.tenant_id !== tenantId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Access denied',
          });
        }

        // Get download count
        const downloadCount = await redis.get(`download:${id}:count`);

        return reply.send({
          id: file._id.toString(),
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          checksum: file.checksum,
          uploader_id: file.uploader_id,
          download_count: parseInt(downloadCount || '0', 10),
          created_at: file.created_at.toISOString(),
          updated_at: file.updated_at?.toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get file metadata');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to get file metadata',
        });
      }
    }
  );

  // Delete file
  fastify.delete<{ Params: { id: string } }>(
    '/files/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const mediaCollection = db.collection(`tenant_${tenantId}_media_files`);

        const file = await mediaCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!file) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'File not found',
          });
        }

        // Only uploader can delete
        if (file.uploader_id !== userId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Only the uploader can delete this file',
          });
        }

        // Soft delete in database
        await mediaCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: 'deleted',
              deleted_at: new Date(),
              deleted_by: userId,
            },
          }
        );

        // Publish event
        await kafkaProducer.send({
          topic: 'media-events',
          messages: [
            {
              key: id,
              value: JSON.stringify({
                event: 'file.deleted',
                tenant_id: tenantId,
                file_id: id,
                deleted_by: userId,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(204).send();
      } catch (error) {
        request.log.error({ error }, 'Failed to delete file');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to delete file',
        });
      }
    }
  );
}
