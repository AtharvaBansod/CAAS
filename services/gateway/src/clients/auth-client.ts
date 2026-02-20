/**
 * Auth Service Client
 * Phase 4.5.0 - Task 03: Gateway Auth Client Integration
 * 
 * HTTP client for communicating with standalone auth service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { CircuitBreaker } from '../utils/circuit-breaker';
import Redis from 'ioredis';

export interface AuthClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
  cache?: {
    ttl: number;
    keyPrefix: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  tenant_id: string;
  device_info?: any;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    user_id: string;
    email: string;
    tenant_id: string;
  };
  requires_mfa?: boolean;
  challenge_id?: string;
  methods?: string[];
}

export interface ValidateTokenRequest {
  token: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  payload?: any;
  session?: any;
  error?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface SessionInfo {
  session_id: string;
  user_id: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

export class AuthServiceClient {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private redis?: Redis;
  private config: AuthClientConfig;

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

    // Setup circuit breaker
    const cbConfig = config.circuitBreaker || {
      failureThreshold: 50,
      resetTimeout: 30000,
      monitoringPeriod: 10000,
    };

    this.circuitBreaker = new CircuitBreaker(
      cbConfig.failureThreshold,
      cbConfig.resetTimeout,
      cbConfig.monitoringPeriod
    );

    // Add retry logic
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
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors or rate limit
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
      console.error('Cache get error:', error);
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
      console.error('Cache set error:', error);
    }
  }

  private async deleteCache(key: string): Promise<void> {
    if (!this.redis || !this.config.cache) return;

    try {
      await this.redis.del(`${this.config.cache.keyPrefix}${key}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post<LoginResponse>('/api/v1/auth/login', request);
      return response.data;
    });
  }

  async validateToken(token: string): Promise<ValidateTokenResponse> {
    // Check cache first
    const cacheKey = `validate:${token}`;
    const cached = await this.getCached<ValidateTokenResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.post<ValidateTokenResponse>(
          '/api/v1/auth/validate',
          { token }
        );

        // Cache successful validation
        if (response.data.valid) {
          await this.setCache(cacheKey, response.data);
        }

        return response.data;
      } catch (error: any) {
        if (error.response?.status === 401) {
          return {
            valid: false,
            error: error.response.data?.error || 'Invalid token',
          };
        }
        throw error;
      }
    });
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post<LoginResponse>('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      });
      return response.data;
    });
  }

  async logout(token: string): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      await this.client.post(
        '/api/v1/auth/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Clear cache
      await this.deleteCache(`validate:${token}`);
    });
  }

  async getSession(token: string): Promise<SessionInfo> {
    // Check cache first
    const cacheKey = `session:${token}`;
    const cached = await this.getCached<SessionInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get<SessionInfo>('/api/v1/auth/session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Cache session info
      await this.setCache(cacheKey, response.data);

      return response.data;
    });
  }

  async getUserProfile(token: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get('/api/v1/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    });
  }

  async listSessions(token: string): Promise<SessionInfo[]> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get<{ sessions: SessionInfo[] }>('/api/v1/sessions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.sessions;
    });
  }

  async terminateSession(token: string, sessionId: string): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      await this.client.delete(`/api/v1/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    });
  }

  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  isHealthy(): boolean {
    return this.circuitBreaker.getState() !== 'OPEN';
  }
}
