/**
 * CORS Configuration
 * 
 * Per-tenant CORS configuration with validation
 */

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface TenantCORSConfig extends CORSConfig {
  tenant_id: string;
}

/**
 * Default CORS configuration
 */
export const defaultCORSConfig: CORSConfig = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Tenant-ID',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * CORS configuration manager
 */
export class CORSConfigManager {
  private configs: Map<string, TenantCORSConfig>;

  constructor() {
    this.configs = new Map();
  }

  /**
   * Set CORS configuration for tenant
   */
  setTenantConfig(tenantId: string, config: Partial<CORSConfig>): void {
    const fullConfig: TenantCORSConfig = {
      tenant_id: tenantId,
      ...defaultCORSConfig,
      ...config,
    };

    // Validate origins
    this.validateOrigins(fullConfig.allowedOrigins);

    this.configs.set(tenantId, fullConfig);
  }

  /**
   * Get CORS configuration for tenant
   */
  getTenantConfig(tenantId: string): CORSConfig {
    return this.configs.get(tenantId) || defaultCORSConfig;
  }

  /**
   * Check if origin is allowed for tenant
   */
  isOriginAllowed(tenantId: string, origin: string): boolean {
    const config = this.getTenantConfig(tenantId);
    
    // Check exact match
    if (config.allowedOrigins.includes(origin)) {
      return true;
    }

    // Check wildcard patterns
    for (const allowed of config.allowedOrigins) {
      if (this.matchesPattern(origin, allowed)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Match origin against pattern (supports wildcards)
   */
  private matchesPattern(origin: string, pattern: string): boolean {
    if (pattern === '*') {
      return true;
    }

    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(origin);
  }

  /**
   * Validate origin URLs
   */
  private validateOrigins(origins: string[]): void {
    for (const origin of origins) {
      if (origin === '*') {
        continue; // Wildcard is allowed
      }

      // Check if it's a valid URL or pattern
      if (!origin.startsWith('http://') && !origin.startsWith('https://') && !origin.includes('*')) {
        throw new Error(`Invalid origin: ${origin}. Must start with http:// or https://`);
      }
    }
  }

  /**
   * Load configurations from environment
   */
  loadFromEnvironment(): void {
    const originsEnv = process.env.CORS_ALLOWED_ORIGINS;
    if (originsEnv) {
      const origins = originsEnv.split(',').map(o => o.trim());
      
      // Set as default for all tenants
      defaultCORSConfig.allowedOrigins = origins;
    }
  }
}

/**
 * Global CORS config manager instance
 */
export const corsConfigManager = new CORSConfigManager();
corsConfigManager.loadFromEnvironment();
