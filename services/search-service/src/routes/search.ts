import { FastifyInstance } from 'fastify';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import Redis from 'ioredis';

// JSON Schema for querystring (Fastify native - avoids Zod conversion issues)
const searchQuerySchema = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string', minLength: 1 },
    tenant_id: { type: 'string' },
    conversation_id: { type: 'string' },
    author: { type: 'string' },
    from_date: { type: 'string' },
    to_date: { type: 'string' },
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
    cursor: { type: 'string' },
  },
};

interface SearchContext {
  esClient: ElasticsearchClient;
  redis: Redis;
}

export async function searchRoutes(
  fastify: FastifyInstance,
  context: SearchContext
): Promise<void> {
  const { esClient, redis } = context;

  // Rate limiting map
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  function checkRateLimit(userId: string, limit: number = 60): boolean {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);

    if (!userLimit || userLimit.resetAt < now) {
      rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (userLimit.count >= limit) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  // Search messages
  fastify.get(
    '/search/messages',
    {
      schema: {
        querystring: searchQuerySchema,
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.user_id || 'anonymous';
      const tenantId = (request as any).user?.tenant_id;

      if (!checkRateLimit(userId)) {
        return reply.code(429).send({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
        });
      }

      const { q, conversation_id, author, from_date, to_date, limit, cursor } = request.query as any;
      const limitVal = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 20;

      try {
        // Build Elasticsearch query
        const must: any[] = [
          { match: { content: q } },
        ];

        if (tenantId) {
          must.push({ term: { tenant_id: tenantId } });
        }

        if (conversation_id) {
          must.push({ term: { conversation_id } });
        }

        if (author) {
          must.push({ term: { sender_id: author } });
        }

        if (from_date || to_date) {
          const range: any = {};
          if (from_date) range.gte = from_date;
          if (to_date) range.lte = to_date;
          must.push({ range: { created_at: range } });
        }

        const searchAfter = cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined;

        const result = await esClient.search({
          index: 'messages',
          query: { bool: { must } },
          size: limitVal,
          sort: [{ created_at: { order: 'desc' as const } }, { _id: { order: 'desc' as const } }],
          search_after: searchAfter,
          highlight: {
            fields: {
              content: {
                pre_tags: ['<mark>'],
                post_tags: ['</mark>'],
              },
            },
          },
        });

        const hits = result.hits.hits;
        const messages = hits.map((hit: any) => ({
          id: hit._id,
          ...hit._source,
          highlight: hit.highlight?.content?.[0],
          score: hit._score,
        }));

        const nextCursor =
          hits.length === limitVal
            ? Buffer.from(JSON.stringify(hits[hits.length - 1].sort)).toString('base64')
            : null;

        // Track search
        await redis.lpush(
          `search:recent:${userId}`,
          JSON.stringify({
            query: q,
            type: 'messages',
            timestamp: new Date().toISOString(),
          })
        );
        await redis.ltrim(`search:recent:${userId}`, 0, 9); // Keep last 10

        return reply.send({
          results: messages,
          cursor: nextCursor,
          has_more: hits.length === limitVal,
          total: result.hits.total,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to search messages');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to search messages',
        });
      }
    }
  );

  // Search conversations
  fastify.get(
    '/search/conversations',
    {
      schema: {
        querystring: searchQuerySchema,
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.user_id || 'anonymous';
      const tenantId = (request as any).user?.tenant_id;

      if (!checkRateLimit(userId)) {
        return reply.code(429).send({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
        });
      }

      const { q, limit, cursor } = request.query as any;
      const limitVal = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 20;

      try {
        const must: any[] = [
          {
            multi_match: {
              query: q,
              fields: ['name^2', 'description'],
            },
          },
        ];

        if (tenantId) {
          must.push({ term: { tenant_id: tenantId } });
        }

        const searchAfter = cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined;

        const result = await esClient.search({
          index: 'conversations',
          query: { bool: { must } },
          size: limitVal,
          sort: [{ updated_at: { order: 'desc' as const } }, { _id: { order: 'desc' as const } }],
          search_after: searchAfter,
          highlight: {
            fields: {
              name: {},
              description: {},
            },
          },
        });

        const hits = result.hits.hits;
        const conversations = hits.map((hit: any) => ({
          id: hit._id,
          ...hit._source,
          highlight: hit.highlight,
          score: hit._score,
        }));

        const nextCursor =
          hits.length === limit
            ? Buffer.from(JSON.stringify(hits[hits.length - 1].sort)).toString('base64')
            : null;

        return reply.send({
          results: conversations,
          cursor: nextCursor,
          has_more: hits.length === limit,
          total: result.hits.total,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to search conversations');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to search conversations',
        });
      }
    }
  );

  // Search users
  fastify.get(
    '/search/users',
    {
      schema: {
        querystring: searchQuerySchema,
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.user_id || 'anonymous';
      const tenantId = (request as any).user?.tenant_id;

      if (!checkRateLimit(userId)) {
        return reply.code(429).send({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
        });
      }

      const { q, limit, cursor } = request.query as any;
      const limitVal = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 20;

      try {
        const must: any[] = [
          {
            multi_match: {
              query: q,
              fields: ['username^2', 'display_name', 'email'],
            },
          },
        ];

        if (tenantId) {
          must.push({ term: { tenant_id: tenantId } });
        }

        const searchAfter = cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined;

        const result = await esClient.search({
          index: 'users',
          query: { bool: { must } },
          size: limitVal,
          sort: [{ _score: { order: 'desc' as const } }, { _id: { order: 'desc' as const } }],
          search_after: searchAfter,
        });

        const hits = result.hits.hits;
        const users = hits.map((hit: any) => ({
          id: hit._id,
          ...hit._source,
          score: hit._score,
        }));

        const nextCursor =
          hits.length === limitVal
            ? Buffer.from(JSON.stringify(hits[hits.length - 1].sort)).toString('base64')
            : null;

        return reply.send({
          results: users,
          cursor: nextCursor,
          has_more: hits.length === limitVal,
          total: result.hits.total,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to search users');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to search users',
        });
      }
    }
  );

  // Global search
  fastify.get(
    '/search',
    {
      schema: {
        querystring: searchQuerySchema,
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.user_id || 'anonymous';
      const tenantId = (request as any).user?.tenant_id;

      if (!checkRateLimit(userId)) {
        return reply.code(429).send({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
        });
      }

      const { q, limit } = (request.query || {}) as { q?: string; limit?: number };
      if (!q || !q.trim()) {
        return reply.code(400).send({ error: 'BadRequest', message: 'Query parameter q is required' });
      }
      const limitVal = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 20;

      try {
        // Search across all indices
        const [messages, conversations, users] = await Promise.all([
          esClient.search({
            index: 'messages',
            query: {
              bool: {
                must: [
                  { match: { content: q } },
                  ...(tenantId ? [{ term: { tenant_id: tenantId } }] : []),
                ],
              },
            },
            size: Math.floor(limitVal / 3),
            highlight: {
              fields: { content: {} },
            },
          }),
          esClient.search({
            index: 'conversations',
            query: {
              bool: {
                must: [
                  { multi_match: { query: q as string, fields: ['name', 'description'] } },
                  ...(tenantId ? [{ term: { tenant_id: tenantId } }] : []),
                ],
              },
            },
            size: Math.floor(limitVal / 3),
          }),
          esClient.search({
            index: 'users',
            query: {
              bool: {
                must: [
                  { multi_match: { query: q as string, fields: ['username', 'display_name'] } },
                  ...(tenantId ? [{ term: { tenant_id: tenantId } }] : []),
                ],
              },
            },
            size: Math.floor(limitVal / 3),
          }),
        ]);

        return reply.send({
          messages: messages.hits.hits.map((hit: any) => ({
            id: hit._id,
            ...hit._source,
            highlight: hit.highlight,
            type: 'message',
          })),
          conversations: conversations.hits.hits.map((hit: any) => ({
            id: hit._id,
            ...hit._source,
            type: 'conversation',
          })),
          users: users.hits.hits.map((hit: any) => ({
            id: hit._id,
            ...hit._source,
            type: 'user',
          })),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to perform global search');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to perform global search',
        });
      }
    }
  );

  // Search suggestions
  fastify.get(
    '/search/suggestions',
    async (request, reply) => {
      const { q } = (request.query || {}) as { q?: string };

      if (!q || q.length < 2) {
        return reply.send({ suggestions: [] });
      }

      try {
        // Check cache first
        const cacheKey = `suggestions:${q.toLowerCase()}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
          return reply.send({ suggestions: JSON.parse(cached) });
        }

        // Get suggestions from Elasticsearch
        const result = await esClient.search({
          index: 'messages',
          suggest: {
            text: q,
            simple_phrase: {
              phrase: {
                field: 'content',
                size: 5,
                gram_size: 3,
                direct_generator: [
                  {
                    field: 'content',
                    suggest_mode: 'always',
                  },
                ],
              },
            },
          },
        });

        const opts = result.suggest?.simple_phrase?.[0]?.options;
        const optsArray = Array.isArray(opts) ? opts : opts ? [opts] : [];
        const suggestions = optsArray.map((opt: { text?: string }) => opt.text || '');

        // Cache for 1 hour
        await redis.setex(cacheKey, 3600, JSON.stringify(suggestions));

        return reply.send({ suggestions });
      } catch (error) {
        request.log.error({ error }, 'Failed to get suggestions');
        return reply.send({ suggestions: [] });
      }
    }
  );

  // Recent searches
  fastify.get('/search/recent', async (request, reply) => {
    const userId = (request as any).user?.user_id;

    if (!userId) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    try {
      const recent = await redis.lrange(`search:recent:${userId}`, 0, 9);
      const searches = recent.map((item: string) => JSON.parse(item));

      return reply.send({ searches });
    } catch (error) {
      request.log.error({ error }, 'Failed to get recent searches');
      return reply.code(500).send({
        error: 'InternalServerError',
        message: 'Failed to get recent searches',
      });
    }
  });
}
