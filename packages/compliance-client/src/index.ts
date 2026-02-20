/**
 * Compliance Client Library
 * Phase 4.5.1 - Task 03: Service Integration
 * 
 * Centralized client for all CAAS services to use compliance service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface AuditEvent {
  tenant_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, any>;
}

export interface ComplianceClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
  batching?: {
    enabled: boolean;
    maxBatchSize: number;
    flushInterval: number;
  };
}

export interface ConsentRecord {
  consent_id?: string;
  user_id: string;
  tenant_id: string;
  consent_type: string;
  consent_given: boolean;
  consent_text: string;
  version: string;
  ip_address?: string;
  user_agent?: string;
  expires_at?: Date;
}

export interface GDPRRequest {
  request_id?: string;
  user_id: string;
  tenant_id: string;
  request_type: 'export' | 'erasure' | 'rectification' | 'portability';
  request_data?: Record<string, any>;
  status?: string;
}

export interface RetentionPolicy {
  policy_id?: string;
  tenant_id: string;
  name: string;
  data_type: string;
  retention_days: number;
  conditions?: Record<string, any>;
  is_active: boolean;
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

export class ComplianceClient {
  private client: AxiosInstance;
  private batchBuffer: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private config: ComplianceClientConfig;
  private circuitBreaker: SimpleCircuitBreaker;

  constructor(config: ComplianceClientConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      circuitBreaker: {
        failureThreshold: 30,
        resetTimeout: 60000,
        monitoringPeriod: 30000,
      },
      batching: {
        enabled: true,
        maxBatchSize: 100,
        flushInterval: 5000,
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

    // Start batch flushing if enabled
    if (this.config.batching!.enabled) {
      this.startBatchFlushing();
    }
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
   * Log audit event (batched by default)
   */
  public async logAudit(event: AuditEvent): Promise<void> {
    if (!this.config.batching!.enabled) {
      await this.logAuditImmediate(event);
      return;
    }

    this.batchBuffer.push(event);

    if (this.batchBuffer.length >= this.config.batching!.maxBatchSize) {
      await this.flushBatch();
    }
  }

  /**
   * Log audit event immediately (no batching)
   */
  public async logAuditImmediate(event: AuditEvent): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.post('/api/v1/audit/log', event);
        return response.data.audit_id;
      } catch (error) {
        console.error('Failed to log audit event:', error);
        throw error;
      }
    });
  }

  /**
   * Query audit logs
   */
  public async queryAudit(filters: {
    tenant_id: string;
    user_id?: string;
    action?: string;
    resource_type?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    skip?: number;
  }): Promise<any[]> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get('/api/v1/audit/query', { params: filters });
      return response.data.logs;
    });
  }

  /**
   * Verify audit log integrity
   */
  public async verifyIntegrity(tenant_id: string, start_date?: Date, end_date?: Date): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/audit/verify', {
        tenant_id,
        start_date,
        end_date,
      });
      return response.data;
    });
  }

  /**
   * Record consent
   */
  public async recordConsent(consent: ConsentRecord): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/gdpr/consent', consent);
      return response.data.consent_id;
    });
  }

  /**
   * Get consent
   */
  public async getConsent(user_id: string, tenant_id: string, consent_type?: string): Promise<ConsentRecord[]> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get('/api/v1/gdpr/consent', {
        params: { user_id, tenant_id, consent_type },
      });
      return response.data.consents;
    });
  }

  /**
   * Revoke consent
   */
  public async revokeConsent(consent_id: string): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      await this.client.delete(`/api/v1/gdpr/consent/${consent_id}`);
    });
  }

  /**
   * Submit GDPR request
   */
  public async submitGDPRRequest(request: GDPRRequest): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/gdpr/request', request);
      return response.data.request_id;
    });
  }

  /**
   * Get GDPR request status
   */
  public async getGDPRRequestStatus(request_id: string): Promise<GDPRRequest> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get(`/api/v1/gdpr/request/${request_id}`);
      return response.data;
    });
  }

  /**
   * Create retention policy
   */
  public async createRetentionPolicy(policy: RetentionPolicy): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post('/api/v1/retention/policy', policy);
      return response.data.policy_id;
    });
  }

  /**
   * Get retention policies
   */
  public async getRetentionPolicies(tenant_id: string): Promise<RetentionPolicy[]> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get('/api/v1/retention/policy', {
        params: { tenant_id },
      });
      return response.data.policies;
    });
  }

  /**
   * Execute retention policy
   */
  public async executeRetentionPolicy(policy_id: string): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.post(`/api/v1/retention/policy/${policy_id}/execute`);
      return response.data.execution_id;
    });
  }

  /**
   * Flush batch buffer
   */
  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      await this.circuitBreaker.execute(async () => {
        await this.client.post('/api/v1/audit/batch', { events: batch });
      });
    } catch (error) {
      console.error('Failed to flush audit batch:', error);
      // Re-add to buffer for retry
      this.batchBuffer.unshift(...batch);
    }
  }

  /**
   * Start batch flushing timer
   */
  private startBatchFlushing(): void {
    this.flushTimer = setInterval(() => {
      this.flushBatch().catch(console.error);
    }, this.config.batching!.flushInterval);
  }

  /**
   * Shutdown and flush remaining
   */
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushBatch();
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
}

// Export singleton instance creator
export function createComplianceClient(config: ComplianceClientConfig): ComplianceClient {
  return new ComplianceClient(config);
}
