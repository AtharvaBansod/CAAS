/**
 * Health Check Service
 * 
 * Validates connectivity to all dependencies with caching
 */

import { MongoClient } from 'mongodb';
import { Redis } from 'ioredis';
import { Kafka } from 'kafkajs';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      latency_ms?: number;
      error?: string;
      last_checked: Date;
    };
  };
  timestamp: Date;
}

export interface HealthCheckOptions {
  timeoutMs?: number;
  cacheTtlMs?: number;
}

export class HealthCheckService {
  private mongoClient?: MongoClient;
  private redisClient?: Redis;
  private kafkaClient?: Kafka;
  private timeoutMs: number;
  private cacheTtlMs: number;
  private cachedResult?: HealthCheckResult;
  private lastCheckTime?: number;

  constructor(options: HealthCheckOptions = {}) {
    this.timeoutMs = options.timeoutMs || 5000;
    this.cacheTtlMs = options.cacheTtlMs || 1000; // 1 second cache
  }

  /**
   * Set MongoDB client
   */
  setMongoClient(client: MongoClient): void {
    this.mongoClient = client;
  }

  /**
   * Set Redis client
   */
  setRedisClient(client: Redis): void {
    this.redisClient = client;
  }

  /**
   * Set Kafka client
   */
  setKafkaClient(client: Kafka): void {
    this.kafkaClient = client;
  }

  /**
   * Perform full health check with caching
   */
  async checkHealth(skipCache: boolean = false): Promise<HealthCheckResult> {
    // Return cached result if available and fresh
    if (!skipCache && this.cachedResult && this.lastCheckTime) {
      const age = Date.now() - this.lastCheckTime;
      if (age < this.cacheTtlMs) {
        return this.cachedResult;
      }
    }

    const checks: HealthCheckResult['checks'] = {};

    // Check MongoDB
    const mongoResult = await this.checkMongoDB();
    checks.mongodb = mongoResult;

    // Check Redis
    const redisResult = await this.checkRedis();
    checks.redis = redisResult;

    // Check Kafka
    const kafkaResult = await this.checkKafka();
    checks.kafka = kafkaResult;

    // Determine overall status
    const allUp = Object.values(checks).every((c) => c.status === 'up');
    const anyDown = Object.values(checks).some((c) => c.status === 'down');

    const result: HealthCheckResult = {
      status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
      checks,
      timestamp: new Date(),
    };

    // Cache the result
    this.cachedResult = result;
    this.lastCheckTime = Date.now();

    return result;
  }

  /**
   * Check MongoDB connectivity
   */
  async checkMongoDB(): Promise<HealthCheckResult['checks'][string]> {
    if (!this.mongoClient) {
      return {
        status: 'down',
        error: 'MongoDB client not configured',
        last_checked: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      await Promise.race([
        this.mongoClient.db('admin').command({ ping: 1 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
        ),
      ]);

      const latency = Date.now() - startTime;

      return {
        status: latency < 1000 ? 'up' : 'degraded',
        latency_ms: latency,
        last_checked: new Date(),
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
        last_checked: new Date(),
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  async checkRedis(): Promise<HealthCheckResult['checks'][string]> {
    if (!this.redisClient) {
      return {
        status: 'down',
        error: 'Redis client not configured',
        last_checked: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      await Promise.race([
        this.redisClient.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
        ),
      ]);

      const latency = Date.now() - startTime;

      return {
        status: latency < 500 ? 'up' : 'degraded',
        latency_ms: latency,
        last_checked: new Date(),
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
        last_checked: new Date(),
      };
    }
  }

  /**
   * Check Kafka connectivity
   */
  async checkKafka(): Promise<HealthCheckResult['checks'][string]> {
    if (!this.kafkaClient) {
      return {
        status: 'down',
        error: 'Kafka client not configured',
        last_checked: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      const admin = this.kafkaClient.admin();
      
      await Promise.race([
        admin.connect().then(() => admin.listTopics()).finally(() => admin.disconnect()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
        ),
      ]);

      const latency = Date.now() - startTime;

      return {
        status: latency < 2000 ? 'up' : 'degraded',
        latency_ms: latency,
        last_checked: new Date(),
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
        last_checked: new Date(),
      };
    }
  }

  /**
   * Simple liveness check (no dependency checks)
   */
  async checkLiveness(): Promise<{ status: 'ok'; timestamp: Date }> {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }

  /**
   * Clear cached health check result
   */
  clearCache(): void {
    this.cachedResult = undefined;
    this.lastCheckTime = undefined;
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();
