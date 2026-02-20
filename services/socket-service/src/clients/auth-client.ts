/**
 * Auth Service Client for Socket Service
 * Phase 4.5.0 - Task 04: Socket Auth Client Integration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import Redis from 'ioredis';

export interface AuthClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  cache?: {
    ttl: number;
    keyPrefix: string;
  };
}

export interface ValidateTokenResponse {
  valid: boolean;
  payload?: any;
  session?: any;
  error?: string;
}

export class AuthServiceClient {
  private client: AxiosInstance;
  private redis?: Redis;
  private config: AuthClientConfig;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;

  constructor(config: AuthClientConfig, redis?: Redis) {
    this.config = config;
    this.redis = redis;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 5000,
      headers: {
        'Content-Type': 'application/json',
      },
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

  private async getCached<T>(key: string): Promise<T | null> {
    if (!this.redis || !this.config.cache) return null;

    try {
      const cached = await this.redis.get(`${this.config.cache.keyPrefix}${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  private async setCache(key: string, value: any): Promise<void> {
    if (!this.redis || !this.config.cache) return;

    try {
      await this.redis.setex(
        `${this.config.cache.keyPrefix}${key}`,
        this.config.cache.ttl,
        JSON.stringify(value)
      );
    } catch (error) {
      // Ignore cache errors
    }
  }

  async validateToken(token: string): Promise<ValidateTokenResponse> {
    // Check cache first
    const cacheKey = `validate:${token}`;
    const cached = await this.getCached<ValidateTokenResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.post<ValidateTokenResponse>(
        '/api/v1/auth/validate',
        { token }
      );

      // Cache successful validation
      if (response.data.valid) {
        await this.setCache(cacheKey, response.data);
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

  async getSession(token: string): Promise<any> {
    const cacheKey = `session:${token}`;
    const cached = await this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get('/api/v1/auth/session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  isHealthy(): boolean {
    // Consider unhealthy if more than 5 failures in last minute
    if (this.failureCount > 5 && Date.now() - this.lastFailureTime < 60000) {
      return false;
    }
    return true;
  }
}
