/**
 * Auth Service Client
 * Phase 4.5.z.x - Task 02: Gateway Auth Client Enhanced
 * 
 * HTTP client for communicating with standalone auth service
 * Now includes internal validation endpoints and API key validation
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { CircuitBreaker } from '../utils/circuit-breaker';
import Redis from 'ioredis';

export interface AuthClientConfig {
  baseURL: string;
  serviceSecret?: string;
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
  payload?: {
    user_id: string;
    client_id?: string;
    project_id?: string;
    project_stack?: string;
    project_environment?: 'development' | 'staging' | 'production';
    tenant_id: string;
    role?: string;
    external_id?: string;
    permissions: string[];
    session_id?: string;
    exp: number;
    email?: string;
    company_name?: string;
    plan?: string;
  };
  session?: any;
  error?: string;
}

export interface ValidateApiKeyResponse {
  valid: boolean;
  client?: {
    client_id: string;
    tenant_id: string;
    plan: string;
    permissions: string[];
    rate_limit_tier: string;
    active_project_id?: string;
    project_ids?: string[];
  };
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

export interface SdkSessionRequest {
  user_external_id: string;
  project_id?: string;
  user_data?: {
    name?: string;
    email?: string;
    avatar?: string;
    metadata?: Record<string, any>;
  };
  device_info?: {
    device_id?: string;
    device_type?: 'web' | 'mobile' | 'desktop';
    user_agent?: string;
  };
}

export interface SdkSessionResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    user_id: string;
    external_id: string;
    tenant_id: string;
    project_id?: string;
  };
  socket_urls: string[];
}

export class AuthServiceClient {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private redis?: Redis;
  private config: AuthClientConfig;

  constructor(config: AuthClientConfig, redis?: Redis) {
    this.config = config;
    this.redis = redis;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add service secret for service-to-service auth
    if (config.serviceSecret) {
      headers['X-Service-Secret'] = config.serviceSecret;
    }

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 5000,
      headers,
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

  private async setCache(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redis || !this.config.cache) return;

    try {
      const cacheKey = `${this.config.cache.keyPrefix}${key}`;
      const expiration = ttl || this.config.cache.ttl;
      const data = JSON.stringify(value);

      if (typeof (this.redis as any).setex === 'function') {
        await (this.redis as any).setex(cacheKey, expiration, data);
      } else if (typeof (this.redis as any).set === 'function') {
        await (this.redis as any).set(cacheKey, data, 'EX', expiration);
      }
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

  // ─── User Authentication (Login/Logout) ───

  async login(request: LoginRequest): Promise<LoginResponse> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post<LoginResponse>('/api/v1/auth/login', request);
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

  // ─── Internal Validation (Phase 4.5.z.x) ───

  /**
   * Validate JWT token via internal endpoint
   * This is the primary token validation method for the gateway
   */
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
          '/api/v1/auth/internal/validate',
          { token }
        );

        // Cache successful validation (short TTL)
        if (response.data.valid) {
          await this.setCache(cacheKey, response.data, 60); // 1 min cache
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

  /**
   * Validate API key via internal endpoint
   * Used by gateway for server-to-server auth
   */
  async validateApiKey(apiKey: string, ipAddress?: string): Promise<ValidateApiKeyResponse> {
    // Check cache first
    const cacheKey = `apikey:${apiKey}`;
    const cached = await this.getCached<ValidateApiKeyResponse>(cacheKey);
    if (cached && cached.valid) {
      return cached;
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.post<ValidateApiKeyResponse>(
          '/api/v1/auth/internal/validate-api-key',
          { api_key: apiKey, ip_address: ipAddress }
        );

        // Cache successful validation
        if (response.data.valid) {
          await this.setCache(cacheKey, response.data, 300); // 5 min cache
        }

        return response.data;
      } catch (error: any) {
        if (error.response?.status === 401) {
          return {
            valid: false,
            error: error.response.data?.error || 'Invalid API key',
          };
        }
        throw error;
      }
    });
  }

  // ─── SDK Operations (Phase 4.5.z.x) ───

  /**
   * Create SDK session for end-user
   * Proxied through gateway from SAAS backend
   */
  async createSdkSession(request: SdkSessionRequest, apiKey: string): Promise<SdkSessionResponse> {
    return this.circuitBreaker.execute(async () => {
      const headers: Record<string, string> = {
        'X-Api-Key': apiKey,
      };
      if (request.project_id) {
        headers['X-Project-Id'] = request.project_id;
      }
      const response = await this.client.post<SdkSessionResponse>(
        '/api/v1/auth/sdk/session',
        request,
        {
          headers,
        }
      );
      return response.data;
    });
  }

  // ─── Token Refresh ───

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post<LoginResponse>('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      });
      return response.data;
    });
  }

  // ─── Session Management ───

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

  // ─── Client Management (Phase 4.5.z.x) ───

  /**
   * Register a new SAAS client
   */
  async registerClient(data: {
    company_name: string;
    email: string;
    password: string;
    plan?: string;
    project?: {
      name: string;
      stack: string;
      environment: 'development' | 'staging' | 'production';
    };
  }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/register', data);
      return response.data;
    });
  }

  /**
   * Login for SAAS client admin
   */
  async loginClient(data: {
    email: string;
    password: string;
  }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/login', data);
      return response.data;
    });
  }

  /**
   * Refresh client access token
   */
  async refreshClientToken(data: {
    refresh_token: string;
  }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/refresh', data);
      return response.data;
    });
  }

  /**
   * Initiate password recovery for SAAS client
   */
  async forgotPassword(data: { email: string }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/forgot-password', data);
      return response.data;
    });
  }

  /**
   * Reset password for SAAS client
   */
  async resetPassword(data: {
    email: string;
    code: string;
    new_password: string;
  }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/reset-password', data);
      return response.data;
    });
  }

  /**
   * List projects for client
   */
  async getClientProjects(clientId: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get('/api/v1/auth/client/projects', {
        params: { client_id: clientId },
      });
      return response.data;
    });
  }

  /**
   * Create a project for client
   */
  async createClientProject(data: {
    client_id: string;
    name: string;
    stack: string;
    environment: 'development' | 'staging' | 'production';
  }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/projects', data);
      return response.data;
    });
  }

  /**
   * Select active project for client
   */
  async selectClientProject(data: { client_id: string; project_id: string }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/projects/select', data);
      return response.data;
    });
  }

  /**
   * Update project metadata for client
   */
  async updateClientProject(data: {
    client_id: string;
    project_id: string;
    name?: string;
    stack?: string;
    environment?: 'development' | 'staging' | 'production';
  }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.patch(
        `/api/v1/auth/client/projects/${encodeURIComponent(data.project_id)}`,
        {
          client_id: data.client_id,
          ...(data.name ? { name: data.name } : {}),
          ...(data.stack ? { stack: data.stack } : {}),
          ...(data.environment ? { environment: data.environment } : {}),
        }
      );
      return response.data;
    });
  }

  /**
   * Archive project for client
   */
  async archiveClientProject(data: { client_id: string; project_id: string }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post(
        `/api/v1/auth/client/projects/${encodeURIComponent(data.project_id)}/archive`,
        { client_id: data.client_id }
      );
      return response.data;
    });
  }

  /**
   * Get client API key inventory (non-secret metadata)
   */
  async getClientApiKeys(clientId: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get('/api/v1/auth/client/api-keys', {
        params: { client_id: clientId },
      });
      return response.data;
    });
  }

  /**
   * Rotate client secondary API key
   */
  async rotateClientApiKey(data: { client_id: string }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/api-keys/rotate', data);
      return response.data;
    });
  }

  /**
   * Promote client secondary API key to primary
   */
  async promoteClientApiKey(data: { client_id: string }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/api-keys/promote', data);
      return response.data;
    });
  }

  /**
   * Revoke client API key by type
   */
  async revokeClientApiKey(data: { client_id: string; key_type: 'primary' | 'secondary' }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/api-keys/revoke', data);
      return response.data;
    });
  }

  /**
   * Get client IP whitelist
   */
  async getClientIpWhitelist(clientId: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get('/api/v1/auth/client/ip-whitelist', {
        params: { client_id: clientId },
      });
      return response.data;
    });
  }

  /**
   * Add IP to client whitelist
   */
  async addClientIpWhitelist(data: { client_id: string; ip: string }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/ip-whitelist', data);
      return response.data;
    });
  }

  /**
   * Remove IP from client whitelist
   */
  async removeClientIpWhitelist(clientId: string, ip: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.delete(`/api/v1/auth/client/ip-whitelist/${encodeURIComponent(ip)}`, {
        params: { client_id: clientId },
      });
      return response.data;
    });
  }

  /**
   * Get client origin whitelist
   */
  async getClientOriginWhitelist(clientId: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get('/api/v1/auth/client/origin-whitelist', {
        params: { client_id: clientId },
      });
      return response.data;
    });
  }

  /**
   * Add origin to client whitelist
   */
  async addClientOriginWhitelist(data: { client_id: string; origin: string }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/auth/client/origin-whitelist', data);
      return response.data;
    });
  }

  /**
   * Remove origin from client whitelist
   */
  async removeClientOriginWhitelist(clientId: string, origin: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.delete(`/api/v1/auth/client/origin-whitelist/${encodeURIComponent(origin)}`, {
        params: { client_id: clientId },
      });
      return response.data;
    });
  }

  // ─── Health Check ───

  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  isHealthy(): boolean {
    return this.circuitBreaker.getState() !== 'OPEN';
  }
}
