import { TenantContext } from '../middleware/tenant/tenant-context';
import { createRedisClient } from '../plugins/redis';
import Redis from 'ioredis';

const MOCK_TENANTS: Record<string, TenantContext> = {
  'tenant-123': {
    tenant_id: 'tenant-123',
    app_id: 'app-tenant-123',
    name: 'Demo Tenant',
    plan: 'business',
    settings: {},
    limits: {
      api_rate_limit: 1000,
      max_users: 100,
      storage_limit_gb: 10
    },
    database_strategy: 'shared',
    is_active: true,
    created_at: new Date('2024-01-01')
  },
  'default-tenant': {
    tenant_id: 'default-tenant',
    app_id: 'app-default',
    name: 'Default Tenant',
    plan: 'free',
    settings: {},
    limits: {
      api_rate_limit: 100,
      max_users: 5,
      storage_limit_gb: 1
    },
    database_strategy: 'shared',
    is_active: true,
    created_at: new Date('2024-01-01')
  }
};

const MOCK_API_KEYS: Record<string, string> = {
  'dev-api-key': 'tenant-123',
  'test-api-key': 'default-tenant'
};

export class TenantService {
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.redis = createRedisClient();
  }
  
  async getTenant(tenantId: string): Promise<TenantContext | null> {
    const cacheKey = `tenant:${tenantId}`;
    
    // 1. Check Redis Cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as TenantContext;
      }
    } catch (err) {
      console.warn('Redis get error in TenantService:', err);
    }
    
    // 2. Fallback to DB (Mock)
    const tenant = MOCK_TENANTS[tenantId];
    
    if (tenant) {
      // Cache the result
      try {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(tenant));
      } catch (err) {
        console.warn('Redis set error in TenantService:', err);
      }
      return tenant;
    }
    
    return null;
  }

  async getTenantByApiKey(apiKey: string): Promise<TenantContext | null> {
    const cacheKey = `apikey:${apiKey}`;

    // 1. Check Redis Cache for API Key mapping
    try {
      const cachedTenantId = await this.redis.get(cacheKey);
      if (cachedTenantId) {
        return this.getTenant(cachedTenantId);
      }
    } catch (err) {
      console.warn('Redis get error in TenantService (ApiKey):', err);
    }

    // 2. Resolve from "DB"
    const tenantId = MOCK_API_KEYS[apiKey];
    
    if (tenantId) {
      // Cache the mapping
      try {
        await this.redis.setex(cacheKey, this.CACHE_TTL, tenantId);
      } catch (err) {
        console.warn('Redis set error in TenantService (ApiKey):', err);
      }
      return this.getTenant(tenantId);
    }

    return null;
  }
}

export const tenantService = new TenantService();
