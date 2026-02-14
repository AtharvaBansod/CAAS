import { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/auth/authenticate';
import { Client } from '@elastic/elasticsearch';
import { createClient } from 'redis';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || 'changeme';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function suggestionsRoutes(app: FastifyInstance) {
  const esClient = new Client({
    node: ELASTICSEARCH_URL,
    auth: {
      username: 'elastic',
      password: ELASTICSEARCH_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  // User autocomplete for mentions
  app.get(
    '/users',
    {
      preHandler: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
            conversation_id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenant_id } = request.user;
      const { query, conversation_id } = request.query as any;

      const filter: object[] = [{ term: { tenant_id } }];

      // TODO: Filter by conversation participants if conversation_id provided

      try {
        const result = await esClient.search({
          index: 'users',
          body: {
            query: {
              bool: {
                must: [{ match: { 'name.autocomplete': query } }],
                filter,
              },
            },
            size: 10,
          },
        });

        return result.hits.hits.map((hit: any) => ({
          id: hit._source.id,
          name: hit._source.name,
          avatar_url: hit._source.avatar_url,
        }));
      } catch (error: any) {
        app.log.error('User autocomplete failed:', error);
        return reply.status(500).send({ error: 'Autocomplete failed', message: error.message });
      }
    },
  );

  // Recent searches
  app.get(
    '/recent',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { user_id } = request.user;

      try {
        const searches = await redis.lRange(`recent_searches:${user_id}`, 0, 9);
        return { searches };
      } catch (error: any) {
        app.log.error('Failed to get recent searches:', error);
        return reply.status(500).send({ error: 'Failed to get recent searches', message: error.message });
      }
    },
  );

  // Save recent search
  app.post(
    '/recent',
    {
      preHandler: [authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { user_id } = request.user;
      const { query } = request.body as any;

      try {
        await redis.lPush(`recent_searches:${user_id}`, query);
        await redis.lTrim(`recent_searches:${user_id}`, 0, 9);
        return { success: true };
      } catch (error: any) {
        app.log.error('Failed to save recent search:', error);
        return reply.status(500).send({ error: 'Failed to save search', message: error.message });
      }
    },
  );
}
