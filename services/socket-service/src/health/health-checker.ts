import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('HealthChecker');

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency_ms?: number;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    redis: HealthStatus;
    memory: HealthStatus;
    uptime: HealthStatus;
  };
  metrics: {
    connections: number;
    uptime_seconds: number;
    memory_usage_mb: number;
  };
}

export class SocketHealthChecker {
  private startTime: Date;

  constructor(private redis: RedisClientType) {
    this.startTime = new Date();
  }

  async checkRedisConnection(): Promise<HealthStatus> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      if (latency > 1000) {
        return {
          status: 'degraded',
          message: 'Redis latency high',
          latency_ms: latency,
        };
      }

      return {
        status: 'healthy',
        latency_ms: latency,
      };
    } catch (error: any) {
      logger.error('Redis health check failed', error);
      return {
        status: 'unhealthy',
        message: error.message,
      };
    }
  }

  checkMemoryUsage(): HealthStatus {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (usagePercent > 95) {
      return {
        status: 'unhealthy',
        message: `Memory usage critical: ${usagePercent.toFixed(1)}%`,
      };
    }

    if (usagePercent > 85) {
      return {
        status: 'degraded',
        message: `Memory usage high: ${usagePercent.toFixed(1)}%`,
      };
    }

    return {
      status: 'healthy',
    };
  }

  checkUptime(): HealthStatus {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    // Consider unhealthy if just started (< 10 seconds)
    if (uptimeSeconds < 10) {
      return {
        status: 'degraded',
        message: 'Service just started',
      };
    }

    return {
      status: 'healthy',
    };
  }

  async getOverallHealth(connectionCount: number): Promise<HealthReport> {
    const [redis, memory, uptime] = await Promise.all([
      this.checkRedisConnection(),
      Promise.resolve(this.checkMemoryUsage()),
      Promise.resolve(this.checkUptime()),
    ]);

    const checks = { redis, memory, uptime };
    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

    const uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const memoryUsage = process.memoryUsage();

    return {
      status: anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      checks,
      metrics: {
        connections: connectionCount,
        uptime_seconds: uptimeSeconds,
        memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
    };
  }
}
