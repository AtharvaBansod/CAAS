import { Client } from '@elastic/elasticsearch';
import { MessageSearchParams, SearchResult, MessageHit } from '../types';

export class MessageSearchService {
  constructor(private esClient: Client) {}

  async search(params: MessageSearchParams): Promise<SearchResult<MessageHit>> {
    const query = this.buildQuery(params);

    try {
      const result = await this.esClient.search({
        index: 'messages',
        body: {
          query,
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
          sort: params.sort || [{ created_at: 'desc' }],
          from: params.offset || 0,
          size: params.limit || 20,
        },
      });

      return {
        hits: result.hits.hits.map((hit: any) => this.mapHit(hit)),
        total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
        took: result.took,
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  private buildQuery(params: MessageSearchParams): object {
    const must: object[] = [];
    const filter: object[] = [];

    // Full-text search
    if (params.query) {
      must.push({
        multi_match: {
          query: params.query,
          fields: ['content^2', 'content.exact'],
          fuzziness: 'AUTO',
          operator: 'and',
        },
      });
    }

    // Tenant filter (required)
    filter.push({ term: { tenant_id: params.tenantId } });

    // Conversation filter
    if (params.conversationId) {
      filter.push({ term: { conversation_id: params.conversationId } });
    }

    // Sender filter
    if (params.senderId) {
      filter.push({ term: { sender_id: params.senderId } });
    }

    // Type filter
    if (params.type) {
      filter.push({ term: { type: params.type } });
    }

    // Date range filter
    if (params.from || params.to) {
      const range: any = {};
      if (params.from) range.gte = params.from;
      if (params.to) range.lte = params.to;
      filter.push({
        range: {
          created_at: range,
        },
      });
    }

    return {
      bool: {
        must: must.length ? must : [{ match_all: {} }],
        filter,
      },
    };
  }

  private mapHit(hit: any): MessageHit {
    return {
      ...hit._source,
      highlights: hit.highlight?.content || [],
      score: hit._score,
    };
  }
}
