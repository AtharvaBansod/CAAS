import { Client } from '@elastic/elasticsearch';
import { GlobalSearchParams, MessageHit, ConversationHit, UserHit } from '../types';

export interface GlobalSearchResult {
  messages: {
    total: number;
    hits: MessageHit[];
  };
  conversations: {
    total: number;
    hits: ConversationHit[];
  };
  users: {
    total: number;
    hits: UserHit[];
  };
  query: string;
}

export class GlobalSearchService {
  constructor(private esClient: Client) {}

  async search(params: GlobalSearchParams): Promise<GlobalSearchResult> {
    const [messages, conversations, users] = await Promise.all([
      this.searchMessages(params),
      this.searchConversations(params),
      this.searchUsers(params),
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
      query: params.query,
    };
  }

  private async searchMessages(params: GlobalSearchParams): Promise<{ total: number; hits: MessageHit[] }> {
    try {
      const result = await this.esClient.search({
        index: 'messages',
        body: {
          query: {
            bool: {
              must: [{ match: { content: params.query } }],
              filter: [{ term: { tenant_id: params.tenantId } }],
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

  private async searchConversations(params: GlobalSearchParams): Promise<{ total: number; hits: ConversationHit[] }> {
    try {
      const result = await this.esClient.search({
        index: 'conversations',
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: params.query,
                    fields: ['name^2', 'participant_names'],
                  },
                },
              ],
              filter: [
                { term: { tenant_id: params.tenantId } },
                { terms: { participant_ids: [params.userId] } },
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

  private async searchUsers(params: GlobalSearchParams): Promise<{ total: number; hits: UserHit[] }> {
    try {
      const result = await this.esClient.search({
        index: 'users',
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: params.query,
                    fields: ['name^2', 'email'],
                  },
                },
              ],
              filter: [{ term: { tenant_id: params.tenantId } }],
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
}
