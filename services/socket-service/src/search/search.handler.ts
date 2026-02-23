/**
 * Search Handler
 * Socket event handlers for search operations with authorization and rate limiting
 * Phase 4.5.z Task 09
 */

import { Server, Socket } from 'socket.io';
import axios, { AxiosInstance } from 'axios';
import { RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';
import { SearchRateLimiter } from '../ratelimit/search.ratelimit';
import { SearchAuthorization } from './search.authorization';
import { getLogger } from '../utils/logger';
import { getCorrelationIdFromSocket } from '../middleware/correlation.middleware';
import crypto from 'crypto';

const logger = getLogger('SearchHandler');

export interface SearchMessagesPayload {
  query: string;
  conversation_id?: string;
  from_date?: number;
  to_date?: number;
  limit?: number;
}

export interface SearchConversationsPayload {
  query: string;
  limit?: number;
}

export interface SearchUsersPayload {
  query: string;
  limit?: number;
}

export class SearchHandler {
  private searchClient: AxiosInstance;
  private redisClient: RedisClientType;
  private rateLimiter: SearchRateLimiter;
  private authorization: SearchAuthorization;
  private readonly CACHE_TTL = 60; // 60 seconds

  constructor(
    searchServiceUrl: string,
    redisClient: RedisClientType,
    mongoClient: MongoClient
  ) {
    this.searchClient = axios.create({
      baseURL: searchServiceUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.redisClient = redisClient;
    this.rateLimiter = new SearchRateLimiter(redisClient);
    this.authorization = new SearchAuthorization(redisClient, mongoClient);
  }

  private generateCacheKey(tenantId: string, query: string, filters: any): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify({ query, filters }))
      .digest('hex');
    return `search:${tenantId}:${hash}`;
  }

  registerHandlers(io: Server, socket: Socket, userId: string, tenantId: string): void {
    // Search messages
    socket.on('search:messages', async (payload: SearchMessagesPayload, callback: any) => {
      const correlationId = getCorrelationIdFromSocket(socket);

      try {
        logger.info({
          correlationId,
          userId,
          tenantId,
          query: payload.query,
          msg: 'Searching messages',
        });

        if (!payload.query || payload.query.trim().length === 0) {
          return callback({
            status: 'error',
            message: 'Query is required',
          });
        }

        const limit = payload.limit || 20;

        // Check rate limit
        const isComplex = !!(payload.from_date || payload.to_date);
        const rateLimit = await this.rateLimiter.checkSearchLimit(userId, tenantId, isComplex);
        if (!rateLimit.allowed) {
          logger.warn({
            correlationId,
            userId,
            msg: 'Search rate limit exceeded',
          });
          return callback({
            status: 'error',
            message: 'Too many search requests. Please try again later.',
            retry_after_ms: rateLimit.retry_after_ms,
          });
        }

        // Check authorization
        const authResult = await this.authorization.canSearchMessages(
          userId,
          tenantId,
          payload.conversation_id
        );
        if (!authResult.authorized) {
          logger.warn({
            correlationId,
            userId,
            reason: authResult.reason,
            msg: 'Search not authorized',
          });
          return callback({
            status: 'error',
            message: authResult.reason || 'Not authorized',
          });
        }

        // Check cache
        const cacheKey = this.generateCacheKey(tenantId, payload.query, {
          conversation_id: payload.conversation_id,
          from_date: payload.from_date,
          to_date: payload.to_date,
        });

        try {
          const cached = await this.redisClient.get(cacheKey);
          if (cached) {
            logger.info({
              correlationId,
              userId,
              msg: 'Search results from cache',
            });

            return callback({
              status: 'ok',
              ...JSON.parse(cached),
              cached: true,
            });
          }
        } catch (cacheError) {
          // Cache error - continue with search
          logger.warn({
            correlationId,
            error: (cacheError as Error).message,
            msg: 'Cache read failed',
          });
        }

        // Search via search service
        const response = await this.searchClient.post('/api/search/messages', {
          query: payload.query,
          tenant_id: tenantId,
          user_id: userId,
          conversation_id: payload.conversation_id,
          conversation_ids: authResult.conversationIds, // Restrict to authorized conversations
          from_date: payload.from_date,
          to_date: payload.to_date,
          limit,
        });

        const results = {
          results: response.data.results || [],
          total: response.data.total || 0,
          has_more: response.data.has_more || false,
        };

        // Cache results
        try {
          await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(results));
        } catch (cacheError) {
          // Cache error - non-blocking
          logger.warn({
            correlationId,
            error: (cacheError as Error).message,
            msg: 'Cache write failed',
          });
        }

        logger.info({
          correlationId,
          userId,
          resultCount: results.results.length,
          msg: 'Search completed',
        });

        callback({
          status: 'ok',
          ...results,
          cached: false,
        });
      } catch (error: any) {
        logger.error({
          correlationId,
          userId,
          error: error.message,
          msg: 'Search failed',
        });

        callback({
          status: 'error',
          message: 'Search failed',
        });
      }
    });

    // Search conversations
    socket.on('search:conversations', async (payload: SearchConversationsPayload, callback: any) => {
      const correlationId = getCorrelationIdFromSocket(socket);

      try {
        logger.info({
          correlationId,
          userId,
          query: payload.query,
          msg: 'Searching conversations',
        });

        if (!payload.query || payload.query.trim().length === 0) {
          return callback({
            status: 'error',
            message: 'Query is required',
          });
        }

        const limit = payload.limit || 20;

        // Check rate limit
        const rateLimit = await this.rateLimiter.checkSearchLimit(userId, tenantId, false);
        if (!rateLimit.allowed) {
          logger.warn({
            correlationId,
            userId,
            msg: 'Search rate limit exceeded',
          });
          return callback({
            status: 'error',
            message: 'Too many search requests. Please try again later.',
            retry_after_ms: rateLimit.retry_after_ms,
          });
        }

        // Check authorization
        const authResult = await this.authorization.canSearchConversations(userId, tenantId);
        if (!authResult.authorized) {
          logger.warn({
            correlationId,
            userId,
            reason: authResult.reason,
            msg: 'Search not authorized',
          });
          return callback({
            status: 'error',
            message: authResult.reason || 'Not authorized',
          });
        }

        // Check cache
        const cacheKey = this.generateCacheKey(tenantId, payload.query, { type: 'conversations' });

        try {
          const cached = await this.redisClient.get(cacheKey);
          if (cached) {
            logger.info({
              correlationId,
              userId,
              msg: 'Conversation search results from cache',
            });

            return callback({
              status: 'ok',
              ...JSON.parse(cached),
              cached: true,
            });
          }
        } catch (cacheError) {
          logger.warn({
            correlationId,
            error: (cacheError as Error).message,
            msg: 'Cache read failed',
          });
        }

        // Search via search service
        const response = await this.searchClient.post('/api/search/conversations', {
          query: payload.query,
          tenant_id: tenantId,
          user_id: userId,
          limit,
        });

        const results = {
          results: response.data.results || [],
          total: response.data.total || 0,
        };

        // Cache results
        try {
          await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(results));
        } catch (cacheError) {
          logger.warn({
            correlationId,
            error: (cacheError as Error).message,
            msg: 'Cache write failed',
          });
        }

        logger.info({
          correlationId,
          userId,
          resultCount: results.results.length,
          msg: 'Conversation search completed',
        });

        callback({
          status: 'ok',
          ...results,
          cached: false,
        });
      } catch (error: any) {
        logger.error({
          correlationId,
          userId,
          error: error.message,
          msg: 'Conversation search failed',
        });

        callback({
          status: 'error',
          message: 'Search failed',
        });
      }
    });

    // Search users
    socket.on('search:users', async (payload: SearchUsersPayload, callback: any) => {
      const correlationId = getCorrelationIdFromSocket(socket);

      try {
        logger.info({
          correlationId,
          userId,
          query: payload.query,
          msg: 'Searching users',
        });

        if (!payload.query || payload.query.trim().length === 0) {
          return callback({
            status: 'error',
            message: 'Query is required',
          });
        }

        const limit = payload.limit || 20;

        // Check rate limit
        const rateLimit = await this.rateLimiter.checkSearchLimit(userId, tenantId, false);
        if (!rateLimit.allowed) {
          logger.warn({
            correlationId,
            userId,
            msg: 'Search rate limit exceeded',
          });
          return callback({
            status: 'error',
            message: 'Too many search requests. Please try again later.',
            retry_after_ms: rateLimit.retry_after_ms,
          });
        }

        // Check authorization
        const authResult = await this.authorization.canSearchUsers(userId, tenantId);
        if (!authResult.authorized) {
          logger.warn({
            correlationId,
            userId,
            reason: authResult.reason,
            msg: 'Search not authorized',
          });
          return callback({
            status: 'error',
            message: authResult.reason || 'Not authorized',
          });
        }

        // Check cache
        const cacheKey = this.generateCacheKey(tenantId, payload.query, { type: 'users' });

        try {
          const cached = await this.redisClient.get(cacheKey);
          if (cached) {
            logger.info({
              correlationId,
              userId,
              msg: 'User search results from cache',
            });

            return callback({
              status: 'ok',
              ...JSON.parse(cached),
              cached: true,
            });
          }
        } catch (cacheError) {
          logger.warn({
            correlationId,
            error: (cacheError as Error).message,
            msg: 'Cache read failed',
          });
        }

        // Search via search service
        const response = await this.searchClient.post('/api/search/users', {
          query: payload.query,
          tenant_id: tenantId,
          limit,
        });

        const results = {
          results: response.data.results || [],
          total: response.data.total || 0,
        };

        // Cache results
        try {
          await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(results));
        } catch (cacheError) {
          logger.warn({
            correlationId,
            error: (cacheError as Error).message,
            msg: 'Cache write failed',
          });
        }

        logger.info({
          correlationId,
          userId,
          resultCount: results.results.length,
          msg: 'User search completed',
        });

        callback({
          status: 'ok',
          ...results,
          cached: false,
        });
      } catch (error: any) {
        logger.error({
          correlationId,
          userId,
          error: error.message,
          msg: 'User search failed',
        });

        callback({
          status: 'error',
          message: 'Search failed',
        });
      }
    });
  }
}
