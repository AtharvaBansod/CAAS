import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

export async function mediaRoutes(fastify: FastifyInstance) {
  // Upload single file
  fastify.post('/upload', {
    schema: {
      description: 'Upload a single media file',
      tags: ['media'],
      consumes: ['multipart/form-data'],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call media service for upload
      return reply.status(201).send({
        id: 'media_' + Date.now(),
        status: 'uploaded',
        message: 'File uploaded successfully',
      });
    },
  });

  // Get media metadata
  fastify.get('/:id', {
    schema: {
      description: 'Get media metadata',
      tags: ['media'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call media service
      return reply.status(404).send({ error: 'Media not found' });
    },
  });

  // List user's media
  fastify.get('/', {
    schema: {
      description: 'List user media',
      tags: ['media'],
      querystring: z.object({
        limit: z.string().optional(),
        skip: z.string().optional(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Querystring: { limit?: string; skip?: string };
    }>, reply: FastifyReply) => {
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call media service
      return reply.send({ media: [], total: 0 });
    },
  });

  // Get signed URL for media
  fastify.get('/:id/url', {
    schema: {
      description: 'Get signed URL for media access',
      tags: ['media'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call media service for signed URL
      return reply.send({
        url: `http://example.com/media/${id}`,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
    },
  });

  // Download media
  fastify.get('/:id/download', {
    schema: {
      description: 'Download media file',
      tags: ['media'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call media service for download URL
      return reply.redirect(302, `http://example.com/media/${id}`);
    },
  });

  // Delete media
  fastify.delete('/:id', {
    schema: {
      description: 'Delete media file',
      tags: ['media'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call media service
      return reply.status(204).send();
    },
  });

  // Get storage quota
  fastify.get('/quota', {
    schema: {
      description: 'Get storage quota usage',
      tags: ['media'],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call media service
      return reply.send({
        used: 0,
        limit: 1073741824, // 1GB
        remaining: 1073741824,
      });
    },
  });
}
