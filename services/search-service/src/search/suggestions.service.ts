import { Client } from '@elastic/elasticsearch';
import { MongoClient } from 'mongodb';
import { createClient, RedisClientType } from 'redis';
import { UserSuggestion } from '../types';

export class SuggestionsService {
  private redis: RedisClientType;

  constructor(
    private esClient: Client,
    private mongoClient: MongoClient,
    redisUrl: string,
  ) {
    this.redis = createClient({ url: redisUrl });
    this.redis.connect().catch(console.error);
  }

  async autocompleteUsers(
    tenantId: string,
    query: string,
    conversationId?: string,
  ): Promise<UserSuggestion[]> {
    const filter: object[] = [{ term: { tenant_id: tenantId } }];

    // Filter to conversation participants if specified
    if (conversationId) {
      const participants = await this.getConversationParticipants(tenantId, conversationId);
      if (participants.length > 0) {
        filter.push({ terms: { id: participants } });
      }
    }

    try {
      const result = await this.esClient.search({
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
    } catch (error) {
      console.error('User autocomplete failed:', error);
      return [];
    }
  }

  async getRecentSearches(userId: string): Promise<string[]> {
    try {
      return await this.redis.lRange(`recent_searches:${userId}`, 0, 9);
    } catch (error) {
      console.error('Failed to get recent searches:', error);
      return [];
    }
  }

  async saveRecentSearch(userId: string, query: string): Promise<void> {
    try {
      await this.redis.lPush(`recent_searches:${userId}`, query);
      await this.redis.lTrim(`recent_searches:${userId}`, 0, 9);
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }

  private async getConversationParticipants(
    tenantId: string,
    conversationId: string,
  ): Promise<string[]> {
    try {
      const db = this.mongoClient.db(`tenant_${tenantId}`);
      const conversation = await db.collection('conversations').findOne({ id: conversationId });
      return conversation?.participant_ids || [];
    } catch (error) {
      console.error('Failed to get conversation participants:', error);
      return [];
    }
  }
}
