import crypto from 'crypto';

interface TurnServerConfig {
  host: string;
  port: number;
  secret: string;
  transport?: 'udp' | 'tcp' | 'tls';
  ttl?: number; // Credential TTL in seconds
}

interface TurnCredentials {
  username: string;
  credential: string;
  urls: string[];
}

interface TurnServer {
  config: TurnServerConfig;
  healthy: boolean;
  lastCheck: Date;
}

export class TurnServerProvider {
  private servers: Map<string, TurnServer> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(servers: TurnServerConfig[]) {
    servers.forEach((config, index) => {
      this.servers.set(`turn-${index}`, {
        config: {
          ...config,
          transport: config.transport || 'udp',
          ttl: config.ttl || 86400, // 24 hours default
        },
        healthy: true,
        lastCheck: new Date(),
      });
    });

    // Start health checks
    this.startHealthChecks();
  }

  /**
   * Generate time-limited TURN credentials
   */
  generateCredentials(userId: string, tenantId: string): TurnCredentials {
    const healthyServers = this.getHealthyServers();
    
    if (healthyServers.length === 0) {
      throw new Error('No healthy TURN servers available');
    }

    // Use first healthy server (can implement load balancing here)
    const server = healthyServers[0];
    const config = server.config;

    // Generate time-limited username
    const timestamp = Math.floor(Date.now() / 1000) + config.ttl!;
    const username = `${timestamp}:${tenantId}:${userId}`;

    // Generate HMAC-SHA1 credential
    const hmac = crypto.createHmac('sha1', config.secret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    // Build TURN URLs
    const urls = this.buildTurnUrls(config);

    return {
      username,
      credential,
      urls,
    };
  }

  /**
   * Get TURN credentials for multiple servers (for redundancy)
   */
  generateMultiServerCredentials(userId: string, tenantId: string): TurnCredentials[] {
    const healthyServers = this.getHealthyServers();
    
    if (healthyServers.length === 0) {
      throw new Error('No healthy TURN servers available');
    }

    return healthyServers.map((server) => {
      const config = server.config;
      const timestamp = Math.floor(Date.now() / 1000) + config.ttl!;
      const username = `${timestamp}:${tenantId}:${userId}`;

      const hmac = crypto.createHmac('sha1', config.secret);
      hmac.update(username);
      const credential = hmac.digest('base64');

      return {
        username,
        credential,
        urls: this.buildTurnUrls(config),
      };
    });
  }

  /**
   * Build TURN URLs for a server
   */
  private buildTurnUrls(config: TurnServerConfig): string[] {
    const urls: string[] = [];
    const { host, port, transport } = config;

    if (transport === 'udp' || transport === 'tcp') {
      urls.push(`turn:${host}:${port}?transport=${transport}`);
    } else if (transport === 'tls') {
      urls.push(`turns:${host}:${port}?transport=tcp`);
    }

    return urls;
  }

  /**
   * Get healthy servers
   */
  private getHealthyServers(): TurnServer[] {
    return Array.from(this.servers.values()).filter((server) => server.healthy);
  }

  /**
   * Mark server as unhealthy
   */
  markUnhealthy(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.healthy = false;
      server.lastCheck = new Date();
      console.warn(`[TurnServerProvider] Server ${serverId} marked as unhealthy`);
    }
  }

  /**
   * Mark server as healthy
   */
  markHealthy(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.healthy = true;
      server.lastCheck = new Date();
      console.log(`[TurnServerProvider] Server ${serverId} marked as healthy`);
    }
  }

  /**
   * Perform health check on a server
   */
  private async checkServerHealth(serverId: string, server: TurnServer): Promise<boolean> {
    try {
      // Simple connectivity check
      // In production, you might want to use a more sophisticated check
      // For now, we'll assume servers are healthy unless explicitly marked otherwise
      return true;
    } catch (error) {
      console.error(`[TurnServerProvider] Health check failed for ${serverId}:`, error);
      return false;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [serverId, server] of this.servers.entries()) {
        const healthy = await this.checkServerHealth(serverId, server);
        server.healthy = healthy;
        server.lastCheck = new Date();
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get server status
   */
  getServerStatus(): Array<{ id: string; healthy: boolean; lastCheck: Date; config: TurnServerConfig }> {
    return Array.from(this.servers.entries()).map(([id, server]) => ({
      id,
      healthy: server.healthy,
      lastCheck: server.lastCheck,
      config: {
        host: server.config.host,
        port: server.config.port,
        transport: server.config.transport,
        ttl: server.config.ttl,
        secret: '***', // Don't expose secret
      },
    }));
  }

  /**
   * Add a new TURN server
   */
  addServer(config: TurnServerConfig): string {
    const serverId = `turn-${this.servers.size}`;
    this.servers.set(serverId, {
      config: {
        ...config,
        transport: config.transport || 'udp',
        ttl: config.ttl || 86400,
      },
      healthy: true,
      lastCheck: new Date(),
    });
    return serverId;
  }

  /**
   * Remove a TURN server
   */
  removeServer(serverId: string): boolean {
    return this.servers.delete(serverId);
  }

  /**
   * Get usage metrics
   */
  getMetrics(): {
    totalServers: number;
    healthyServers: number;
    unhealthyServers: number;
  } {
    const healthy = this.getHealthyServers().length;
    const total = this.servers.size;

    return {
      totalServers: total,
      healthyServers: healthy,
      unhealthyServers: total - healthy,
    };
  }
}
