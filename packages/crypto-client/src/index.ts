/**
 * Crypto Client Library
 * Phase 4.5.2 - Task 03: Service Integration
 * 
 * Centralized client for all CAAS services to use crypto service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface CryptoClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
  caching?: {
    enabled: boolean;
    keyTTL: number;
    sessionTTL: number;
  };
}

export interface EncryptionKey {
  key_id: string;
  tenant_id: string;
  key_type: 'master' | 'data' | 'session';
  created_at: Date;
  expires_at: Date;
  is_active: boolean;
}

export interface EncryptResult {
  ciphertext: string;
  iv: string;
  authTag: string;
}

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class SimpleCircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private failureThreshold: number,
    private resetTimeout: number,
    private monitoringPeriod: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = CircuitBreakerState.CLOSED;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): string {
    return this.state;
  }
}

export class CryptoClient {
  private client: AxiosInstance;
  private config: CryptoClientConfig;
  private circuitBreaker: SimpleCircuitBreaker;
  private keyCache: Map<string, { key_id: string; expires: number }> = new Map();

  constructor(config: CryptoClientConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      circuitBreaker: {
        failureThreshold: 20,
        resetTimeout: 60000,
        monitoringPeriod: 30000,
      },
      caching: {
        enabled: true,
        keyTTL: 3600,
        sessionTTL: 1800,
      },
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup circuit breaker
    this.circuitBreaker = new SimpleCircuitBreaker(
      this.config.circuitBreaker!.failureThreshold,
      this.config.circuitBreaker!.resetTimeout,
      this.config.circuitBreaker!.monitoringPeriod
    );

    // Setup retry logic
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

        if (config.retry < this.config.retries! && this.shouldRetry(error)) {
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

  /**
   * Generate encryption key
   */
  public async generateKey(tenant_id: string, key_type: 'master' | 'data' | 'session'): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/keys/generate', {
        tenant_id,
        key_type,
      });
      return response.data.key_id;
    });
  }

  /**
   * Encrypt data
   */
  public async encrypt(key_id: string, plaintext: string): Promise<EncryptResult> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/encrypt', {
        key_id,
        plaintext,
      });
      return response.data;
    });
  }

  /**
   * Decrypt data
   */
  public async decrypt(key_id: string, ciphertext: string, iv: string, authTag: string): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/decrypt', {
        key_id,
        ciphertext,
        iv,
        authTag,
      });
      return response.data.plaintext;
    });
  }

  /**
   * Rotate encryption key
   */
  public async rotateKey(old_key_id: string, tenant_id: string): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post(`/api/v1/keys/${old_key_id}/rotate`, {
        tenant_id,
      });

      // Clear cache for old key
      this.keyCache.delete(old_key_id);

      return response.data.new_key_id;
    });
  }

  /**
   * Get tenant keys
   */
  public async getTenantKeys(tenant_id: string): Promise<EncryptionKey[]> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get(`/api/v1/keys/${tenant_id}`);
      return response.data.keys;
    });
  }

  /**
   * Get or create tenant master key
   */
  public async getOrCreateMasterKey(tenant_id: string): Promise<string> {
    // Check cache first
    const cacheKey = `master:${tenant_id}`;
    const cached = this.keyCache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.key_id;
    }

    // Get from service
    const keys = await this.getTenantKeys(tenant_id);
    const masterKey = keys.find((k) => k.key_type === 'master' && k.is_active);

    if (masterKey) {
      // Cache for future use
      if (this.config.caching!.enabled) {
        this.keyCache.set(cacheKey, {
          key_id: masterKey.key_id,
          expires: Date.now() + this.config.caching!.keyTTL * 1000,
        });
      }
      return masterKey.key_id;
    }

    // Create new master key
    const key_id = await this.generateKey(tenant_id, 'master');

    // Cache
    if (this.config.caching!.enabled) {
      this.keyCache.set(cacheKey, {
        key_id,
        expires: Date.now() + this.config.caching!.keyTTL * 1000,
      });
    }

    return key_id;
  }

  /**
   * Encrypt with tenant master key
   */
  public async encryptWithMasterKey(tenant_id: string, plaintext: string): Promise<EncryptResult & { key_id: string }> {
    const key_id = await this.getOrCreateMasterKey(tenant_id);
    const result = await this.encrypt(key_id, plaintext);
    return { ...result, key_id };
  }

  /**
   * Decrypt with tenant master key
   */
  public async decryptWithMasterKey(
    tenant_id: string,
    key_id: string,
    ciphertext: string,
    iv: string,
    authTag: string
  ): Promise<string> {
    return await this.decrypt(key_id, ciphertext, iv, authTag);
  }

  /**
   * Get circuit breaker state
   */
  public getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Check if client is healthy
   */
  public isHealthy(): boolean {
    return this.circuitBreaker.getState() !== 'OPEN';
  }

  /**
   * Clear key cache
   */
  public clearCache(): void {
    this.keyCache.clear();
  }
}

// Export singleton instance creator
export function createCryptoClient(config: CryptoClientConfig): CryptoClient {
  return new CryptoClient(config);
}
