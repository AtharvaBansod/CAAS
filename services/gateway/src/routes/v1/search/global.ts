import { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/auth/authenticate';
import { Client } from '@elastic/elasticsearch';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || 'changeme';

export async function globalSearchRoutes(app: FastifyInstance) {
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

  app.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenant_id, user_id } = request.user;
      const { query } = request.query as any;

      try {
        const [messages, conversations, users] = await Promise.all([
          searchMessages(esClient, tenant_id, query),
          searchConversations(esClient, tenant_id, user_id, query),
          searchUsers(esClient, tenant_id, query),
        ]);

        return {
          messages: {
            total: messages.total,
            hits: messages.hits.slice(0, 5),
          },
          conversations: {
            total: conversations.total,
            hits: conversations.hits.slice(0, 5),
          },
          users: {
            total: users.total,
            hits: users.hits.slice(0, 5),
          },
          query,
        };
      } catch (error: any) {
        app.log.error('Global search failed:', error);
        return reply.status(500).send({ error: 'Search failed', message: error.message });
      }
    },
  );
}

async function searchMessages(esClient: Client, tenantId: string, query: string) {
  try {
    const result = await esClient.search({
      index: 'messages',
      body: {
        query: {
          bool: {
            must: [{ match: { content: query } }],
            filter: [{ term: { tenant_id: tenantId } }],
          },
        },
        size: 10,
        highlight: { fields: { content: {} } },
        sort: [{ created_at: 'desc' }],
      },
    });

    return {
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
      hits: result.hits.hits.map((hit: any) => ({
        ...hit._source,
        highlights: hit.highlight?.content || [],
        score: hit._score,
      })),
    };
  } catch (error) {
    console.error('Message search failed:', error);
    return { total: 0, hits: [] };
  }
}

async function searchConversations(esClient: Client, tenantId: string, userId: string, query: string) {
  try {
    const result = await esClient.search({
      index: 'conversations',
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ['name^2', 'participant_names'],
                },
              },
            ],
            filter: [
              { term: { tenant_id: tenantId } },
              { terms: { participant_ids: [userId] } },
            ],
          },
        },
        size: 10,
      },
    });

    return {
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
      hits: result.hits.hits.map((hit: any) => ({
        ...hit._source,
        score: hit._score,
      })),
    };
  } catch (error) {
    console.error('Conversation search failed:', error);
    return { total: 0, hits: [] };
  }
}

async function searchUsers(esClient: Client, tenantId: string, query: string) {
  try {
    const result = await esClient.search({
      index: 'users',
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ['name^2', 'email'],
                },
              },
            ],
            filter: [{ term: { tenant_id: tenantId } }],
          },
        },
        size: 10,
      },
    });

    return {
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
      hits: result.hits.hits.map((hit: any) => ({
        ...hit._source,
        score: hit._score,
      })),
    };
  } catch (error) {
    console.error('User search failed:', error);
    return { total: 0, hits: [] };
  }
}
