import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getMediaClient } from '../../services/media-client.js';

export async function mediaRoutes(fastify: FastifyInstance) {
  const mediaClient = getMediaClient();

  // Upload file
  fastify.post(
    '/upload',
    {
      schema: {
        description: 'Upload a file',
        tags: ['media'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({
            error: 'BadRequest',
            message: 'No file provided',
          });
        }

        // Collect file data
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }

        const fileBuffer = Buffer.concat(chunks);

        const result = await mediaClient.uploadFile(token, {
          data: fileBuffer,
          filename: data.filename,
          mimetype: data.mimetype,
        });

        return reply.code(201).send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to upload file');
        return reply.code(error.status || 500).send({
          error: 'Failed to upload file',
          message: error.message,
        });
      }
    }
  );

  // Initiate chunked upload
  fastify.post<{
    Body: {
      filename: string;
      total_size: number;
      chunk_size: number;
      mimetype: string;
    };
  }>(
    '/upload/chunk',
    {
      schema: {
        description: 'Initiate chunked upload',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await mediaClient.initiateChunkedUpload(
          token,
          request.body.filename,
          request.body.total_size,
          request.body.chunk_size,
          request.body.mimetype
        );

        return reply.code(201).send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to initiate chunked upload');
        return reply.code(error.status || 500).send({
          error: 'Failed to initiate chunked upload',
          message: error.message,
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
      schema: {
        description: 'Upload a chunk',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const { uploadId } = request.params;
      const { chunk_number } = request.query;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({
            error: 'BadRequest',
            message: 'No chunk data provided',
          });
        }

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }

        const chunkBuffer = Buffer.concat(chunks);

        const result = await mediaClient.uploadChunk(
          token,
          uploadId,
          chunk_number,
          chunkBuffer
        );

        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to upload chunk');
        return reply.code(error.status || 500).send({
          error: 'Failed to upload chunk',
          message: error.message,
        });
      }
    }
  );

  // Complete chunked upload
  fastify.post<{ Params: { uploadId: string } }>(
    '/upload/complete/:uploadId',
    {
      schema: {
        description: 'Complete chunked upload',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const { uploadId } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await mediaClient.completeChunkedUpload(token, uploadId);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to complete chunked upload');
        return reply.code(error.status || 500).send({
          error: 'Failed to complete chunked upload',
          message: error.message,
        });
      }
    }
  );

  // Get upload progress
  fastify.get<{ Params: { uploadId: string } }>(
    '/upload/:uploadId/progress',
    {
      schema: {
        description: 'Get upload progress',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const { uploadId } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await mediaClient.getUploadProgress(token, uploadId);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to get upload progress');
        return reply.code(error.status || 500).send({
          error: 'Failed to get upload progress',
          message: error.message,
        });
      }
    }
  );

  // Download file
  fastify.get<{ Params: { id: string } }>(
    '/download/:id',
    {
      schema: {
        description: 'Download a file',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const stream = await mediaClient.downloadFile(token, id);
        return reply.send(stream);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to download file');
        return reply.code(error.status || 500).send({
          error: 'Failed to download file',
          message: error.message,
        });
      }
    }
  );

  // Get signed URL
  fastify.get<{ Params: { id: string } }>(
    '/download/:id/signed',
    {
      schema: {
        description: 'Get signed download URL',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await mediaClient.getSignedUrl(token, id);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to get signed URL');
        return reply.code(error.status || 500).send({
          error: 'Failed to get signed URL',
          message: error.message,
        });
      }
    }
  );

  // Stream file
  fastify.get<{ Params: { id: string } }>(
    '/stream/:id',
    {
      schema: {
        description: 'Stream a file with range support',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';
      const range = request.headers.range;

      try {
        const stream = await mediaClient.streamFile(token, id, range);
        return reply.send(stream);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to stream file');
        return reply.code(error.status || 500).send({
          error: 'Failed to stream file',
          message: error.message,
        });
      }
    }
  );

  // Get file metadata
  fastify.get<{ Params: { id: string } }>(
    '/files/:id',
    {
      schema: {
        description: 'Get file metadata',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await mediaClient.getFileMetadata(token, id);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to get file metadata');
        return reply.code(error.status || 500).send({
          error: 'Failed to get file metadata',
          message: error.message,
        });
      }
    }
  );

  // Delete file
  fastify.delete<{ Params: { id: string } }>(
    '/files/:id',
    {
      schema: {
        description: 'Delete a file',
        tags: ['media'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        await mediaClient.deleteFile(token, id);
        return reply.code(204).send();
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to delete file');
        return reply.code(error.status || 500).send({
          error: 'Failed to delete file',
          message: error.message,
        });
      }
    }
  );
}
