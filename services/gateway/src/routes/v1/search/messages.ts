import { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/auth/authenticate';
import { Client } from '@elastic/elasticsearch';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || 'changeme';

export async function messageSearchRoutes(app: FastifyInstance) {
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
          properties: {
            query: { type: 'string' },
            conversation_id: { type: 'string' },
            sender_id: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            type: { type: 'string' },
            offset: { type: 'number', default: 0 },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenant_id, user_id } = request.user;
      const query = request.query as any;

      const must: object[] = [];
      const filter: object[] = [{ term: { tenant_id } }];

      if (query.query) {
        must.push({
          multi_match: {
            query: query.query,
            fields: ['content^2', 'content.exact'],
            fuzziness: 'AUTO',
            operator: 'and',
          },
        });
      }

      if (query.conversation_id) {
        filter.push({ term: { conversation_id: query.conversation_id } });
      }

      if (query.sender_id) {
        filter.push({ term: { sender_id: query.sender_id } });
      }

      if (query.type) {
        filter.push({ term: { type: query.type } });
      }

      if (query.from || query.to) {
        const range: any = {};
        if (query.from) range.gte = query.from;
        if (query.to) range.lte = query.to;
        filter.push({ range: { created_at: range } });
      }

      try {
        const result = await esClient.search({
          index: 'messages',
          body: {
            query: {
              bool: {
                must: must.length ? must : [{ match_all: {} }],
                filter,
              },
            },
            highlight: {
              fields: {
                content: {
                  pre_tags: ['<mark>'],
                  post_tags: ['</mark>'],
                  fragment_size: 100,
                  number_of_fragments: 3,
                },
              },
            },
            sort: [{ created_at: 'desc' }],
            from: query.offset || 0,
            size: query.limit || 20,
          },
        });

        return {
          hits: result.hits.hits.map((hit: any) => ({
            ...hit._source,
            highlights: hit.highlight?.content || [],
            score: hit._score,
          })),
          total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
          took: result.took,
        };
      } catch (error: any) {
        app.log.error('Search failed:', error);
        return reply.status(500).send({ error: 'Search failed', message: error.message });
      }
    },
  );
}
