import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSearchClient } from '../../services/search-client.js';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const CACHE_TTL = parseInt(process.env.SEARCH_CACHE_TTL_SECONDS || '60', 10);

export async function searchRoutes(fastify: FastifyInstance) {
  const searchClient = getSearchClient();

  // Search messages
  fastify.get(
    '/search/messages',
    {
      schema: {
        description: 'Search messages',
        tags: ['search'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';
      const query = request.query as any;

      // Generate cache key
      const cacheKey = `search:messages:${JSON.stringify(query)}`;

      try {
        // Check cache
        const cached = await redis.get(cacheKey);
        if (cached) {
          return reply.send(JSON.parse(cached));
        }

        // Call search service
        const result = await searchClient.searchMessages(token, query);

        // Cache result
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to search messages');
        return reply.code(error.status || 500).send({
          error: 'Failed to search messages',
          message: error.message,
        });
      }
    }
  );

  // Search conversations
  fastify.get(
    '/search/conversations',
    {
      schema: {
        description: 'Search conversations',
        tags: ['search'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';
      const query = request.query as any;

      const cacheKey = `search:conversations:${JSON.stringify(query)}`;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return reply.send(JSON.parse(cached));
        }

        const result = await searchClient.searchConversations(token, query);

        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to search conversations');
        return reply.code(error.status || 500).send({
          error: 'Failed to search conversations',
          message: error.message,
        });
      }
    }
  );

  // Search users
  fastify.get(
    '/search/users',
    {
      schema: {
        description: 'Search users',
        tags: ['search'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';
      const query = request.query as any;

      const cacheKey = `search:users:${JSON.stringify(query)}`;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return reply.send(JSON.parse(cached));
        }

        const result = await searchClient.searchUsers(token, query);

        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to search users');
        return reply.code(error.status || 500).send({
          error: 'Failed to search users',
          message: error.message,
        });
      }
    }
  );

  // Global search
  fastify.get(
    '/search',
    {
      schema: {
        description: 'Global search across all types',
        tags: ['search'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';
      const query = request.query as any;

      const cacheKey = `search:global:${JSON.stringify(query)}`;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return reply.send(JSON.parse(cached));
        }

        const result = await searchClient.globalSearch(token, query);

        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to perform global search');
        return reply.code(error.status || 500).send({
          error: 'Failed to perform global search',
          message: error.message,
        });
      }
    }
  );

  // Search suggestions
  fastify.get(
    '/search/suggestions',
    {
      schema: {
        description: 'Get search suggestions',
        tags: ['search'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';
      const { q } = request.query as any;

      try {
        const result = await searchClient.getSuggestions(token, q);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to get suggestions');
        return reply.code(error.status || 500).send({
          error: 'Failed to get suggestions',
          message: error.message,
        });
      }
    }
  );

  // Recent searches
  fastify.get(
    '/search/recent',
    {
      schema: {
        description: 'Get recent searches',
        tags: ['search'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await searchClient.getRecentSearches(token);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to get recent searches');
        return reply.code(error.status || 500).send({
          error: 'Failed to get recent searches',
          message: error.message,
        });
      }
    }
  );
}
