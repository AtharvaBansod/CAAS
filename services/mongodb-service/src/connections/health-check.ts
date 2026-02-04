import { Connection } from 'mongoose';
import { getConnectionManager } from './connection-manager';

/**
 * Health Check Result
 */
export interface HealthCheckResult {
  healthy: boolean;
  status: string;
  latency: number;
  details: {
    connected: boolean;
    readyState: number;
    host?: string;
    name?: string;
    error?: string;
  };
}

/**
 * Database Health Checker
 */
export class HealthCheck {
  private connection: Connection | null = null;

  constructor() {
    const manager = getConnectionManager();
    if (manager.isConnected()) {
      this.connection = manager.getConnection();
    }
  }

  /**
   * Perform health check
   */
  public async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Get connection
      const manager = getConnectionManager();
      
      if (!manager.isConnected()) {
        return {
          healthy: false,
          status: 'disconnected',
          latency: Date.now() - startTime,
          details: {
            connected: false,
            readyState: 0,
            error: 'Database not connected',
          },
        };
      }

      this.connection = manager.getConnection();

      // Ping database
      await this.connection.db.admin().ping();

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        status: 'connected',
        latency,
        details: {
          connected: true,
          readyState: this.connection.readyState,
          host: this.connection.host,
          name: this.connection.name,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        healthy: false,
        status: 'error',
        latency,
        details: {
          connected: false,
          readyState: this.connection?.readyState || 0,
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * Check replica set status (if applicable)
   */
  public async checkReplicaSet(): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const admin = this.connection.db.admin();
      const status = await admin.command({ replSetGetStatus: 1 });
      return status;
    } catch (error) {
      // Not a replica set or insufficient permissions
      return null;
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const stats = await this.connection.db.stats();
      return stats;
    } catch (error) {
      throw new Error(`Failed to get database stats: ${(error as Error).message}`);
    }
  }
}

/**
 * Create health check instance
 */
export function createHealthCheck(): HealthCheck {
  return new HealthCheck();
}
