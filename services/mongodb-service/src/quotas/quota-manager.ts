export enum Resource {
  MESSAGES_COUNT = 'messages_count',
  USERS_COUNT = 'users_count',
  STORAGE_BYTES = 'storage_bytes',
  API_CALLS = 'api_calls'
}

export interface TenantUsage {
  [Resource.MESSAGES_COUNT]: number;
  [Resource.USERS_COUNT]: number;
  [Resource.STORAGE_BYTES]: number;
  [Resource.API_CALLS]: number;
}

export class QuotaManager {
  private static instance: QuotaManager;
  // In-memory usage mock. In production use Redis.
  private usageStats: Map<string, TenantUsage> = new Map();

  static getInstance(): QuotaManager {
    if (!this.instance) {
      this.instance = new QuotaManager();
    }
    return this.instance;
  }

  async checkQuota(tenantId: string, resource: Resource, quantity: number = 1): Promise<boolean> {
    const usage = this.getUsage(tenantId);
    const current = usage[resource] || 0;
    
    // Mock limits
    const limit = 10000; 

    if (current + quantity > limit) {
      console.warn(`Quota exceeded for ${tenantId} on ${resource}`);
      return false;
    }
    return true;
  }

  async incrementUsage(tenantId: string, resource: Resource, quantity: number = 1): Promise<void> {
    const usage = this.getUsage(tenantId);
    usage[resource] = (usage[resource] || 0) + quantity;
    this.usageStats.set(tenantId, usage);
  }

  getUsage(tenantId: string): TenantUsage {
    if (!this.usageStats.has(tenantId)) {
      this.usageStats.set(tenantId, {
        [Resource.MESSAGES_COUNT]: 0,
        [Resource.USERS_COUNT]: 0,
        [Resource.STORAGE_BYTES]: 0,
        [Resource.API_CALLS]: 0
      });
    }
    return this.usageStats.get(tenantId)!;
  }
}
