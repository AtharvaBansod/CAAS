/**
 * Auth Service Client for Socket Service
 * Phase 4.5.z.x - Task 03: Socket Service Auth Integration
 * 
 * Enhanced client with Redis context caching and connection authentication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import Redis from 'ioredis';

export interface AuthClientConfig {
  baseURL: string;
  serviceSecret?: string;
  timeout?: number;
  retries?: number;
  cache?: {
    ttl: number;
    keyPrefix: string;
  };
}

export interface ValidateTokenResponse {
  valid: boolean;
  payload?: {
    user_id: string;
    tenant_id: string;
    project_id?: string;
    external_id?: string;
    permissions: string[];
    session_id?: string;
    exp: number;
    email?: string;
  };
  session?: any;
  error?: string;
}

export interface SocketContext {
  user_id: string;
  tenant_id: string;
  project_id?: string;
  external_id?: string;
  permissions: string[];
  session_id?: string;
  email?: string;
  socket_id: string;
  connected_at: number;
  last_heartbeat: number;
}

export class AuthServiceClient {
  private client: AxiosInstance;
  private redis?: Redis;
  private config: AuthClientConfig;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly SOCKET_CONTEXT_PREFIX = 'socket:ctx:';
  private readonly SOCKET_CONTEXT_TTL = 3600; // 1 hour

  constructor(config: AuthClientConfig, redis?: Redis) {
    this.config = config;
    this.redis = redis;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.serviceSecret) {
      headers['x-service-secret'] = config.serviceSecret;
    }

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 5000,
      headers,
    });

    this.setupRetry();
  }

  private setupRetry() {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any;

        if (!config || !config.retry) {
          config.retry = 0;
        }

        const maxRetries = this.config.retries || 3;

        if (config.retry < maxRetries && this.shouldRetry(error)) {
          config.retry += 1;
          await this.delay(Math.pow(2, config.retry) * 100);
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500 || status === 429;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Token Validation ───

  async validateToken(token: string): Promise<ValidateTokenResponse> {
    // Check Redis cache first
    if (this.redis && this.config.cache) {
      try {
        const cacheKey = `${this.config.cache.keyPrefix}validate:${token}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {
        // Cache miss or error, continue
      }
    }

    try {
      const response = await this.client.post<ValidateTokenResponse>(
        '/api/v1/auth/internal/validate',
        { token }
      );

      // Cache successful validation
      if (response.data.valid && this.redis && this.config.cache) {
        try {
          const cacheKey = `${this.config.cache.keyPrefix}validate:${token}`;
          if (typeof (this.redis as any).setex === 'function') {
            await (this.redis as any).setex(cacheKey, this.config.cache.ttl, JSON.stringify(response.data));
          } else if (typeof (this.redis as any).set === 'function') {
            await (this.redis as any).set(cacheKey, JSON.stringify(response.data), { EX: this.config.cache.ttl });
          }
        } catch (err: any) {
          // Ignore cache errors
          console.warn('Failed to cache token validation:', err.message);
        }
      }

      this.failureCount = 0;
      return response.data;
    } catch (error: any) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (error.response?.status === 401) {
        return {
          valid: false,
          error: error.response.data?.error || 'Invalid token',
        };
      }

      // If auth service is down, throw error
      throw new Error(`Auth service unavailable: ${error.message}`);
    }
  }

  // ─── Socket Context Management (Redis) ───

  /**
   * Store socket connection context in Redis
   * Called after successful authentication
   */
  async storeSocketContext(socketId: string, context: Omit<SocketContext, 'socket_id' | 'connected_at' | 'last_heartbeat'>): Promise<void> {
    if (!this.redis) return;

    const fullContext: SocketContext = {
      ...context,
      socket_id: socketId,
      connected_at: Date.now(),
      last_heartbeat: Date.now(),
    };

    try {
      const key = `${this.SOCKET_CONTEXT_PREFIX}${socketId}`;
      const value = JSON.stringify(fullContext);

      if (typeof (this.redis as any).setex === 'function') {
        await (this.redis as any).setex(key, this.SOCKET_CONTEXT_TTL, value);
      } else if (typeof (this.redis as any).set === 'function') {
        await (this.redis as any).set(key, value, { EX: this.SOCKET_CONTEXT_TTL });
      }

      // Also maintain a user -> socket mapping for presence
      if (typeof (this.redis as any).sadd === 'function') {
        await (this.redis as any).sadd(`socket:user:${context.user_id}`, socketId);
        if (typeof (this.redis as any).expire === 'function') {
          await (this.redis as any).expire(`socket:user:${context.user_id}`, this.SOCKET_CONTEXT_TTL);
        }
      } else if (typeof (this.redis as any).sAdd === 'function') {
        // node-redis v4 uses camelCase for some methods
        await (this.redis as any).sAdd(`socket:user:${context.user_id}`, socketId);
        await (this.redis as any).expire(`socket:user:${context.user_id}`, this.SOCKET_CONTEXT_TTL);
      }
    } catch (error: any) {
      console.error('Failed to store socket context:', error.message);
    }
  }

  /**
   * Get socket context from Redis
   */
  async getSocketContext(socketId: string): Promise<SocketContext | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(`${this.SOCKET_CONTEXT_PREFIX}${socketId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Update heartbeat timestamp for socket
   */
  async updateHeartbeat(socketId: string): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${this.SOCKET_CONTEXT_PREFIX}${socketId}`;
      const data = await this.redis.get(key);
      if (data) {
        const context = JSON.parse(data) as SocketContext;
        context.last_heartbeat = Date.now();
        const value = JSON.stringify(context);

        if (typeof (this.redis as any).setex === 'function') {
          await (this.redis as any).setex(key, this.SOCKET_CONTEXT_TTL, value);
        } else if (typeof (this.redis as any).set === 'function') {
          await (this.redis as any).set(key, value, { EX: this.SOCKET_CONTEXT_TTL });
        }
      }
    } catch {
      // Ignore heartbeat errors
    }
  }

  /**
   * Remove socket context from Redis (on disconnect)
   */
  async removeSocketContext(socketId: string): Promise<void> {
    if (!this.redis) return;

    try {
      const data = await this.redis.get(`${this.SOCKET_CONTEXT_PREFIX}${socketId}`);
      if (data) {
        const context = JSON.parse(data) as SocketContext;
        // Remove from user's socket set
        if (typeof (this.redis as any).srem === 'function') {
          await (this.redis as any).srem(`socket:user:${context.user_id}`, socketId);
        } else if (typeof (this.redis as any).sRem === 'function') {
          await (this.redis as any).sRem(`socket:user:${context.user_id}`, socketId);
        }
      }

      await this.redis.del(`${this.SOCKET_CONTEXT_PREFIX}${socketId}`);
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get all socket IDs for a user (for presence)
   */
  async getUserSockets(userId: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      const key = `socket:user:${userId}`;
      if (typeof (this.redis as any).smembers === 'function') {
        return await (this.redis as any).smembers(key);
      } else if (typeof (this.redis as any).sMembers === 'function') {
        return await (this.redis as any).sMembers(key);
      }
      return [];
    } catch {
      return [];
    }
  }

  // ─── Session Management ───

  async getSession(token: string): Promise<any> {
    try {
      const response = await this.client.get('/api/v1/auth/session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  // ─── Health Check ───

  isHealthy(): boolean {
    // Consider unhealthy if more than 5 failures in last minute
    if (this.failureCount > 5 && Date.now() - this.lastFailureTime < 60000) {
      return false;
    }
    return true;
  }
}
